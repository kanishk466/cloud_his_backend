import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import {
  BILL_NO_CONFIG,
  RECEIPT_NO_CONFIG,
  CREDIT_NOTE_NO_CONFIG,
} from './constants/billing.constants';

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
  doctorProfile: {
    select: {
      id: true,
      specialization: true,
      hospitalUser: {
        select: { firstName: true, lastName: true },
      },
    },
  },
  items: true,
  payments: {
    orderBy: { paidAt: 'asc' as const },
  },
  creditNotes: {
    orderBy: { issuedAt: 'asc' as const },
    select: {
      id: true,
      creditNoteNo: true,
      refundAmount: true,
      refundMode: true,
      reason: true,
      issuedAt: true,
    },
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

        const result = await tx.$queryRaw<{ billNo: string }[]>`
          SELECT "billNo" FROM opd_bills
          WHERE "tenantId" = ${tenantId} AND "billNo" LIKE ${`${prefix}%`}
          ORDER BY "billNo" DESC LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastNo = result[0]?.billNo;
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

        const result = await tx.$queryRaw<{ receiptNo: string }[]>`
          SELECT "receiptNo" FROM opd_payments
          WHERE "tenantId" = ${tenantId} AND "receiptNo" LIKE ${`${prefix}%`}
          ORDER BY "receiptNo" DESC LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastNo = result[0]?.receiptNo;
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
    panelId?: string | null;
    doctorProfileId?: string | null;
    visitNo?: string | null;
    items: Array<{
      code?: string;
      serviceId?: string;
      description: string;
      category: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      discountAmount?: number;
      taxRate?: number;
      taxAmount?: number;
      totalAmount?: number;
    }>;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    discountReason?: string;
    discountAuthorizedBy?: string;
    taxAmount: number;
    totalAmount: number;
    coPayPercent?: number;
    coPayAmount?: number;
    patientPayable?: number | null;
    panelPayable?: number | null;
    changeAmount?: number;
    remarks?: string;
    dueAmount: number;
    isInsurance: boolean;
    insuranceProvider?: string;
    insurancePolicyNo?: string;
    generatedBy?: string;
    billStatus: string;
    paymentMode?: string;
  }) {
    return this.prisma.opdBill.create({
      data: this.buildBillCreateInput(data),
      include: billWithRelations,
    });
  }

  // ─── CREATE BILL + PAYMENT ATOMICALLY (V2 — no partial failure) ──
  // Bill, its line items, the payment receipt and the paid-status flip all
  // commit or roll back together. Legacy callers without an immediate
  // payment keep using create().
  async createBillWithPayment(
    data: Parameters<BillingRepository['create']>[0] & {
      payment: {
        receiptNo: string;
        amount: number;
        paymentMode: string;
        transactionId?: string;
        receivedBy?: string;
        notes?: string;
      };
      paidAmount: number;
      paymentStatus: string;
    },
  ) {
    const { payment, paidAmount, paymentStatus, ...billData } = data;

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.opdBill.create({
        data: {
          ...this.buildBillCreateInput(billData),
          paidAmount,
          dueAmount: billData.dueAmount,
          paymentStatus: paymentStatus as any,
          billStatus: billData.billStatus as any,
          paymentMode: payment.paymentMode as any,
          paidAt: billData.dueAmount <= 0 ? new Date() : undefined,
        },
        include: billWithRelations,
      });

      await tx.opdPayment.create({
        data: {
          tenantId: billData.tenantId,
          billId: bill.id,
          receiptNo: payment.receiptNo,
          amount: payment.amount,
          paymentMode: payment.paymentMode as any,
          status: 'PAID',
          transactionId: payment.transactionId,
          receivedBy: payment.receivedBy,
          notes: payment.notes,
        },
      });

      return bill;
    });
  }

  private buildBillCreateInput(data: {
    tenantId: string;
    billNo: string;
    patientId: string;
    appointmentId?: string;
    panelId?: string | null;
    doctorProfileId?: string | null;
    visitNo?: string | null;
    items: Array<{
      code?: string;
      serviceId?: string;
      description: string;
      category: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      discountAmount?: number;
      taxRate?: number;
      taxAmount?: number;
      totalAmount?: number;
    }>;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    discountReason?: string;
    discountAuthorizedBy?: string;
    taxAmount: number;
    totalAmount: number;
    coPayPercent?: number;
    coPayAmount?: number;
    patientPayable?: number | null;
    panelPayable?: number | null;
    changeAmount?: number;
    remarks?: string;
    dueAmount: number;
    isInsurance: boolean;
    insuranceProvider?: string;
    insurancePolicyNo?: string;
    generatedBy?: string;
    billStatus: string;
    paymentMode?: string;
  }): Prisma.OpdBillUncheckedCreateInput {
    return {
      tenantId: data.tenantId,
      billNo: data.billNo,
      patientId: data.patientId,
      appointmentId: data.appointmentId || undefined,
      panelId: data.panelId ?? null,
      doctorProfileId: data.doctorProfileId ?? null,
      visitNo: data.visitNo ?? null,

      subtotal: data.subtotal,
      discountPercent: data.discountPercent,
      discountAmount: data.discountAmount,
      discountReason: data.discountReason,
      discountAuthorizedBy: data.discountAuthorizedBy,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      coPayPercent: data.coPayPercent ?? 0,
      coPayAmount: data.coPayAmount ?? 0,
      patientPayable: data.patientPayable ?? null,
      panelPayable: data.panelPayable ?? null,
      changeAmount: data.changeAmount ?? 0,
      remarks: data.remarks ?? null,
      paidAmount: 0,
      dueAmount: data.dueAmount,
      isInsurance: data.isInsurance,
      insuranceProvider: data.insuranceProvider,
      insurancePolicyNo: data.insurancePolicyNo,
      generatedBy: data.generatedBy,
      billStatus: data.billStatus as any,
      paymentMode: (data.paymentMode as any) ?? undefined,
      paymentStatus: 'PENDING',
      items: {
        create: data.items.map((it) => {
          const gross = it.quantity * it.unitPrice;
          const itemDiscPercent = it.discountPercent ?? 0;
          const itemDiscAmount =
            it.discountAmount ?? gross * (itemDiscPercent / 100);
          const taxable = gross - itemDiscAmount;
          const taxPercent = it.taxRate ?? 0;
          const itemTaxAmount = it.taxAmount ?? taxable * (taxPercent / 100);
          const calculatedTotal = it.totalAmount ?? taxable + itemTaxAmount;

          return {
            tenantId: data.tenantId,
            itemCode: it.code || null,
            itemName: it.description,
            category: it.category,
            serviceId: it.serviceId || null,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPercent: itemDiscPercent,
            discountAmount: itemDiscAmount,
            taxPercent,
            totalAmount: calculatedTotal,
          };
        }),
      },
    };
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
    status?: string;
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
        status: (data.status as any) || 'PAID', // 🛠️ FIXED: Includes Step 4 PaymentStatus tracking
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
      fromDate?: string;
      toDate?: string;
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
    } else if (filter.fromDate || filter.toDate) {
      // Spec V2 — date-range filter (fromDate/toDate, inclusive)
      where.billedAt = {};
      if (filter.fromDate) {
        const start = new Date(filter.fromDate);
        start.setHours(0, 0, 0, 0);
        where.billedAt.gte = start;
      }
      if (filter.toDate) {
        const end = new Date(filter.toDate);
        end.setHours(23, 59, 59, 999);
        where.billedAt.lte = end;
      }
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
        COALESCE(SUM("totalAmount"), 0)::numeric(10,2) as total_amount,
        COALESCE(SUM("paidAmount"), 0)::numeric(10,2) as total_collected,
        COALESCE(SUM("dueAmount"), 0)::numeric(10,2) as total_due,
        COALESCE(SUM("discountAmount"), 0)::numeric(10,2) as total_discount
      FROM opd_bills
      WHERE "tenantId" = ${tenantId}
        AND "billedAt" >= ${start}
        AND "billedAt" <= ${end}
        AND "billStatus" != 'CANCELLED'
    `;

    const paymentBreakdown = await this.prisma.$queryRaw<any[]>`
      SELECT
        "paymentMode" as mode,
        COUNT(*)::int as count,
        COALESCE(SUM(amount), 0)::numeric(10,2) as amount
      FROM opd_payments
      WHERE "tenantId" = ${tenantId}
        AND "paidAt" >= ${start}
        AND "paidAt" <= ${end}
      GROUP BY "paymentMode"
    `;

    const statusBreakdown = await this.prisma.$queryRaw<any[]>`
      SELECT
        "billStatus" as status,
        COUNT(*)::int as count
      FROM opd_bills
      WHERE "tenantId" = ${tenantId}
        AND "billedAt" >= ${start}
        AND "billedAt" <= ${end}
      GROUP BY "billStatus"
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

  // ─── PATIENT LOOKUP (panel inheritance for bills) ──────────────────
  getPatient(tenantId: string, patientId: string) {
    return this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, deletedAt: null },
      select: { id: true, panelId: true },
    });
  }

  // ─── PANEL VALIDATION (explicit panelId on bill) ────────────────────
  findPanel(tenantId: string, panelId: string) {
    return this.prisma.panel.findFirst({
      where: { id: panelId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  }

  // ─── PANEL CO-PAY PERCENT (V2 — payable split) ──────────────────────
  async getPanelCoPay(tenantId: string, panelId: string): Promise<number> {
    const panel = await this.prisma.panel.findFirst({
      where: { id: panelId, tenantId, deletedAt: null, isActive: true },
      select: { coPaymentOn: true, coPaymentPercent: true },
    });
    if (!panel || panel.coPaymentOn === 'NONE') return 0;
    return Number(panel.coPaymentPercent ?? 0);
  }

  // ─── PANEL TARIFF RATE (V2 — rate hierarchy, priority 1) ────────────
  // Panel → tariff: a time-bound RateSchedule in force today wins over the
  // panel's default OPD tariff. Then the service's rate inside that tariff.
  async findPanelServiceRate(
    tenantId: string,
    panelId: string,
    serviceId: string,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedule = await this.prisma.rateSchedule.findFirst({
      where: {
        tenantId,
        panelId,
        isActive: true,
        deletedAt: null,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { tariffId: true },
    });

    let tariffId = schedule?.tariffId ?? null;

    if (!tariffId) {
      const panel = await this.prisma.panel.findFirst({
        where: { id: panelId, tenantId, deletedAt: null, isActive: true },
        select: { opdTariffId: true },
      });
      tariffId = panel?.opdTariffId ?? null;
    }

    if (!tariffId) return null;

    return this.prisma.panelServiceRate.findFirst({
      where: { tenantId, tariffId, serviceId, isActive: true },
      select: { rate: true, discountPercent: true },
    });
  }

  // ─── SERVICE FOR BILLING / RATE RESOLUTION (V2) ─────────────────────
  findServiceForBilling(tenantId: string, serviceId: string) {
    return this.prisma.serviceMaster.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      select: {
        id: true,
        serviceCode: true,
        serviceName: true,
        baseRate: true,
        rateEditable: true,
        discountable: true,
        isActive: true,
        categoryRel: { select: { id: true, name: true, code: true } },
      },
    });
  }

  // ─── CONSULTATION SERVICE LOOKUP (Phase 2.2B) ──────────────────────
  // The generic OPD-consultation billing head: category code CONS →
  // sub-category code OPD (from the default seeded service tree).
  async findConsultationService(tenantId: string) {
    return this.prisma.serviceMaster.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        subCategoryRel: {
          is: { code: 'OPD', category: { is: { code: 'CONS' } } },
        },
      },
      select: { id: true, serviceCode: true, serviceName: true },
    });
  }

  // ─── DOCTOR LOOKUP (V2 — rate resolution & attribution) ──────────────
  findDoctor(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id: doctorProfileId, tenantId, isActive: true },
      select: {
        id: true,
        consultationFee: true,
        specialization: true,
        hospitalUser: { select: { firstName: true, lastName: true } },
      },
    });
  }

  // ─── HOSPITAL HEADER (V2 — printable receipt) ────────────────────────
  getHospitalHeader(tenantId: string) {
    return this.prisma.hospital.findUnique({
      where: { tenantId },
      select: {
        name: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    });
  }

  // ─── GENERATE CREDIT NOTE NUMBER (V2) ──────────────────────────────
  async generateCreditNoteNo(tenantId: string): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const today = format(new Date(), 'yyyyMMdd');
        const prefix = `${CREDIT_NOTE_NO_CONFIG.PREFIX}-${today}-`;

        const result = await tx.$queryRaw<{ creditNoteNo: string }[]>`
          SELECT "creditNoteNo" FROM opd_credit_notes
          WHERE "tenantId" = ${tenantId} AND "creditNoteNo" LIKE ${`${prefix}%`}
          ORDER BY "creditNoteNo" DESC LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastNo = result[0]?.creditNoteNo;
        let seq = 1;
        if (lastNo) {
          const parts = lastNo.split('-');
          seq = parseInt(parts[parts.length - 1], 10) + 1;
        }

        return `${prefix}${seq
          .toString()
          .padStart(CREDIT_NOTE_NO_CONFIG.SEQUENCE_LENGTH, '0')}`;
      });
    } catch (error) {
      this.logger.error('Credit note number generation failed', error);
      throw new InternalServerErrorException({
        code: 'OPD_BIL_000',
        message: 'Failed to generate credit note number',
      });
    }
  }

  // ─── TOTAL ALREADY REFUNDED AGAINST A BILL (V2) ─────────────────────
  async getRefundedTotal(tenantId: string, billId: string) {
    const rows = await this.prisma.opdCreditNote.aggregate({
      where: { tenantId, billId },
      _sum: { refundAmount: true },
    });
    return Number(rows._sum.refundAmount ?? 0);
  }

  // ─── CREATE CREDIT NOTE + REVERSE BILL AMOUNTS (V2, atomic) ─────────
  // The original bill row is preserved (audit lock); only its paid/due
  // counters and status change, and only alongside the credit note itself.
  async createCreditNote(input: {
    tenantId: string;
    billId: string;
    creditNoteNo: string;
    refundAmount: number;
    refundMode: string;
    reason: string;
    originalReceiptNos?: string;
    issuedBy?: string;
    items: Array<{
      billItemId?: string | null;
      quantity: number;
      unitPrice: number;
      refundAmount: number;
      reason?: string;
    }>;
    billUpdate: {
      paidAmount: number;
      dueAmount: number;
      paymentStatus: string;
      billStatus: string;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.opdCreditNote.create({
        data: {
          tenantId: input.tenantId,
          billId: input.billId,
          creditNoteNo: input.creditNoteNo,
          refundAmount: input.refundAmount,
          refundMode: input.refundMode as any,
          reason: input.reason,
          originalReceiptNos: input.originalReceiptNos,
          issuedBy: input.issuedBy,
          items: {
            create: input.items.map((it) => ({
              tenantId: input.tenantId,
              billItemId: it.billItemId ?? null,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              refundAmount: it.refundAmount,
              reason: it.reason,
            })),
          },
        },
        include: {
          items: true,
          bill: { include: billWithRelations },
        },
      });

      await tx.opdBill.update({
        where: { id: input.billId },
        data: {
          paidAmount: input.billUpdate.paidAmount,
          dueAmount: input.billUpdate.dueAmount,
          paymentStatus: input.billUpdate.paymentStatus as any,
          billStatus: input.billUpdate.billStatus as any,
        },
      });

      return creditNote;
    });
  }
}
