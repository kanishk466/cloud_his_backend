export class PaymentResponseDto {
  id!: string;
  receiptNo!: string;
  amount!: number;
  paymentMode!: string;
  transactionId!: string | null;
  receivedBy!: string | null;
  paidAt!: Date;
  notes?: string | null;
}

export class BillResponseDto {
  id!: string;
  billNo!: string;

  patient!: {
    id: string;
    uhid: string;
    firstName: string;
    lastName: string | null;
    fullName: string;
    mobile: string;
  };

  appointmentId!: string;
  appointmentNo!: string;

  // Charges
  consultationFee!: number;
  registrationFee!: number;
  otherCharges!: number;
  subtotal!: number;

  // Discount
  discountPercent!: number;
  discountAmount!: number;
  discountReason!: string | null;

  // Tax
  taxPercent!: number;
  taxAmount!: number;

  // Totals
  totalAmount!: number;
  paidAmount!: number;
  dueAmount!: number;

  // Status
  paymentStatus!: string;
  billStatus!: string;
  paymentMode!: string | null;

  // Insurance
  isInsurance!: boolean;
  insuranceProvider!: string | null;
  insurancePolicyNo!: string | null;
  insuranceClaimed!: number | null;
  insuranceApproved!: number | null;

  // Meta
  generatedBy!: string | null;
  billedAt!: Date;
  paidAt!: Date | null;
  cancelledAt!: Date | null;
  cancelReason!: string | null;

  // Payments
  payments!: PaymentResponseDto[];

  static fromEntity(entity: any): BillResponseDto {
    const dto = new BillResponseDto();

    dto.id = entity.id;
    dto.billNo = entity.billNo;
    dto.appointmentId = entity.appointmentId;
    dto.appointmentNo = entity.appointment?.appointmentNo ?? '';

    // Patient
    const p = entity.patient;
    if (p) {
      dto.patient = {
        id: p.id,
        uhid: p.uhid,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: [p.firstName, p.lastName].filter(Boolean).join(' '),
        mobile: p.mobile,
      };
    }

    // Charges
    dto.consultationFee = Number(entity.consultationFee);
    dto.registrationFee = Number(entity.registrationFee);
    dto.otherCharges = Number(entity.otherCharges);
    dto.subtotal = Number(entity.subtotal);

    dto.discountPercent = Number(entity.discountPercent);
    dto.discountAmount = Number(entity.discountAmount);
    dto.discountReason = entity.discountReason;

    dto.taxPercent = Number(entity.taxPercent);
    dto.taxAmount = Number(entity.taxAmount);

    dto.totalAmount = Number(entity.totalAmount);
    dto.paidAmount = Number(entity.paidAmount);
    dto.dueAmount = Number(entity.dueAmount);

    dto.paymentStatus = entity.paymentStatus;
    dto.billStatus = entity.billStatus;
    dto.paymentMode = entity.paymentMode;

    dto.isInsurance = entity.isInsurance;
    dto.insuranceProvider = entity.insuranceProvider;
    dto.insurancePolicyNo = entity.insurancePolicyNo;
    dto.insuranceClaimed = entity.insuranceClaimed ? Number(entity.insuranceClaimed) : null;
    dto.insuranceApproved = entity.insuranceApproved ? Number(entity.insuranceApproved) : null;

    dto.generatedBy = entity.generatedBy;
    dto.billedAt = entity.billedAt;
    dto.paidAt = entity.paidAt;
    dto.cancelledAt = entity.cancelledAt;
    dto.cancelReason = entity.cancelReason;

    // Payments
    dto.payments = (entity.payments ?? []).map((pay: any) => ({
      id: pay.id,
      receiptNo: pay.receiptNo,
      amount: Number(pay.amount),
      paymentMode: pay.paymentMode,
      transactionId: pay.transactionId,
      receivedBy: pay.receivedBy,
      paidAt: pay.paidAt,
      notes: pay.notes,
    }));

    return dto;
  }
}

export class DailySummaryDto {
  date!: string;
  totalBills!: number;
  totalAmount!: number;
  totalCollected!: number;
  totalDue!: number;
  totalDiscount!: number;
  paymentModeBreakdown!: {
    mode: string;
    count: number;
    amount: number;
  }[];
  billStatusBreakdown!: {
    status: string;
    count: number;
  }[];
}