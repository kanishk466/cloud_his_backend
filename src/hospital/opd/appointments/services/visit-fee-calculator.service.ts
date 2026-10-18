import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface VisitFeeResult {
  fee: number;
  isFollowUp: boolean;
  configUsed: 'PANEL_CONFIG' | 'GENERAL_CONFIG' | 'DOCTOR_PROFILE';
  breakdown: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Statuses that mean "this visit happened / consumed quota"
const CONSUMED_STATUSES = [
  'BOOKED',
  'CHECKED_IN',
  'IN_QUEUE',
  'IN_CONSULTATION',
  'COMPLETED',
] as const;

/**
 * Phase 2.2B — Visit Fee Auto-Calculation.
 *
 * Resolves the consultation fee at appointment-creation time:
 *   panel config → general config → DoctorProfile.consultationFee,
 * with follow-up detection anchored at the last PAID (non-follow-up) visit:
 *   within followUpDays window AND consumed follow-ups < followUpMaxVisits
 *   → followUpFee (usually ₹0).
 */
@Injectable()
export class VisitFeeCalculatorService {
  private readonly logger = new Logger(VisitFeeCalculatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateFee(
    tenantId: string,
    doctorProfileId: string,
    patientId: string,
    panelId?: string,
    appointmentType?: string,
    targetDate: Date = new Date(),
  ): Promise<VisitFeeResult> {
    // ─── 1. Resolve the applicable config ─────────────────────────────────
    const doctor = await this.prisma.doctorProfile.findFirst({
      where: { id: doctorProfileId, tenantId },
      select: { id: true, consultationFee: true },
    });

    const configs = await this.prisma.doctorOpdVisitConfig.findMany({
      where: { tenantId, doctorProfileId, isActive: true, deletedAt: null },
    });

    // Panel of the patient, unless explicitly overridden
    let effectivePanelId = panelId;
    if (!effectivePanelId) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, tenantId },
        select: { panelId: true },
      });
      effectivePanelId = patient?.panelId ?? undefined;
    }

    const config =
      (effectivePanelId
        ? configs.find((c) => c.panelId === effectivePanelId)
        : undefined) ??
      configs.find((c) => c.panelId === null) ??
      null;

    // ─── 2. No config → flat profile fee ───────────────────────────────────
    if (!config) {
      const fee = Number(doctor?.consultationFee ?? 0);
      return {
        fee,
        isFollowUp: false,
        configUsed: 'DOCTOR_PROFILE',
        breakdown: `No visit config — doctor profile fee ₹${fee}`,
      };
    }

    const configUsed = config.panelId ? 'PANEL_CONFIG' : 'GENERAL_CONFIG';

    // ─── 3. Follow-up detection ────────────────────────────────────────────
    // Anchor = most recent NON-follow-up visit (the paid/first visit of the chain)
    const anchorVisit = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        patientId,
        doctorProfileId,
        isFollowUpVisit: false,
        status: { in: [...CONSUMED_STATUSES] },
        appointmentDate: { lt: targetDate },
        deletedAt: null,
      },
      orderBy: { appointmentDate: 'desc' },
      select: { appointmentDate: true },
    });

    let isFollowUp = false;

    if (anchorVisit && config.followUpMaxVisits > 0) {
      const daysSinceAnchor = Math.floor(
        (targetDate.getTime() - anchorVisit.appointmentDate.getTime()) / DAY_MS,
      );

      if (daysSinceAnchor <= config.followUpDays) {
        const followUpsConsumed = await this.prisma.appointment.count({
          where: {
            tenantId,
            patientId,
            doctorProfileId,
            isFollowUpVisit: true,
            status: { in: [...CONSUMED_STATUSES] },
            appointmentDate: { gte: anchorVisit.appointmentDate },
            deletedAt: null,
          },
        });

        isFollowUp = followUpsConsumed < config.followUpMaxVisits;
      }
    }

    // ─── 4. Fee decision ───────────────────────────────────────────────────
    let fee: number;
    let breakdown: string;

    if (appointmentType === 'EMERGENCY' && config.emergencyFee != null) {
      fee = Number(config.emergencyFee);
      breakdown = `Emergency fee ₹${fee} (${configUsed})`;
    } else if (isFollowUp) {
      fee = Number(config.followUpFee);
      breakdown = `Follow-up within ${config.followUpDays}d window — fee ₹${fee} (${configUsed})`;
    } else {
      fee = Number(config.firstVisitFee);
      breakdown = `${anchorVisit ? 'Follow-up window exhausted/expired' : 'First visit'} — fee ₹${fee} (${configUsed})`;
    }

    this.logger.debug(
      `Fee calc doctor=${doctorProfileId} patient=${patientId}: ${breakdown}`,
    );

    return { fee, isFollowUp, configUsed, breakdown };
  }
}
