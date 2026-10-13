import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/** Admission slice the billing screens need — nothing clinical. */
export const BILLING_ADMISSION_SELECT = {
  id: true,
  admissionNo: true,
  status: true,
  admissionDate: true,
  dischargeDate: true,
  admissionType: true,
  advancePaid: true,
  provisionalTotal: true,
  thresholdBreached: true,
  panelId: true,
  patient: {
    select: {
      id: true,
      uhid: true,
      firstName: true,
      lastName: true,
      gender: true,
      mobile: true,
    },
  },
  panel: { select: { id: true, panelCode: true, panelName: true } },
  bed: {
    select: {
      id: true,
      bedIdentifier: true,
      room: {
        select: {
          roomNumber: true,
          roomType: {
            select: {
              id: true,
              name: true,
              code: true,
              defaultRate: true,
              nursingCharge: true,
              isDaycare: true,
              isDialysis: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tenant-validated admission (any status — reads work after discharge too). */
  findAdmission(tenantId: string, admissionId: string) {
    return this.prisma.ipdAdmission.findFirst({
      where: { id: admissionId, tenantId },
      select: BILLING_ADMISSION_SELECT,
    });
  }

  /** Admissions the nightly accrual must charge (open stays). */
  listChargeableAdmissions(tenantId: string, admissionId?: string) {
    return this.prisma.ipdAdmission.findMany({
      where: {
        tenantId,
        status: { in: ['ADMITTED', 'DISCHARGE_ORDERED'] },
        ...(admissionId ? { id: admissionId } : {}),
      },
      select: BILLING_ADMISSION_SELECT,
      orderBy: { admissionDate: 'asc' },
    });
  }

  async sumCharges(tenantId: string, admissionId: string): Promise<number> {
    const agg = await this.prisma.ipdCharge.aggregate({
      where: { tenantId, admissionId },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  async sumPayments(tenantId: string, admissionId: string): Promise<number> {
    const agg = await this.prisma.ipdPayment.aggregate({
      where: { tenantId, admissionId },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  listCharges(tenantId: string, admissionId: string, limit = 200) {
    return this.prisma.ipdCharge.findMany({
      where: { tenantId, admissionId },
      orderBy: [{ chargeDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  listPayments(tenantId: string, admissionId: string, limit = 200) {
    return this.prisma.ipdPayment.findMany({
      where: { tenantId, admissionId },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
  }

  findChargeByAccrualKey(
    tenantId: string,
    admissionId: string,
    accrualKey: string,
  ) {
    return this.prisma.ipdCharge.findFirst({
      where: { tenantId, admissionId, accrualKey },
      select: { id: true },
    });
  }

  createCharge(
    tenantId: string,
    admissionId: string,
    postedBy: string,
    data: {
      chargeDate: Date;
      category: string;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      source: 'MANUAL' | 'DAILY_ACCRUAL';
      accrualKey: string | null;
      notes?: string;
    },
  ) {
    return this.prisma.ipdCharge.create({
      data: { tenantId, admissionId, postedBy, ...data },
    });
  }

  /** Keeps `provisionalTotal` / `thresholdBreached` in step with the ledger. */
  setProvisional(
    tenantId: string,
    admissionId: string,
    provisionalTotal: number,
    thresholdBreached: boolean,
  ) {
    return this.prisma.ipdAdmission.update({
      where: { id: admissionId, tenantId },
      data: { provisionalTotal, thresholdBreached },
      select: { id: true, provisionalTotal: true, thresholdBreached: true },
    });
  }

  /**
   * Receipt + deposit update in one transaction: a payment row is written and
   * the admission's `advancePaid` (the running deposit on the stay) moves by
   * the same amount — the ledger and the summary can never disagree.
   */
  createPaymentWithDeposit(
    tenantId: string,
    admissionId: string,
    receivedBy: string,
    data: {
      amount: number;
      mode: string;
      reference?: string;
      notes?: string;
      receivedAt?: Date;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.ipdPayment.create({
        data: { tenantId, admissionId, receivedBy, ...data },
      });

      const admission = await tx.ipdAdmission.update({
        where: { id: admissionId, tenantId },
        data: { advancePaid: { increment: data.amount } },
        select: { advancePaid: true },
      });

      return { payment, advancePaid: Number(admission.advancePaid) };
    });
  }

  /** Raw type helper for services that build Prisma filters dynamically. */
  static where(tenantId: string, admissionId: string): Prisma.IpdChargeWhereInput {
    return { tenantId, admissionId };
  }
}
