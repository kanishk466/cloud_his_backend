import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, ForbiddenException, Logger,
} from '@nestjs/common';
import { BillingRepository } from './billing.repository';
import { CreateBillDto } from './dto/create-bill.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CancelBillDto } from './dto/cancel-bill.dto';
import { BillResponseDto, DailySummaryDto } from './dto/billing-response.dto';
import {
  BILLING_ERRORS, PAYABLE_STATUSES, CANCELLABLE_STATUSES,
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
    // Rule 1: Validate appointment
    const appointment = await this.billingRepository.getAppointment(tenantId, dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException(BILLING_ERRORS.APPOINTMENT_NOT_FOUND);
    }

    // Rule 2: Check duplicate bill
    const existingBill = await this.billingRepository.findByAppointmentId(tenantId, dto.appointmentId);
    if (existingBill) {
      throw new ConflictException({
        ...BILLING_ERRORS.BILL_ALREADY_EXISTS,
        details: { billNo: existingBill.billNo },
      });
    }

    // Rule 3: Calculate bill
    const consultationFee = Number(appointment.consultationFee);
    const registrationFee = dto.registrationFee ?? 0;
    const otherCharges = dto.otherCharges ?? 0;

    const calculated = this.calculateBill({
      consultationFee,
      registrationFee,
      otherCharges,
      discountPercent: dto.discountPercent,
      discountAmount: dto.discountAmount,
      taxPercent: dto.taxPercent,
    });

    // Rule 4: Generate bill number
    const billNo = await this.billingRepository.generateBillNo(tenantId);

    // Rule 5: Create bill
    const bill = await this.billingRepository.create({
      tenantId,
      billNo,
      patientId: appointment.patientId,
      appointmentId: dto.appointmentId,
      consultationFee,
      registrationFee,
      otherCharges,
      subtotal: calculated.subtotal,
      discountPercent: calculated.discountPercent,
      discountAmount: calculated.discountAmount,
      discountReason: dto.discountReason,
      discountAuthorizedBy: dto.discountAuthorizedBy,
      taxPercent: calculated.taxPercent,
      taxAmount: calculated.taxAmount,
      totalAmount: calculated.totalAmount,
      dueAmount: calculated.totalAmount,
      isInsurance: dto.isInsurance ?? false,
      insuranceProvider: dto.insuranceProvider,
      insurancePolicyNo: dto.insurancePolicyNo,
      insuranceClaimed: dto.insuranceClaimed,
      generatedBy,
      billStatus: 'GENERATED',
    });

    this.logger.log(`Bill ${billNo} generated for appointment ${appointment.appointmentNo}`);

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
  async findByAppointmentId(tenantId: string, appointmentId: string): Promise<BillResponseDto | null> {
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

  // ─── COLLECT PAYMENT ────────────────────────────────────────────
  async collectPayment(
    tenantId: string,
    billId: string,
    receivedBy: string,
    dto: CollectPaymentDto,
  ): Promise<BillResponseDto> {
    const bill = await this.billingRepository.findById(tenantId, billId);
    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);

    // Rule 1: Check bill status
    const isPayable = PAYABLE_STATUSES.includes(bill.billStatus as any);
    if (!isPayable) {
      throw new BadRequestException({
        ...BILLING_ERRORS.BILL_NOT_GENERATED,
        details: { currentStatus: bill.billStatus },
      });
    }

    // Rule 2: Check not already fully paid
    const dueAmount = Number(bill.dueAmount);
    if (dueAmount <= 0) {
      throw new BadRequestException(BILLING_ERRORS.BILL_ALREADY_PAID);
    }

    // Rule 3: Check payment doesn't exceed due
    if (dto.amount > dueAmount) {
      throw new BadRequestException({
        ...BILLING_ERRORS.PAYMENT_EXCEEDS_DUE,
        details: { dueAmount, paymentAmount: dto.amount },
      });
    }

    // Rule 4: Generate receipt number
    const receiptNo = await this.billingRepository.generateReceiptNo(tenantId);

    // Rule 5: Create payment record
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

    // Rule 6: Update bill amounts and status
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

    // Calculate discount
    let discountAmount = dto.discountAmount ?? 0;
    let discountPercent = dto.discountPercent ?? 0;

    if (discountPercent > 0 && discountAmount === 0) {
      discountAmount = (subtotal * discountPercent) / 100;
    } else if (discountAmount > 0 && discountPercent === 0) {
      discountPercent = (discountAmount / subtotal) * 100;
    }

    // Validate discount
    if (discountAmount > subtotal) {
      throw new BadRequestException(BILLING_ERRORS.INVALID_DISCOUNT);
    }

    // Recalculate
    const taxPercent = Number(bill.taxPercent);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const totalAmount = afterDiscount + taxAmount;
    const paidAmount = Number(bill.paidAmount);
    const dueAmount = totalAmount - paidAmount;

    const updated = await this.billingRepository.update(billId, {
      discountPercent,
      discountAmount,
      discountReason: dto.discountReason,
      discountAuthorizedBy: dto.discountAuthorizedBy,
      taxAmount,
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
  async getDailySummary(tenantId: string, date?: string): Promise<DailySummaryDto> {
    const queryDate = date ? new Date(date) : new Date();
    const result = await this.billingRepository.getDailySummary(tenantId, queryDate);

    return {
      date: format(queryDate, 'yyyy-MM-dd'),
      totalBills: result.summary?.total_bills ?? 0,
      totalAmount: Number(result.summary?.total_amount ?? 0),
      totalCollected: Number(result.summary?.total_collected ?? 0),
      totalDue: Number(result.summary?.total_due ?? 0),
      totalDiscount: Number(result.summary?.total_discount ?? 0),
      paymentModeBreakdown: result.paymentBreakdown.map((p: any) => ({
        mode: p.mode,
        count: p.count,
        amount: Number(p.amount),
      })),
      billStatusBreakdown: result.statusBreakdown.map((s: any) => ({
        status: s.status,
        count: s.count,
      })),
    };
  }

  // ─── PRIVATE: BILL CALCULATION ──────────────────────────────────
  private calculateBill(input: {
    consultationFee: number;
    registrationFee: number;
    otherCharges: number;
    discountPercent?: number;
    discountAmount?: number;
    taxPercent?: number;
  }) {
    const subtotal = input.consultationFee + input.registrationFee + input.otherCharges;

    let discountAmount = input.discountAmount ?? 0;
    let discountPercent = input.discountPercent ?? 0;

    if (discountPercent > 0 && discountAmount === 0) {
      discountAmount = (subtotal * discountPercent) / 100;
    } else if (discountAmount > 0 && discountPercent === 0) {
      discountPercent = (discountAmount / subtotal) * 100;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    discountPercent = Math.round(discountPercent * 100) / 100;

    const afterDiscount = subtotal - discountAmount;
    const taxPercent = input.taxPercent ?? 0;
    const taxAmount = Math.round((afterDiscount * taxPercent) / 100 * 100) / 100;
    const totalAmount = Math.round((afterDiscount + taxAmount) * 100) / 100;

    return {
      subtotal,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      totalAmount,
    };
  }
}