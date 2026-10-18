import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BedStatusType } from '@prisma/client';
import { BedStatusRepository } from '../repositories/bed-status.repository';
import { BedsRepository } from '../repositories/beds.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { UpdateBedStatusDto } from '../dto/bed/update-bed-status.dto';

/**
 * Bed status state machine:
 *
 *   AVAILABLE         → RESERVED, OCCUPIED, MAINTENANCE, OUT_OF_SERVICE
 *   RESERVED          → OCCUPIED, AVAILABLE (cancel reservation)
 *   OCCUPIED          → DISCHARGE_PENDING
 *   DISCHARGE_PENDING → HOUSEKEEPING, OCCUPIED (re-admission)
 *   HOUSEKEEPING      → AVAILABLE
 *   MAINTENANCE       → AVAILABLE
 *   OUT_OF_SERVICE    → AVAILABLE, MAINTENANCE
 */
const ALLOWED_TRANSITIONS: Record<BedStatusType, BedStatusType[]> = {
  AVAILABLE: ['RESERVED', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  RESERVED: ['OCCUPIED', 'AVAILABLE'],
  OCCUPIED: ['DISCHARGE_PENDING'],
  DISCHARGE_PENDING: ['HOUSEKEEPING', 'OCCUPIED'],
  HOUSEKEEPING: ['AVAILABLE'],
  MAINTENANCE: ['AVAILABLE'],
  OUT_OF_SERVICE: ['AVAILABLE', 'MAINTENANCE'],
};

// Statuses that reference a patient in the bed
const PATIENT_STATUSES: BedStatusType[] = ['RESERVED', 'OCCUPIED'];

@Injectable()
export class BedStatusService {
  constructor(
    private readonly bedStatusRepo: BedStatusRepository,
    private readonly bedsRepo: BedsRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Changes a bed's status with full state-machine validation.
   * The transition (close old row + open new row) is one transaction.
   * Exported for future IPD Admission module consumption.
   */
  async changeStatus(
    tenantId: string,
    bedId: string,
    dto: UpdateBedStatusDto,
    changedBy?: string,
  ) {
    const bed = await this.bedsRepo.findById(tenantId, bedId);
    if (!bed) throw new NotFoundException('Bed not found');

    const current = await this.bedStatusRepo.getCurrentStatus(tenantId, bedId);
    const currentStatus = current?.status ?? BedStatusType.AVAILABLE;

    // ─── State machine validation ──────────────────────────────────────────
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot move bed ${bed.bedIdentifier} from ${currentStatus} to ${dto.status}`,
        details: {
          bedId,
          currentStatus,
          attemptedStatus: dto.status,
          allowedTransitions: allowed,
        },
      });
    }

    // ─── Patient requirement for RESERVED / OCCUPIED ───────────────────────
    if (PATIENT_STATUSES.includes(dto.status)) {
      const patientId = dto.patientId ?? current?.patientId;
      if (!patientId) {
        throw new BadRequestException(
          `patientId is required when a bed becomes ${dto.status}`,
        );
      }

      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found in this hospital');
      }
      dto.patientId = patientId;
    }

    // ─── Atomic transition ─────────────────────────────────────────────────
    const next = await this.bedStatusRepo.transition(tenantId, bedId, {
      status: dto.status,
      // Patient linkage persists only for patient-bound statuses
      patientId: PATIENT_STATUSES.includes(dto.status) ? dto.patientId : null,
      ipdAdmissionId: PATIENT_STATUSES.includes(dto.status)
        ? (dto.ipdAdmissionId ?? current?.ipdAdmissionId ?? null)
        : null,
      reservedBy: dto.status === 'RESERVED' ? (changedBy ?? null) : null,
      reason: dto.reason ?? null,
      changedBy: changedBy ?? null,
    });

    return {
      bedId,
      bedIdentifier: bed.bedIdentifier,
      previousStatus: currentStatus,
      currentStatus: next.status,
      patientId: next.patientId,
      reason: next.reason,
      effectiveFrom: next.effectiveFrom,
    };
  }

  async getStatusHistory(tenantId: string, bedId: string) {
    const bed = await this.bedsRepo.findById(tenantId, bedId);
    if (!bed) throw new NotFoundException('Bed not found');
    return this.bedStatusRepo.getHistory(tenantId, bedId);
  }

  getCurrentStatus(tenantId: string, bedId: string) {
    return this.bedStatusRepo.getCurrentStatus(tenantId, bedId);
  }
}
