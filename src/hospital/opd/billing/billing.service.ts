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
import { BillResponseDto } from './dto/billing-response.dto';
import {
  BILLING_ERRORS,
  PAYABLE_STATUSES,
  CANCELLABLE_STATUSES,
} from './constants/billing.constants';

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
    // 1. Validate items presence
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A bill must contain at least one line item.');
    }

    // 2. Validate appointment if passed
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

    // 3. Perform Itemized Calculation
    const calculated = this.calculateBillItems({
      items: dto.items,
      discountPercent: dto.discountPercent,
      discountAmount: dto.discountAmount,
    });

    // 4. Generate bill sequence number
    const billNo = await this.billingRepository.generateBillNo(tenantId);

    // 5. Create bill in DB
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
      dueAmount: calculated.totalAmount,
      isInsurance: dto.isInsurance ?? false,
      insuranceProvider: dto.insuranceProvider,
      insurancePolicyNo: dto.insurancePolicyNo,
      generatedBy,
      billStatus: 'GENERATED',
    });

    this.logger.log(`Bill ${billNo} generated successfully for patient ${dto.patientId}`);

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