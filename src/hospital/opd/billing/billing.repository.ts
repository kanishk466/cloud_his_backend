// billing.repository.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { BILL_NO_CONFIG, RECEIPT_NO_CONFIG } from './constants/billing.constants';

const billWithRelations = {
  patient: {
    select: {
      id: true,
      uhid: true,
      firstName: true,
      lastName: true,
      mobile: true,
    },
  },
  appointment: {
    select: { id: true, appointmentNo: true },
  },
  items: true,
  payments: {
    orderBy: { paidAt: 'asc' as const },
  },
};

@Injectable()
export class BillingRepository {
  private readonly logger = new Logger(BillingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── GENERATE BILL NUMBER ──────────────────────────────────────
  async generateBillNo(tenantId: string): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const today = format(new Date(), 'yyyyMMdd');
        const prefix = `${BILL_NO_CONFIG.PREFIX}-${today}-`;

        const result = await tx.$queryRaw<{ bill_no: string }[]>`
          SELECT bill_no FROM opd_bills
          WHERE tenant_id = ${tenantId} AND bill_no LIKE ${`${prefix}%`}
          ORDER BY bill_no DESC LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastNo = result[0]?.bill_no;
        let seq = 1;
        if (lastNo) {
          const parts = lastNo.split('-');
          seq = parseInt(parts[parts.length - 1], 10) + 1;
        }

        return `${prefix}${seq.toString().padStart(BILL_NO_CONFIG.SEQUENCE_LENGTH, '0')}`;
      });
    } catch (error) {
      this.logger.error('Bill number generation failed', error);
      throw new InternalServerErrorException({
        code: 'OPD_BIL_000',
        message: 'Failed to generate bill number',
      });
    }
  }

  // ─── GENERATE RECEIPT NUMBER ────────────────────────────────────
  async generateReceiptNo(tenantId: string): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const today = format(new Date(), 'yyyyMMdd');
        const prefix = `${RECEIPT_NO_CONFIG.PREFIX}-${today}-`;

        const result = await tx.$queryRaw<{ receipt_no: string }[]>`
          SELECT receipt_no FROM opd_payments
          WHERE tenant_id = ${tenantId} AND receipt_no LIKE ${`${prefix}%`}
          ORDER BY receipt_no DESC LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastNo = result[0]?.receipt_no;
        let seq = 1;
        if (lastNo) {
          const parts = lastNo.split('-');
          seq = parseInt(parts[parts.length - 1], 10) + 1;
        }

        return `${prefix}${seq.toString().padStart(RECEIPT_NO_CONFIG.SEQUENCE_LENGTH, '0')}`;
      });
    } catch (error) {
      this.logger.error('Receipt number generation failed', error);
      throw new InternalServerErrorException({
        code: 'OPD_BIL_000',
        message: 'Failed to generate receipt number',
      });
    }
  }

  // ─── CREATE BILL WITH ITEMS ─────────────────────────────────────
  async create(data: {
    tenantId: string;
    billNo: string;
    patientId: string;
    appointmentId?: string;
    items: Array<{
      code?: string;
      description: string;
      category: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    discountReason?: string;
    discountAuthorizedBy?: string;
    taxAmount: number;
    totalAmount: number;
    dueAmount: number;
    isInsurance: boolean;
    insuranceProvider?: string;
    insurancePolicyNo?: string;
    generatedBy?: string;
    billStatus: string;
  }) {
    return this.prisma.opdBill.create({
      data: {
        tenantId: data.tenantId,
        billNo: data.billNo,
        patientId: data.patientId,
        appointmentId: data.appointmentId || undefined,
        subtotal: data.subtotal,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        discountReason: data.discountReason,
        discountAuthorizedBy: data.discountAuthorizedBy,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        paidAmount: 0,
        dueAmount: data.dueAmount,
        isInsurance: data.isInsurance,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNo: data.insurancePolicyNo,
        generatedBy: data.generatedBy,
        billStatus: data.billStatus as any,
        paymentStatus: 'PENDING',
        items: {
          create: data.items.map((it) => ({
            tenantId: data.tenantId,
            itemCode: it.code || null,
            itemName: it.description,
            category: it.category,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxPercent: it.taxRate ?? 0,
            totalAmount: it.quantity * it.unitPrice,
          })),
        },
      },
      include: billWithRelations,
    });
  }

  // ─── FIND BY ID ─────────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    return this.prisma.opdBill.findFirst({
      where: { id, tenantId },
      include: billWithRelations,
    });
  }

  // ─── FIND BY APPOINTMENT ───────────────────────────────────────
  async findByAppointmentId(tenantId: string, appointmentId: string) {
    return this.prisma.opdBill.findFirst({
      where: { tenantId, appointmentId },
      include: billWithRelations,
    });
  }

  // ─── UPDATE BILL ────────────────────────────────────────────────
  async update(id: string, data: Record<string, any>) {
    return this.prisma.opdBill.update({
      where: { id },
      data,
      include: billWithRelations,
    });
  }

  // ─── CREATE PAYMENT ─────────────────────────────────────────────
  async createPayment(data: {
    tenantId: string;
    billId: string;
    receiptNo: string;
    amount: number;
    paymentMode: string;
    transactionId?: string;
    receivedBy?: string;
    notes?: string;
  }) {
    return this.prisma.opdPayment.create({
      data: {
        tenantId: data.tenantId,
        billId: data.billId,
        receiptNo: data.receiptNo,
        amount: data.amount,
        paymentMode: data.paymentMode as any,
        transactionId: data.transactionId,
        receivedBy: data.receivedBy,
        notes: data.notes,
      },
    });
  }

  // ─── LIST BILLS ─────────────────────────────────────────────────
  async findMany(
    tenantId: string,
    filter: {
      patientId?: string;
      date?: string;
      billStatus?: string;
      paymentStatus?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: Prisma.OpdBillWhereInput = { tenantId };

    if (filter.patientId) where.patientId = filter.patientId;
    if (filter.billStatus) where.billStatus = filter.billStatus as any;
    if (filter.paymentStatus) where.paymentStatus = filter.paymentStatus as any;

    if (filter.date) {
      const start = new Date(filter.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filter.date);
      end.setHours(23, 59, 59, 999);
      where.billedAt = { gte: start, lte: end };
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
      this.prisma.opdBill.findMany({
        where,
        include: billWithRelations,
        orderBy: { billedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.opdBill.count({ where }),
    ]);

    return { bills, total };
  }

  // ─── LIST PAYMENTS (Payment History Tab) ─────────────────────────
  async findManyPayments(
    tenantId: string,
    filter: {
      patientId?: string;
      billId?: string;
      paymentMode?: string;
      date?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: Prisma.OpdPaymentWhereInput = { tenantId };

    if (filter.billId) where.billId = filter.billId;
    if (filter.paymentMode) where.paymentMode = filter.paymentMode as any;

    if (filter.date) {
      const start = new Date(filter.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filter.date);
      end.setHours(23, 59, 59, 999);
      where.paidAt = { gte: start, lte: end };
    } else if (filter.from || filter.to) {
      where.paidAt = {};
      if (filter.from) {
        const start = new Date(filter.from);
        start.setHours(0, 0, 0, 0);
        where.paidAt.gte = start;
      }
      if (filter.to) {
        const end = new Date(filter.to);
        end.setHours(23, 59, 59, 999);
        where.paidAt.lte = end;
      }
    }

    if (filter.patientId) {
      where.bill = { patientId: filter.patientId };
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.opdPayment.findMany({
        where,
        include: {
          bill: {
            select: {
              id: true,
              billNo: true,
              totalAmount: true,
              patientId: true,
              patient: {
                select: {
                  id: true,
                  uhid: true,
                  firstName: true,
                  lastName: true,
                  mobile: true,
                },
              },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.opdPayment.count({ where }),
    ]);

    return { payments, total, page, limit };
  }

  // ─── DAILY SUMMARY ──────────────────────────────────────────────
  async getDailySummary(tenantId: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const summary = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int as total_bills,
        COALESCE(SUM(total_amount), 0)::numeric(10,2) as total_amount,
        COALESCE(SUM(paid_amount), 0)::numeric(10,2) as total_collected,
        COALESCE(SUM(due_amount), 0)::numeric(10,2) as total_due,
        COALESCE(SUM(discount_amount), 0)::numeric(10,2) as total_discount
      FROM opd_bills
      WHERE tenant_id = ${tenantId}
        AND billed_at >= ${start}
        AND billed_at <= ${end}
        AND bill_status != 'CANCELLED'
    `;

    const paymentBreakdown = await this.prisma.$queryRaw<any[]>`
      SELECT
        payment_mode as mode,
        COUNT(*)::int as count,
        COALESCE(SUM(amount), 0)::numeric(10,2) as amount
      FROM opd_payments
      WHERE tenant_id = ${tenantId}
        AND paid_at >= ${start}
        AND paid_at <= ${end}
      GROUP BY payment_mode
    `;

    const statusBreakdown = await this.prisma.$queryRaw<any[]>`
      SELECT
        bill_status as status,
        COUNT(*)::int as count
      FROM opd_bills
      WHERE tenant_id = ${tenantId}
        AND billed_at >= ${start}
        AND billed_at <= ${end}
      GROUP BY bill_status
    `;

    return {
      summary: summary[0],
      paymentBreakdown,
      statusBreakdown,
    };
  }

  // ─── GET APPOINTMENT ────────────────────────────────────────────
  async getAppointment(tenantId: string, appointmentId: string) {
    return this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, deletedAt: null },
      include: {
        patient: {
          select: { id: true, uhid: true, patientType: true },
        },
      },
    });
  }
}