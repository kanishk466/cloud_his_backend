// billing.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { BillingRepository } from './billing.repository';
import { CreateBillDto } from './dto/create-bill.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CancelBillDto } from './dto/cancel-bill.dto';
import { BillResponseDto, DailySummaryDto } from './dto/billing-response.dto';
import {
  BILLING_ERRORS,
  PAYABLE_STATUSES,
  CANCELLABLE_STATUSES,
} from './constants/billing.constants';
import { format } from 'date-fns';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly billingRepository: BillingRepository) {}

  // ─── GENERATE BILL ──────────────────────────────────────────────
  async generateBill(
    tenantId: string,
    generatedBy: string,
    dto: CreateBillDto,
  ): Promise<BillResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A bill must contain at least one line item.');
    }

    // Validate appointment if provided
    if (dto.appointmentId) {
      const appointment = await this.billingRepository.getAppointment(
        tenantId,
        dto.appointmentId,
      );
      if (!appointment) {
        throw new NotFoundException(BILLING_ERRORS.APPOINTMENT_NOT_FOUND);
      }

      const existingBill = await this.billingRepository.findByAppointmentId(
        tenantId,
        dto.appointmentId,
      );
      if (existingBill) {
        throw new ConflictException({
          ...BILLING_ERRORS.BILL_ALREADY_EXISTS,
          details: { billNo: existingBill.billNo },
        });
      }
    }

    // Calculate totals from line items
    const calculated = this.calculateBillItems({
      items: dto.items,
      discountPercent: dto.discountPercent,
      discountAmount: dto.discountAmount,
    });

    // Validate optional immediate payment
    const paymentAmount = Number(dto.paymentAmount ?? 0);
    if (paymentAmount > 0) {
      if (!dto.paymentMode) {
        throw new BadRequestException(
          'paymentMode is required when paymentAmount is provided',
        );
      }
      if (paymentAmount > calculated.totalAmount) {
        throw new BadRequestException({
          ...BILLING_ERRORS.PAYMENT_EXCEEDS_DUE,
          details: {
            totalAmount: calculated.totalAmount,
            paymentAmount,
          },
        });
      }
    }

    const billNo = await this.billingRepository.generateBillNo(tenantId);

    // Initial paid / due / status
    const paidAmount = paymentAmount > 0 ? paymentAmount : 0;
    const dueAmount = calculated.totalAmount - paidAmount;

    let paymentStatus = 'PENDING';
    let billStatus = 'GENERATED';

    if (paidAmount > 0 && dueAmount <= 0) {
      paymentStatus = 'PAID';
      billStatus = 'PAID';
    } else if (paidAmount > 0 && dueAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
      billStatus = 'PARTIALLY_PAID';
    }

    // Create bill + line items
    const bill = await this.billingRepository.create({
      tenantId,
      billNo,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      items: dto.items,
      subtotal: calculated.subtotal,
      discountPercent: calculated.discountPercent,
      discountAmount: calculated.discountAmount,
      discountReason: dto.discountReason,
      discountAuthorizedBy: dto.discountAuthorizedBy,
      taxAmount: calculated.taxAmount,
      totalAmount: calculated.totalAmount,
      dueAmount: dueAmount > 0 ? dueAmount : 0,
      isInsurance: dto.isInsurance ?? false,
      insuranceProvider: dto.insuranceProvider,
      insurancePolicyNo: dto.insurancePolicyNo,
      generatedBy,
      billStatus,
    });

    // If paid at creation → create payment receipt + update bill
    if (paymentAmount > 0 && dto.paymentMode) {
      const receiptNo = await this.billingRepository.generateReceiptNo(tenantId);

      await this.billingRepository.createPayment({
        tenantId,
        billId: bill.id,
        receiptNo,
        amount: paymentAmount,
        paymentMode: dto.paymentMode,
        transactionId: dto.paymentTransactionId,
        receivedBy: generatedBy,
        notes: dto.paymentNotes ?? 'Payment collected at bill creation',
      });

      const updated = await this.billingRepository.update(bill.id, {
        paidAmount,
        dueAmount: dueAmount > 0 ? dueAmount : 0,
        paymentStatus,
        billStatus,
        paymentMode: dto.paymentMode,
        paidAt: dueAmount <= 0 ? new Date() : undefined,
      });

      this.logger.log(
        `Bill ${billNo} generated with immediate payment ₹${paymentAmount} (${receiptNo})`,
      );

      return BillResponseDto.fromEntity(updated);
    }

    this.logger.log(`Bill ${billNo} generated for patient ${dto.patientId}`);
    return BillResponseDto.fromEntity(bill);
  }

  // ─── GET BILL BY ID ─────────────────────────────────────────────
  async findById(tenantId: string, id: string): Promise<BillResponseDto> {
    const bill = await this.billingRepository.findById(tenantId, id);
    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);
    if (bill.tenantId !== tenantId) throw new ForbiddenException(BILLING_ERRORS.CROSS_TENANT);
    return BillResponseDto.fromEntity(bill);
  }

  // ─── GET BILL BY APPOINTMENT ────────────────────────────────────
  async findByAppointmentId(
    tenantId: string,
    appointmentId: string,
  ): Promise<BillResponseDto | null> {
    const bill = await this.billingRepository.findByAppointmentId(tenantId, appointmentId);
    if (!bill) return null;
    return BillResponseDto.fromEntity(bill);
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
    const { bills, total } = await this.billingRepository.findMany(tenantId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: bills.map((b) => BillResponseDto.fromEntity(b)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── LIST PAYMENTS ────────────────────────────────────────────────
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
    const { payments, total, page, limit } =
      await this.billingRepository.findManyPayments(tenantId, filter);

    return {
      data: payments.map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        transactionId: p.transactionId,
        notes: p.notes,
        paidAt: p.paidAt,
        receivedBy: p.receivedBy,
        billId: p.billId,
        billNo: p.bill?.billNo,
        patient: p.bill?.patient
          ? {
              id: p.bill.patient.id,
              uhid: p.bill.patient.uhid,
              name: [p.bill.patient.firstName, p.bill.patient.lastName]
                .filter(Boolean)
                .join(' '),
              mobile: p.bill.patient.mobile,
            }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── COLLECT PAYMENT ────────────────────────────────────────────
  async collectPayment(
    tenantId: string,
    billId: string,
    receivedBy: string,
    dto: CollectPaymentDto,
  ): Promise<BillResponseDto> {
    const bill = await this.billingRepository.findById(tenantId, billId);
    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);

    const isPayable = PAYABLE_STATUSES.includes(bill.billStatus as any);
    if (!isPayable) {
      throw new BadRequestException({
        ...BILLING_ERRORS.BILL_NOT_GENERATED,
        details: { currentStatus: bill.billStatus },
      });
    }

    const dueAmount = Number(bill.dueAmount);
    if (dueAmount <= 0) {
      throw new BadRequestException(BILLING_ERRORS.BILL_ALREADY_PAID);
    }

    if (dto.amount > dueAmount) {
      throw new BadRequestException({
        ...BILLING_ERRORS.PAYMENT_EXCEEDS_DUE,
        details: { dueAmount, paymentAmount: dto.amount },
      });
    }

    const receiptNo = await this.billingRepository.generateReceiptNo(tenantId);

    await this.billingRepository.createPayment({
      tenantId,
      billId,
      receiptNo,
      amount: dto.amount,
      paymentMode: dto.paymentMode,
      transactionId: dto.transactionId,
      receivedBy,
      notes: dto.notes,
    });

    const newPaidAmount = Number(bill.paidAmount) + dto.amount;
    const newDueAmount = Number(bill.totalAmount) - newPaidAmount;

    let paymentStatus: string;
    let billStatus: string;

    if (newDueAmount <= 0) {
      paymentStatus = 'PAID';
      billStatus = 'PAID';
    } else {
      paymentStatus = 'PARTIALLY_PAID';
      billStatus = 'PARTIALLY_PAID';
    }

    const updated = await this.billingRepository.update(billId, {
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount > 0 ? newDueAmount : 0,
      paymentStatus,
      billStatus,
      paymentMode: dto.paymentMode,
      paidAt: newDueAmount <= 0 ? new Date() : undefined,
    });

    this.logger.log(`Payment ${receiptNo} of ₹${dto.amount} collected for bill ${bill.billNo}`);

    return BillResponseDto.fromEntity(updated);
  }

  // ─── APPLY DISCOUNT ─────────────────────────────────────────────
  async applyDiscount(
    tenantId: string,
    billId: string,
    dto: ApplyDiscountDto,
  ): Promise<BillResponseDto> {
    const bill = await this.billingRepository.findById(tenantId, billId);
    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);

    if (bill.billStatus === 'CANCELLED' || bill.billStatus === 'PAID') {
      throw new BadRequestException({
        code: 'OPD_BIL_012',
        message: 'Cannot apply discount to cancelled or fully paid bill',
      });
    }

    const subtotal = Number(bill.subtotal);

    let discountAmount = dto.discountAmount ?? 0;
    let discountPercent = dto.discountPercent ?? 0;

    if (discountPercent > 0 && discountAmount === 0) {
      discountAmount = (subtotal * discountPercent) / 100;
    } else if (discountAmount > 0 && discountPercent === 0) {
      discountPercent = (discountAmount / subtotal) * 100;
    }

    if (discountAmount > subtotal) {
      throw new BadRequestException(BILLING_ERRORS.INVALID_DISCOUNT);
    }

    const taxAmount = Number(bill.taxAmount);
    const afterDiscount = subtotal - discountAmount;
    const totalAmount = afterDiscount + taxAmount;
    const paidAmount = Number(bill.paidAmount);
    const dueAmount = totalAmount - paidAmount;

    const updated = await this.billingRepository.update(billId, {
      discountPercent,
      discountAmount,
      discountReason: dto.discountReason,
      discountAuthorizedBy: dto.discountAuthorizedBy,
      totalAmount,
      dueAmount: dueAmount > 0 ? dueAmount : 0,
      paymentStatus: dueAmount <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING'),
      billStatus: dueAmount <= 0 ? 'PAID' : bill.billStatus,
    });

    return BillResponseDto.fromEntity(updated);
  }

  // ─── CANCEL BILL ────────────────────────────────────────────────
  async cancelBill(
    tenantId: string,
    billId: string,
    dto: CancelBillDto,
  ): Promise<BillResponseDto> {
    const bill = await this.billingRepository.findById(tenantId, billId);
    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);

    if (!CANCELLABLE_STATUSES.includes(bill.billStatus as any)) {
      throw new BadRequestException({
        ...BILLING_ERRORS.CANNOT_CANCEL,
        details: { currentStatus: bill.billStatus },
      });
    }

    if (Number(bill.paidAmount) > 0) {
      throw new BadRequestException(BILLING_ERRORS.CANNOT_CANCEL_PAID);
    }

    const updated = await this.billingRepository.update(billId, {
      billStatus: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: dto.cancelReason,
    });

    this.logger.log(`Bill ${bill.billNo} cancelled`);

    return BillResponseDto.fromEntity(updated);
  }

  // ─── DAILY SUMMARY ──────────────────────────────────────────────
  async getDailySummary(tenantId: string, dateStr?: string): Promise<DailySummaryDto> {
    const queryDate = dateStr ? new Date(dateStr) : new Date();
    const result = await this.billingRepository.getDailySummary(tenantId, queryDate);

    return {
      date: format(queryDate, 'yyyy-MM-dd'),
      totalBills: result.summary?.total_bills ?? 0,
      totalAmount: Number(result.summary?.total_amount ?? 0),
      totalCollected: Number(result.summary?.total_collected ?? 0),
      totalDue: Number(result.summary?.total_due ?? 0),
      totalDiscount: Number(result.summary?.total_discount ?? 0),
      paymentModeBreakdown: (result.paymentBreakdown || []).map((p: any) => ({
        mode: p.mode,
        count: p.count,
        amount: Number(p.amount),
      })),
      billStatusBreakdown: (result.statusBreakdown || []).map((s: any) => ({
        status: s.status,
        count: s.count,
      })),
    };
  }

  // ─── PRIVATE CALCULATION ENGINE ─────────────────────────────────
  private calculateBillItems(input: {
    items: Array<{
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
    discountPercent?: number;
    discountAmount?: number;
  }) {
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of input.items) {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;

      const rate = item.taxRate || 0;
      taxAmount += lineTotal * (rate / 100);
    }

    let discountAmount = input.discountAmount ?? 0;
    let discountPercent = input.discountPercent ?? 0;

    if (discountPercent > 0 && discountAmount === 0) {
      discountAmount = (subtotal * discountPercent) / 100;
    } else if (discountAmount > 0 && discountPercent === 0) {
      discountPercent = (discountAmount / subtotal) * 100;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    discountPercent = Math.round(discountPercent * 100) / 100;
    taxAmount = Math.round(taxAmount * 100) / 100;

    const afterDiscount = subtotal - discountAmount;
    const totalAmount = Math.round((afterDiscount + taxAmount) * 100) / 100;

    return {
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount,
      totalAmount,
    };
  }
}