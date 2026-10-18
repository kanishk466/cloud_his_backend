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
import { BillLineValidatorService } from './services/bill-line-validator.service';
import { ReferralCommissionsService } from '../../masters/doctor-setup/services/referral-commissions.service';
import { CreateBillDto, CreateBillItemDto } from './dto/create-bill.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CancelBillDto } from './dto/cancel-bill.dto';
import { RefundBillDto } from './dto/refund-bill.dto';
import { BillResponseDto, DailySummaryDto } from './dto/billing-response.dto';
import {
  BILLING_ERRORS,
  PAYABLE_STATUSES,
  CANCELLABLE_STATUSES,
} from './constants/billing.constants';
import { format } from 'date-fns';

const money = (value: number) => Math.round(value * 100) / 100;

/** Where a line item's unit rate came from (rate hierarchy audit trail). */
export type RateSource = 'PANEL' | 'DOCTOR' | 'BASE';

export interface ResolvedRate {
  rate: number;
  source: RateSource;
  service: {
    id: string;
    serviceCode: string;
    serviceName: string;
    baseRate: number;
    rateEditable: boolean;
    category: string | null;
    categoryCode: string | null;
  };
}

/** Internal, normalized bill line after DTO normalization + rate resolution. */
interface NormalizedBillItem {
  serviceId?: string;
  code?: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  rateSource?: RateSource;
  /** CONS-category line — used to dedupe the auto-added appointment
   *  consultation so it can never double-bill. */
  isConsultation?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly billLineValidator: BillLineValidatorService,
    private readonly referralCommissions: ReferralCommissionsService,
  ) {}

  // ─── GENERATE BILL ──────────────────────────────────────────────
  async generateBill(
    tenantId: string,
    generatedBy: string,
    dto: CreateBillDto,
  ): Promise<BillResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'A bill must contain at least one line item.',
      );
    }

    // Appointment validation + duplicate-bill guard
    let appointment: Awaited<ReturnType<BillingRepository['getAppointment']>> =
      null;

    if (dto.appointmentId) {
      appointment = await this.billingRepository.getAppointment(
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

    // Panel linkage: explicit panelId wins, else inherit patient's
    const effectivePanelId = await this.resolvePanelId(tenantId, dto);

    // Doctor attribution: explicit doctorProfileId wins, else the
    // appointment's consulting doctor.
    const doctorProfileId = dto.doctorProfileId ?? appointment?.doctorProfileId ?? null;
    if (doctorProfileId) {
      const doctor = await this.billingRepository.findDoctor(
        tenantId,
        doctorProfileId,
      );
      if (!doctor) {
        throw new NotFoundException(BILLING_ERRORS.DOCTOR_NOT_FOUND);
      }
    }

    // Visit number: explicit visitNo wins, else the appointment number.
    const visitNo = dto.visitNo ?? appointment?.appointmentNo ?? null;

    // ── Items: normalize both DTO shapes, resolve rates (CRITICAL),
    //    validate against ServiceMaster rules, per-line discounts. ──
    const items = await this.normalizeAndResolveItems(
      tenantId,
      dto,
      effectivePanelId,
      doctorProfileId,
    );

    // Auto-add the consultation line from the appointment's fee
    // (calculated at booking by the visit-fee engine)
    if (appointment) {
      const consultationItem = await this.buildConsultationLineItem(
        tenantId,
        Number(appointment.consultationFee),
      );

      // Dedup guard: skip when the counter already billed a consultation —
      // either the exact same service OR ANY CONS-category line. Comparing
      // serviceId alone was not enough: the free-text fallback line has no
      // serviceId, so it used to double-bill every manually added
      // consultation (e.g. "Consultation Fee" + "opd consultation").
      const alreadyPresent = items.some(
        (i) =>
          (consultationItem.serviceId != null &&
            i.serviceId === consultationItem.serviceId) ||
          i.isConsultation === true,
      );

      if (!alreadyPresent) {
        if (consultationItem.serviceId) {
          // System-generated line — gender/age checks run, rate check is
          // skipped (the fee engine, not the counter, owns this rate).
          await this.billLineValidator.validateBillLine(
            tenantId,
            dto.patientId,
            consultationItem.serviceId,
            consultationItem.unitPrice,
            0,
            1,
            { skipRateCheck: true },
          );
        }
        items.unshift(consultationItem);
      }
    }

    // Totals from normalized line items (item + bill discounts, taxes)
    const calculated = this.calculateBillItems({
      items,
      discountPercent: dto.discountPercent,
      discountAmount: dto.discountAmount,
    });
    const netAmount = calculated.totalAmount;

    // Co-payment + patient/panel payable split
    const split = await this.resolvePayableSplit(
      tenantId,
      effectivePanelId,
      netAmount,
      dto,
    );

    // ── Payment at creation: paidAmount (spec) or paymentAmount (legacy) ──
    const rawPaid = Number(dto.paidAmount ?? dto.paymentAmount ?? 0);
    const changeAmount = money(
      dto.changeAmount ?? (rawPaid > netAmount ? rawPaid - netAmount : 0),
    );
    const collectedAmount = money(rawPaid - changeAmount);

    if (collectedAmount < 0) {
      throw new BadRequestException(BILLING_ERRORS.INVALID_PAYABLE_SPLIT);
    }
    if (collectedAmount > 0) {
      if (!dto.paymentMode) {
        throw new BadRequestException(
          'paymentMode is required when a payment is collected',
        );
      }
      if (collectedAmount > netAmount) {
        throw new BadRequestException({
          ...BILLING_ERRORS.PAYMENT_EXCEEDS_DUE,
          details: { totalAmount: netAmount, paymentAmount: collectedAmount },
        });
      }
    }
    if (dto.paymentMode === 'CREDIT' && collectedAmount > 0) {
      throw new BadRequestException(
        'CREDIT bills cannot collect payment at generation — the amount stays due',
      );
    }

    // Statuses
    const dueAmount = money(netAmount - collectedAmount);
    let paymentStatus = 'PENDING';
    let billStatus = 'GENERATED';

    if (collectedAmount > 0 && dueAmount <= 0) {
      paymentStatus = 'PAID';
      billStatus = 'PAID';
    } else if (collectedAmount > 0 && dueAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
      billStatus = 'PARTIALLY_PAID';
    }

    const billNo = await this.billingRepository.generateBillNo(tenantId);

    const billData = {
      tenantId,
      billNo,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      panelId: effectivePanelId,
      doctorProfileId,
      visitNo,
      items,
      subtotal: calculated.subtotal,
      discountPercent: calculated.discountPercent,
      discountAmount: calculated.discountAmount,
      discountReason: dto.discountReason,
      discountAuthorizedBy: dto.discountAuthorityId ?? dto.discountAuthorizedBy,
      taxAmount: calculated.taxAmount,
      totalAmount: netAmount,
      coPayPercent: split.coPayPercent,
      coPayAmount: split.coPayAmount,
      patientPayable: split.patientPayable,
      panelPayable: split.panelPayable,
      changeAmount,
      remarks: dto.remarks,
      dueAmount: dueAmount > 0 ? dueAmount : 0,
      isInsurance: dto.isInsurance ?? false,
      insuranceProvider: dto.insuranceProvider,
      insurancePolicyNo: dto.insurancePolicyNo,
      generatedBy,
      billStatus,
      paymentMode: dto.paymentMode,
    };

    // Create bill (+payment atomically when money is collected)
    let bill;
    if (collectedAmount > 0 && dto.paymentMode) {
      const receiptNo =
        await this.billingRepository.generateReceiptNo(tenantId);

      bill = await this.billingRepository.createBillWithPayment({
        ...billData,
        paidAmount: collectedAmount,
        paymentStatus,
        payment: {
          receiptNo,
          amount: collectedAmount,
          paymentMode: dto.paymentMode,
          transactionId: dto.paymentTransactionId,
          receivedBy: generatedBy,
          notes: dto.paymentNotes ?? 'Payment collected at bill creation',
        },
      });

      this.logger.log(
        `Bill ${billNo} generated with immediate payment ₹${collectedAmount} (${receiptNo})`,
      );
    } else {
      bill = await this.billingRepository.create(billData);

      this.logger.log(`Bill ${billNo} generated for patient ${dto.patientId}`);
    }

    // Referral commission hook (appointment referred by an external
    // doctor). Never throws; failure is logged inside the service.
    await this.referralCommissions.createForBill({
      tenantId,
      billId: bill.id,
      appointmentId: appointment?.id ?? dto.appointmentId ?? null,
      patientId: dto.patientId,
      billAmount: netAmount,
    });

    return BillResponseDto.fromEntity(bill);
  }

  // ─── RATE RESOLUTION (CRITICAL — spec rate hierarchy) ────────────
  //
  // Priority:
  //   1. Panel tariff (time-bound RateSchedule in force today wins,
  //      else the panel's default OPD tariff) → PanelServiceRate
  //   2. Consultation service (categoryCode 'CONS') + doctor → the
  //      doctor's consultationFee
  //   3. Fallback → ServiceMaster.baseRate
  async resolveRate(
    tenantId: string,
    serviceId: string,
    panelId: string | null,
    doctorProfileId: string | null,
  ): Promise<ResolvedRate> {
    const service = await this.billingRepository.findServiceForBilling(
      tenantId,
      serviceId,
    );

    if (!service || !service.isActive) {
      throw new BadRequestException({
        code: 'SERVICE_NOT_FOUND',
        message: 'Service not found or is not active',
        details: { serviceId },
      });
    }

    const baseRate = Number(service.baseRate);
    const serviceInfo = {
      id: service.id,
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      baseRate,
      rateEditable: service.rateEditable,
      category: service.categoryRel?.name ?? null,
      categoryCode: service.categoryRel?.code ?? null,
    };

    // 1. Panel tariff
    if (panelId) {
      const panelRate = await this.billingRepository.findPanelServiceRate(
        tenantId,
        panelId,
        serviceId,
      );
      if (panelRate) {
        return {
          rate: Number(panelRate.rate),
          source: 'PANEL',
          service: serviceInfo,
        };
      }
    }

    // 2. Doctor's consultation fee for CONS-category services
    if (service.categoryRel?.code === 'CONS' && doctorProfileId) {
      const doctor = await this.billingRepository.findDoctor(
        tenantId,
        doctorProfileId,
      );
      if (doctor?.consultationFee != null && Number(doctor.consultationFee) > 0) {
        return {
          rate: Number(doctor.consultationFee),
          source: 'DOCTOR',
          service: serviceInfo,
        };
      }
    }

    // 3. Base rate fallback
    return { rate: baseRate, source: 'BASE', service: serviceInfo };
  }

  // ─── ITEM NORMALIZATION + VALIDATION ─────────────────────────────
  // Accepts BOTH DTO shapes:
  //   Legacy: { description, category, unitPrice, discountPercent? }
  //   Spec V2: { serviceName, unitRate, discountAmount?, totalAmount? }
  // Every service-linked line gets its rate from resolveRate(); the
  // client-sent rate only wins for rate-editable services.
  private async normalizeAndResolveItems(
    tenantId: string,
    dto: CreateBillDto,
    panelId: string | null,
    doctorProfileId: string | null,
  ): Promise<NormalizedBillItem[]> {
    const normalized: NormalizedBillItem[] = [];

    for (const [index, raw] of dto.items.entries()) {
      const description = raw.serviceName ?? raw.description;
      if (!description) {
        throw new BadRequestException({
          ...BILLING_ERRORS.BILL_LINE_INVALID,
          message: `Bill line #${index + 1} needs a serviceName or description`,
        });
      }

      const clientRate = raw.unitPrice ?? raw.unitRate;
      const quantity = raw.quantity ?? 1;
      const discountPercent = raw.discountPercent ?? dto.discountPercent ?? 0;

      // Legacy free-text line — no service link, no validation
      if (!raw.serviceId) {
        this.logger.warn(
          `Bill line #${index + 1} ("${description}") has no serviceId — skipping service validation`,
        );
        if (clientRate == null) {
          throw new BadRequestException({
            ...BILLING_ERRORS.BILL_LINE_INVALID,
            message: `Bill line #${index + 1} needs a unitPrice/unitRate when no serviceId is provided`,
          });
        }
        normalized.push({
          description,
          category: raw.category ?? 'General',
          quantity,
          unitPrice: clientRate,
          discountPercent: raw.discountPercent,
          discountAmount: raw.discountAmount,
          taxRate: raw.taxRate,
          code: raw.code,
        });
        continue;
      }

      // ── Rate hierarchy: panel tariff → doctor fee → base rate ──
      const resolved = await this.resolveRate(
        tenantId,
        raw.serviceId,
        panelId,
        doctorProfileId,
      );

      const rateEditable = resolved.service.rateEditable;
      let unitPrice = resolved.rate;

      if (rateEditable && clientRate != null) {
        unitPrice = clientRate;
      } else if (
        clientRate != null &&
        money(clientRate) !== money(resolved.rate)
      ) {
        // Rate-locked service: server-resolved rate wins (audited override)
        this.logger.warn(
          `Bill line #${index + 1} (${resolved.service.serviceName}): client rate ₹${clientRate} overridden by ${resolved.source} rate ₹${resolved.rate}`,
        );
      }

      // ServiceMaster rules: gender/age/discountability + rate lock vs
      // the RESOLVED rate (not the raw base rate)
      await this.billLineValidator.validateBillLine(
        tenantId,
        dto.patientId,
        raw.serviceId,
        unitPrice,
        raw.discountPercent ?? dto.discountPercent ?? 0,
        quantity,
        { effectiveRate: resolved.rate },
      );

      normalized.push({
        serviceId: raw.serviceId,
        code: raw.code ?? resolved.service.serviceCode,
        description: resolved.service.serviceName,
        category: resolved.service.category ?? raw.category ?? 'General',
        quantity,
        unitPrice,
        rateSource: resolved.source,
        isConsultation: resolved.service.categoryCode === 'CONS',
        discountPercent: raw.discountPercent,
        discountAmount: raw.discountAmount,
        taxRate: raw.taxRate,
      });
    }

    return normalized;
  }

  // ─── PANEL RESOLUTION ────────────────────────────────────────────
  private async resolvePanelId(
    tenantId: string,
    dto: CreateBillDto,
  ): Promise<string | null> {
    // Spec: the counter screen maps "GENERAL / Cash" to an explicit
    // `panelId: null` — that must stay cash, never the patient's panel.
    // Only a genuinely OMITTED field inherits the patient's panel.
    if ('panelId' in dto && !dto.panelId) {
      return null;
    }

    if (dto.panelId) {
      const panel = await this.billingRepository.findPanel(
        tenantId,
        dto.panelId,
      );
      if (!panel) {
        throw new NotFoundException(BILLING_ERRORS.PANEL_NOT_FOUND);
      }
      return dto.panelId;
    }

    const patient = await this.billingRepository.getPatient(
      tenantId,
      dto.patientId,
    );
    return patient?.panelId ?? null;
  }

  // ─── CO-PAY & PAYABLE SPLIT ──────────────────────────────────────
  private async resolvePayableSplit(
    tenantId: string,
    panelId: string | null,
    netAmount: number,
    dto: CreateBillDto,
  ): Promise<{
    coPayPercent: number;
    coPayAmount: number;
    patientPayable: number;
    panelPayable: number;
  }> {
    // Co-pay: explicit DTO values win, else the panel's configured percent
    let coPayPercent = dto.coPayPercent ?? 0;
    if (panelId && coPayPercent === 0) {
      const panelCoPay = await this.billingRepository.getPanelCoPay(
        tenantId,
        panelId,
      );
      coPayPercent = panelCoPay ?? 0;
    }
    const coPayAmount = money(
      dto.coPayAmount ?? (netAmount * coPayPercent) / 100,
    );

    // Payable split
    let patientPayable: number;
    let panelPayable: number;

    if (dto.patientPayable != null || dto.panelPayable != null) {
      patientPayable = dto.patientPayable ?? money(netAmount - (dto.panelPayable ?? 0));
      panelPayable = dto.panelPayable ?? money(netAmount - patientPayable);
    } else if (panelId) {
      // Panel patient: panel carries the net, patient owes the co-pay
      panelPayable = money(netAmount - coPayAmount);
      patientPayable = money(netAmount - panelPayable);
    } else {
      patientPayable = netAmount;
      panelPayable = 0;
    }

    const sum = money(patientPayable + panelPayable);
    if (Math.abs(sum - netAmount) > 0.01) {
      throw new BadRequestException({
        ...BILLING_ERRORS.INVALID_PAYABLE_SPLIT,
        details: { netAmount, patientPayable, panelPayable, sum },
      });
    }

    return { coPayPercent, coPayAmount, patientPayable, panelPayable };
  }

  // ─── GET BILL BY ID ─────────────────────────────────────────────
  async findById(tenantId: string, id: string): Promise<BillResponseDto> {
    const bill = await this.billingRepository.findById(tenantId, id);
    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);
    if (bill.tenantId !== tenantId)
      throw new ForbiddenException(BILLING_ERRORS.CROSS_TENANT);
    return BillResponseDto.fromEntity(bill);
  }

  // ─── GET BILL BY APPOINTMENT ────────────────────────────────────
  async findByAppointmentId(
    tenantId: string,
    appointmentId: string,
  ): Promise<BillResponseDto | null> {
    const bill = await this.billingRepository.findByAppointmentId(
      tenantId,
      appointmentId,
    );
    if (!bill) return null;
    return BillResponseDto.fromEntity(bill);
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
    const { bills, total } = await this.billingRepository.findMany(
      tenantId,
      filter,
    );
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

    const newPaidAmount = money(Number(bill.paidAmount) + dto.amount);
    const newDueAmount = money(Number(bill.totalAmount) - newPaidAmount);

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

    this.logger.log(
      `Payment ${receiptNo} of ₹${dto.amount} collected for bill ${bill.billNo}`,
    );

    return BillResponseDto.fromEntity(updated);
  }

  // ─── REFUND / CREDIT NOTE (V2 — audit lock) ──────────────────────
  // Creates a Credit Note against the bill. The original bill is never
  // deleted; only its paid/due counters and status flip, atomically with
  // the credit note record.
  async refundBill(
    tenantId: string,
    billId: string,
    issuedBy: string,
    dto: RefundBillDto,
  ) {
    const bill = await this.billingRepository.findById(tenantId, billId);
    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);

    const paidAmount = Number(bill.paidAmount);
    const alreadyRefunded = await this.billingRepository.getRefundedTotal(
      tenantId,
      billId,
    );
    const refundable = money(paidAmount - alreadyRefunded);

    if (paidAmount <= 0) {
      throw new BadRequestException(BILLING_ERRORS.REFUND_NOT_ALLOWED);
    }
    if (refundable <= 0) {
      throw new BadRequestException(BILLING_ERRORS.BILL_ALREADY_REFUNDED);
    }

    const refundAmount = money(dto.amount ?? refundable);
    if (refundAmount <= 0 || refundAmount > refundable) {
      throw new BadRequestException({
        ...BILLING_ERRORS.REFUND_EXCEEDS_REMAINING,
        details: { paidAmount, alreadyRefunded, refundable, requested: refundAmount },
      });
    }

    const refundMode =
      dto.refundMode ?? (bill.paymentMode as string) ?? 'CASH';
    const allowedModes = ['CASH', 'CARD', 'UPI', 'CREDIT', 'INSURANCE', 'ONLINE', 'MIXED'];
    if (!allowedModes.includes(refundMode)) {
      throw new BadRequestException({
        code: 'OPD_BIL_020',
        message: `Invalid refund mode: ${refundMode}`,
      });
    }

    const newPaidAmount = money(paidAmount - refundAmount);
    const fullyRefunded = newPaidAmount <= 0;

    const creditNoteNo =
      await this.billingRepository.generateCreditNoteNo(tenantId);

    const originalReceiptNos = (bill.payments ?? [])
      .map((p) => p.receiptNo)
      .join(',');

    const result = await this.billingRepository.createCreditNote({
      tenantId,
      billId,
      creditNoteNo,
      refundAmount,
      refundMode,
      reason: dto.reason,
      originalReceiptNos: originalReceiptNos || undefined,
      issuedBy,
      items: [
        // Header-level refund (no per-line split yet) — one audit row
        {
          billItemId: null,
          quantity: 1,
          unitPrice: refundAmount,
          refundAmount,
          reason: dto.notes ?? dto.reason,
        },
      ],
      billUpdate: {
        paidAmount: newPaidAmount,
        dueAmount: 0,
        paymentStatus: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_PAID',
        billStatus: fullyRefunded ? 'REFUNDED' : bill.billStatus,
      },
    });

    this.logger.log(
      `Credit note ${creditNoteNo} of ₹${refundAmount} issued against bill ${bill.billNo}`,
    );

    return {
      creditNote: {
        id: result.id,
        creditNoteNo: result.creditNoteNo,
        billId: result.billId,
        refundAmount: Number(result.refundAmount),
        refundMode: result.refundMode,
        reason: result.reason,
        originalReceiptNos: result.originalReceiptNos,
        issuedAt: result.issuedAt,
        items: result.items.map((it) => ({
          id: it.id,
          billItemId: it.billItemId,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          refundAmount: Number(it.refundAmount),
        })),
      },
      bill: BillResponseDto.fromEntity(result.bill),
    };
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

    // Line-level discounts already reduce the net — keep totals consistent
    // with what calculateBillItems produced at creation time.
    const itemDiscountTotal = (bill.items ?? []).reduce(
      (sum, it) => sum + Number(it.discountAmount ?? 0),
      0,
    );

    const taxAmount = Number(bill.taxAmount);
    const totalAmount = money(subtotal - itemDiscountTotal - discountAmount + taxAmount);
    const paidAmount = Number(bill.paidAmount);
    const dueAmount = money(totalAmount - paidAmount);

    const updated = await this.billingRepository.update(billId, {
      discountPercent: money(discountPercent),
      discountAmount: money(discountAmount),
      discountReason: dto.discountReason,
      discountAuthorizedBy: dto.discountAuthorizedBy,
      totalAmount,
      dueAmount: dueAmount > 0 ? dueAmount : 0,
      paymentStatus:
        dueAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING',
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
  async getDailySummary(
    tenantId: string,
    dateStr?: string,
  ): Promise<DailySummaryDto> {
    const queryDate = dateStr ? new Date(dateStr) : new Date();
    const result = await this.billingRepository.getDailySummary(
      tenantId,
      queryDate,
    );

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

  // ─── CONSULTATION LINE FROM APPOINTMENT FEE (Phase 2.2B) ────────────
  //
  // Links to the generic CONS → OPD consultation service when configured;
  // falls back to a free-text line so billing never hard-depends on master
  // setup. The unit price always comes from appointment.consultationFee
  // (produced by the visit-fee engine at booking time).

  private async buildConsultationLineItem(
    tenantId: string,
    fee: number,
  ): Promise<NormalizedBillItem> {
    const service =
      await this.billingRepository.findConsultationService(tenantId);

    if (!service) {
      this.logger.warn(
        'No CONS/OPD consultation service configured — consultation added as free-text line',
      );
      return {
        description: 'Consultation Fee',
        category: 'Consultation',
        quantity: 1,
        unitPrice: fee,
        isConsultation: true,
        taxRate: 0,
      };
    }

    return {
      serviceId: service.id,
      code: service.serviceCode,
      description: service.serviceName,
      category: 'Consultation',
      quantity: 1,
      unitPrice: fee,
      rateSource: 'DOCTOR',
      isConsultation: true,
      taxRate: 0,
    };
  }

  // ─── PRIVATE CALCULATION ENGINE ─────────────────────────────────
  // subtotal = Σ (qty × unitPrice) — gross, pre-discount.
  // totalAmount = subtotal − line discounts − bill discount + tax.
  private calculateBillItems(input: {
    items: Array<{
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discountPercent?: number;
      discountAmount?: number;
    }>;
    discountPercent?: number;
    discountAmount?: number;
  }) {
    let subtotal = 0;
    let taxAmount = 0;
    let itemDiscountTotal = 0;

    for (const item of input.items) {
      const lineGross = item.quantity * item.unitPrice;
      subtotal += lineGross;

      const lineDiscount =
        item.discountAmount ??
        lineGross * ((item.discountPercent ?? 0) / 100);
      itemDiscountTotal += lineDiscount;

      const taxable = lineGross - lineDiscount;
      const rate = item.taxRate || 0;
      taxAmount += taxable * (rate / 100);
    }

    let discountAmount = input.discountAmount ?? 0;
    let discountPercent = input.discountPercent ?? 0;

    if (discountPercent > 0 && discountAmount === 0) {
      discountAmount = ((subtotal - itemDiscountTotal) * discountPercent) / 100;
    } else if (discountAmount > 0 && discountPercent === 0) {
      discountPercent = (discountAmount / subtotal) * 100;
    }

    itemDiscountTotal = money(itemDiscountTotal);
    discountAmount = money(discountAmount);
    discountPercent = money(discountPercent);
    taxAmount = money(taxAmount);

    const afterDiscount = subtotal - itemDiscountTotal - discountAmount;
    const totalAmount = money(afterDiscount + taxAmount);

    return {
      subtotal,
      itemDiscountTotal,
      discountPercent,
      discountAmount,
      taxAmount,
      totalAmount,
    };
  }
}
