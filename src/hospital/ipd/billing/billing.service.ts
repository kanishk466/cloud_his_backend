import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BillingRepository } from './billing.repository';
import { ClinicalContextService } from '../clinical/clinical-context.service';
import { ThresholdCheckService } from '../../masters/threshold/threshold-check.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { DailyAccrualDto } from './dto/daily-accrual.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "DAILY_ACCRUAL:2026-10-13:ROOM" — the idempotency key of the nightly run. */
const ACCRUAL_PREFIX = 'DAILY_ACCRUAL';

const round2 = (value: number) => Math.round(value * 100) / 100;

/** UTC midnight — charge dates are calendar days, never instants. */
const utcDay = (value: Date) =>
  new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );

const isoDay = (value: Date) => utcDay(value).toISOString().slice(0, 10);

/** Day 1 = admission day; stops at discharge for closed stays. */
const stayDayCount = (admissionDate: Date, dischargeDate: Date | null) => {
  const start = utcDay(admissionDate).getTime();
  const end = utcDay(dischargeDate ?? new Date()).getTime();
  return Math.max(1, Math.floor((end - start) / DAY_MS) + 1);
};

/**
 * Phase 3.3 — IPD running bill.
 *
 *   POST /api/ipd/billing/charges              post one line (threshold-checked)
 *   GET  /api/ipd/billing/charges              the ledger (?admissionId=)
 *   POST /api/ipd/billing/daily-accrual        room + nursing for a day (idempotent)
 *   GET  /api/ipd/billing/provisional/:id      charges + payments + totals + threshold
 *   POST /api/ipd/admissions/:id/payments      receipt (updates advancePaid)
 *   GET  /api/ipd/admissions/:id/payments      receipts
 *
 * Threshold rules (Phase 1.4 engine, consumed here as designed):
 *   BLOCKED  -> the charge is refused (400 THRESHOLD_BLOCKED) and never written;
 *   WARNING  -> the charge is written and the admission is flagged breached;
 *   ALERT/OK -> the charge is written, nothing flagged.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly repo: BillingRepository,
    private readonly context: ClinicalContextService,
    private readonly thresholdCheck: ThresholdCheckService,
  ) {}

  // ─── 1. CHARGE ENTRY ────────────────────────────────────────────────────────

  async addCharge(tenantId: string, userId: string, dto: CreateChargeDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      dto.admissionId,
    );
    this.context.assertOpen(admission, 'post a charge');

    const quantity = dto.quantity ?? 1;
    const amount = round2(quantity * dto.unitPrice);

    // Projected total drives the panel threshold before anything is written.
    const currentTotal = await this.repo.sumCharges(tenantId, admission.id);
    const projectedTotal = round2(currentTotal + amount);

    const threshold = await this.thresholdCheck.checkThreshold(
      tenantId,
      admission.panelId,
      admission.roomTypeId,
      projectedTotal,
    );

    if (threshold.status === 'BLOCKED') {
      throw new BadRequestException({
        code: 'THRESHOLD_BLOCKED',
        message:
          threshold.message ??
          'Panel threshold exceeded — the charge was not posted.',
        details: {
          usagePercent: threshold.usagePercent,
          maxAmount: threshold.maxAmount,
          currentBillTotal: threshold.currentBillTotal,
          actionOnBreach: threshold.actionOnBreach,
        },
      });
    }

    const charge = await this.repo.createCharge(tenantId, admission.id, userId, {
      chargeDate: utcDay(dto.chargeDate ?? new Date()),
      category: dto.category ?? 'OTHER',
      description: dto.description,
      quantity,
      unitPrice: dto.unitPrice,
      amount,
      source: 'MANUAL',
      accrualKey: null,
      notes: dto.notes,
    });

    await this.repo.setProvisional(
      tenantId,
      admission.id,
      projectedTotal,
      threshold.status === 'WARNING',
    );

    this.logger.log(
      `Charge posted on ${admission.admissionNo}: ${dto.description} ₹${amount} (threshold ${threshold.status})`,
    );

    return { charge, threshold, totals: { chargesTotal: projectedTotal } };
  }

  async listCharges(tenantId: string, admissionId: string, limit?: number) {
    const admission = await this.context.requireAdmission(tenantId, admissionId);
    return this.repo.listCharges(tenantId, admission.id, limit ?? 200);
  }

  // ─── 2. DAILY ACCRUAL (room rent + nursing charge) ─────────────────────────

  /**
   * Posts one ROOM line and one NURSING line per open admission for the given
   * day, priced from the stay's current room type. Safe to re-run: an existing
   * `DAILY_ACCRUAL:{day}:{component}` row is skipped, never duplicated, and a
   * HARD-threshold panel is skipped with a reason instead of posting.
   */
  async runDailyAccrual(
    tenantId: string,
    userId: string,
    dto: DailyAccrualDto,
  ) {
    const day = utcDay(dto.date ?? new Date());
    const iso = isoDay(day);

    const admissions = await this.repo.listChargeableAdmissions(
      tenantId,
      dto.admissionId,
    );

    if (dto.admissionId && admissions.length === 0) {
      throw new NotFoundException({
        code: 'NO_OPEN_ADMISSION',
        message: 'No open admission with this id in this hospital',
      });
    }

    const details: {
      admissionId: string;
      admissionNo: string;
      posted: number;
      amount: number;
      status: 'POSTED' | 'SKIPPED' | 'BLOCKED';
      reason?: string;
      thresholdStatus?: string;
    }[] = [];

    let posted = 0;
    let skipped = 0;
    let blocked = 0;

    for (const admission of admissions) {
      // never accrue days before the stay began
      if (utcDay(admission.admissionDate).getTime() > day.getTime()) {
        skipped += 1;
        details.push({
          admissionId: admission.id,
          admissionNo: admission.admissionNo,
          posted: 0,
          amount: 0,
          status: 'SKIPPED',
          reason: 'Stay had not started on this date',
        });
        continue;
      }

      const roomType = admission.bed?.room?.roomType;
      const roomRate = Number(roomType?.defaultRate ?? 0);
      const nursingRate = Number(roomType?.nursingCharge ?? 0);

      if (!admission.bed || !roomType || (roomRate <= 0 && nursingRate <= 0)) {
        skipped += 1;
        details.push({
          admissionId: admission.id,
          admissionNo: admission.admissionNo,
          posted: 0,
          amount: 0,
          status: 'SKIPPED',
          reason: admission.bed
            ? 'Room type has no day rate configured'
            : 'No bed assigned yet',
        });
        continue;
      }

      const lines: {
        category: 'ROOM' | 'NURSING';
        description: string;
        unitPrice: number;
      }[] = [];

      if (roomRate > 0) {
        const key = `${ACCRUAL_PREFIX}:${iso}:ROOM`;
        const exists = await this.repo.findChargeByAccrualKey(
          tenantId,
          admission.id,
          key,
        );
        if (!exists)
          lines.push({
            category: 'ROOM',
            description: `Room rent — ${roomType.name} (${admission.bed?.bedIdentifier ?? 'bed'})`,
            unitPrice: roomRate,
          });
      }

      if (nursingRate > 0) {
        const key = `${ACCRUAL_PREFIX}:${iso}:NURSING`;
        const exists = await this.repo.findChargeByAccrualKey(
          tenantId,
          admission.id,
          key,
        );
        if (!exists)
          lines.push({
            category: 'NURSING',
            description: `Nursing charge — ${roomType.name}`,
            unitPrice: nursingRate,
          });
      }

      if (lines.length === 0) {
        skipped += 1;
        details.push({
          admissionId: admission.id,
          admissionNo: admission.admissionNo,
          posted: 0,
          amount: 0,
          status: 'SKIPPED',
          reason: 'Already accrued for this date',
        });
        continue;
      }

      const accrualAmount = round2(
        lines.reduce((sum, line) => sum + line.unitPrice, 0),
      );
      const currentTotal = await this.repo.sumCharges(tenantId, admission.id);
      const projectedTotal = round2(currentTotal + accrualAmount);

      const threshold = await this.thresholdCheck.checkThreshold(
        tenantId,
        admission.panelId,
        admission.bed?.room?.roomType?.id ?? null,
        projectedTotal,
      );

      if (threshold.status === 'BLOCKED') {
        blocked += 1;
        details.push({
          admissionId: admission.id,
          admissionNo: admission.admissionNo,
          posted: 0,
          amount: accrualAmount,
          status: 'BLOCKED',
          reason:
            threshold.message ??
            'Panel threshold exceeded — accrual withheld (HARD breach)',
          thresholdStatus: threshold.status,
        });
        continue;
      }

      for (const line of lines) {
        await this.repo.createCharge(tenantId, admission.id, userId, {
          chargeDate: day,
          category: line.category,
          description: line.description,
          quantity: 1,
          unitPrice: line.unitPrice,
          amount: round2(line.unitPrice),
          source: 'DAILY_ACCRUAL',
          accrualKey: `${ACCRUAL_PREFIX}:${iso}:${line.category}`,
        });
      }

      await this.repo.setProvisional(
        tenantId,
        admission.id,
        projectedTotal,
        threshold.status === 'WARNING',
      );

      posted += lines.length;
      details.push({
        admissionId: admission.id,
        admissionNo: admission.admissionNo,
        posted: lines.length,
        amount: accrualAmount,
        status: 'POSTED',
        thresholdStatus: threshold.status,
      });
    }

    this.logger.log(
      `Daily accrual ${iso}: ${posted} line(s) posted, ${skipped} admission(s) skipped, ${blocked} blocked`,
    );

    return { date: iso, posted, skipped, blocked, admissions: details };
  }

  // ─── 3. PROVISIONAL BILL ───────────────────────────────────────────────────

  async provisional(tenantId: string, admissionId: string) {
    const admission = await this.repo.findAdmission(tenantId, admissionId);
    if (!admission)
      throw new NotFoundException({
        code: 'ADMISSION_NOT_FOUND',
        message: 'Admission not found in this hospital',
      });

    const [charges, payments, chargesTotal, paymentsTotal] = await Promise.all([
      this.repo.listCharges(tenantId, admission.id),
      this.repo.listPayments(tenantId, admission.id),
      this.repo.sumCharges(tenantId, admission.id),
      this.repo.sumPayments(tenantId, admission.id),
    ]);

    const roomRate = Number(admission.bed?.room?.roomType?.defaultRate ?? 0);
    const nursingRate = Number(
      admission.bed?.room?.roomType?.nursingCharge ?? 0,
    );
    const dayCount = stayDayCount(
      admission.admissionDate,
      admission.dischargeDate,
    );

    const threshold = await this.thresholdCheck.checkThreshold(
      tenantId,
      admission.panelId,
      admission.bed?.room?.roomType?.id ?? null,
      chargesTotal,
    );

    return {
      admission,
      charges,
      payments,
      totals: {
        chargesTotal: round2(chargesTotal),
        paymentsTotal: round2(paymentsTotal),
        /** Positive = the patient still owes; negative = credit with the hospital. */
        balance: round2(chargesTotal - paymentsTotal),
        advancePaid: Number(admission.advancePaid),
        provisionalTotal: Number(admission.provisionalTotal),
        dayCount,
        roomRatePerDay: roomRate,
        nursingChargePerDay: nursingRate,
        /** "What the stay costs at today's rate" — a guide, not the bill. */
        expectedAtCurrentRate: round2(dayCount * (roomRate + nursingRate)),
      },
      threshold,
    };
  }

  // ─── 4. PAYMENTS ───────────────────────────────────────────────────────────

  /**
   * Receipts are accepted while the stay exists — including after discharge
   * (settlement) — but never on a cancelled admission. Each payment also moves
   * the admission's `advancePaid` (the deposit shown on the chart header).
   */
  async recordPayment(
    tenantId: string,
    userId: string,
    admissionId: string,
    dto: CreatePaymentDto,
  ) {
    const admission = await this.context.requireAdmission(
      tenantId,
      admissionId,
    );

    if (admission.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'ADMISSION_CANCELLED',
        message: `Cannot collect a payment on cancelled admission ${admission.admissionNo}`,
        details: { currentStatus: admission.status },
      });
    }

    const result = await this.repo.createPaymentWithDeposit(
      tenantId,
      admission.id,
      userId,
      {
        amount: dto.amount,
        mode: dto.mode ?? 'CASH',
        reference: dto.reference,
        notes: dto.notes,
        receivedAt: dto.receivedAt,
      },
    );

    this.logger.log(
      `Payment ₹${dto.amount} (${dto.mode ?? 'CASH'}) received on ${admission.admissionNo} by ${userId}`,
    );

    return result;
  }

  async listPayments(tenantId: string, admissionId: string) {
    const admission = await this.context.requireAdmission(tenantId, admissionId);
    return this.repo.listPayments(tenantId, admission.id);
  }
}
