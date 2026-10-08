import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReferralCommissionsRepository } from '../repositories/referral-commissions.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { FilterCommissionsDto } from '../dto/commission/filter-commissions.dto';
import { SettleCommissionDto } from '../dto/commission/settle-commission.dto';
import { BulkSettleCommissionsDto } from '../dto/commission/bulk-settle-commissions.dto';

@Injectable()
export class ReferralCommissionsService {
  private readonly logger = new Logger(ReferralCommissionsService.name);

  constructor(
    private readonly repo: ReferralCommissionsRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Billing hook: generate commission when a referred bill is created ────
  //
  // Called by BillingService after an OpdBill is created. Snapshots the
  // commission rate + PRO owner at billing time (later master edits never
  // rewrite history). Idempotent per bill. Never throws — a commission
  // failure must not break billing.

  async createForBill(input: {
    tenantId: string;
    billId: string;
    appointmentId?: string | null;
    patientId: string;
    billAmount: number;
  }): Promise<void> {
    try {
      if (!input.appointmentId) return;

      const appointment = await this.prisma.appointment.findFirst({
        where: { id: input.appointmentId, tenantId: input.tenantId },
        select: { referDoctorId: true },
      });

      if (!appointment?.referDoctorId) return;

      const referDoctor = await this.prisma.referDoctor.findFirst({
        where: { id: appointment.referDoctorId, tenantId: input.tenantId },
        select: { id: true, commissionPercent: true, proUserId: true },
      });
      if (!referDoctor) return;

      // Idempotent — one commission per bill
      const existing = await this.repo.findByBillId(
        input.tenantId,
        input.billId,
      );
      if (existing) return;

      const rate = Number(referDoctor.commissionPercent);
      if (rate <= 0) {
        this.logger.debug(
          `Refer doctor ${referDoctor.id} has 0% commission — skipping bill ${input.billId}`,
        );
        return;
      }

      const commissionAmount =
        Math.round(((input.billAmount * rate) / 100) * 100) / 100;

      await this.repo.create({
        tenantId: input.tenantId,
        referDoctorId: referDoctor.id,
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        billId: input.billId,
        billAmount: input.billAmount,
        commissionRate: rate,
        commissionAmount,
        proUserId: referDoctor.proUserId ?? null,
        status: 'PENDING',
      });

      this.logger.log(
        `Referral commission ₹${commissionAmount} (${rate}%) created for bill ${input.billId}`,
      );
    } catch (err) {
      this.logger.error(
        `Referral commission creation failed for bill ${input.billId}`,
        err,
      );
    }
  }

  // ─── List with filters ─────────────────────────────────────────────────────

  async findAll(tenantId: string, filters: FilterCommissionsDto) {
    const { data, total, page, limit } = await this.repo.findAll(
      tenantId,
      filters,
    );
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Aggregated summary (per doctor + per PRO) ─────────────────────────────

  async getSummary(tenantId: string, filters: FilterCommissionsDto) {
    const { commissions, referDoctors } = await this.repo.getSummary(
      tenantId,
      filters,
    );

    const proNameById = new Map(
      referDoctors.map((u) => [
        u.id,
        `${u.firstName} ${u.lastName ?? ''}`.trim(),
      ]),
    );

    const byDoctor = new Map<
      string,
      {
        referDoctorId: string;
        doctorName: string;
        totalBills: number;
        totalBillAmount: number;
        totalCommission: number;
        pendingCommission: number;
        paidCommission: number;
      }
    >();

    const byPro = new Map<
      string,
      {
        proUserId: string;
        proName: string;
        doctorIds: Set<string>;
        totalCommission: number;
      }
    >();

    for (const c of commissions) {
      const amount = Number(c.commissionAmount);
      const billAmount = Number(c.billAmount);

      // Per doctor
      const doctorEntry = byDoctor.get(c.referDoctorId) ?? {
        referDoctorId: c.referDoctorId,
        doctorName: c.referDoctor.name,
        totalBills: 0,
        totalBillAmount: 0,
        totalCommission: 0,
        pendingCommission: 0,
        paidCommission: 0,
      };
      doctorEntry.totalBills += 1;
      doctorEntry.totalBillAmount += billAmount;
      doctorEntry.totalCommission += amount;
      if (c.status === 'PAID') doctorEntry.paidCommission += amount;
      if (c.status === 'PENDING' || c.status === 'APPROVED')
        doctorEntry.pendingCommission += amount;
      byDoctor.set(c.referDoctorId, doctorEntry);

      // Per PRO
      if (c.proUserId) {
        const proEntry = byPro.get(c.proUserId) ?? {
          proUserId: c.proUserId,
          proName: proNameById.get(c.proUserId) ?? 'Unknown',
          doctorIds: new Set<string>(),
          totalCommission: 0,
        };
        proEntry.doctorIds.add(c.referDoctorId);
        proEntry.totalCommission += amount;
        byPro.set(c.proUserId, proEntry);
      }
    }

    return {
      byDoctor: Array.from(byDoctor.values()).map((d) => ({
        ...d,
        totalBillAmount: round2(d.totalBillAmount),
        totalCommission: round2(d.totalCommission),
        pendingCommission: round2(d.pendingCommission),
        paidCommission: round2(d.paidCommission),
      })),
      byPro: Array.from(byPro.values()).map((p) => ({
        proUserId: p.proUserId,
        proName: p.proName,
        totalDoctorsManaged: p.doctorIds.size,
        totalCommission: round2(p.totalCommission),
      })),
    };
  }

  // ─── Settlement ────────────────────────────────────────────────────────────

  async settle(
    tenantId: string,
    id: string,
    dto: SettleCommissionDto,
    settledBy: string,
  ) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Commission record not found');

    if (existing.status === 'PAID') {
      throw new BadRequestException(
        'Commission is already PAID and cannot be changed',
      );
    }

    return this.repo.settle(tenantId, id, dto.status, settledBy, dto.notes);
  }

  async bulkSettle(
    tenantId: string,
    dto: BulkSettleCommissionsDto,
    settledBy: string,
  ) {
    const result = await this.repo.bulkSettle(
      tenantId,
      dto.commissionIds,
      dto.status,
      settledBy,
      dto.notes,
    );
    return {
      message: `${result.count} commission(s) marked as ${dto.status}`,
      updated: result.count,
    };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
