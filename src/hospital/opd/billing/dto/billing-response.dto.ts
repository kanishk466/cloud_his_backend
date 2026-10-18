export class PaymentResponseDto {
  id!: string;
  receiptNo!: string;
  amount!: number;
  paymentMode!: string;
  transactionId: string | null = null;
  receivedBy: string | null = null;
  paidAt!: Date;
  notes: string | null = null;
}

export class BillItemResponseDto {
  id!: string;
  itemCode: string | null = null;
  itemName!: string;
  category!: string;
  serviceId: string | null = null;
  quantity!: number;
  unitPrice!: number;
  discountPercent!: number;
  discountAmount!: number;
  taxPercent!: number;
  totalAmount!: number;

  static fromEntity(entity: any): BillItemResponseDto {
    const dto = new BillItemResponseDto();
    dto.id = entity.id;
    dto.itemCode = entity.itemCode ?? null;
    dto.itemName = entity.itemName;
    dto.category = entity.category;
    dto.serviceId = entity.serviceId ?? null;
    dto.quantity = entity.quantity;
    dto.unitPrice = Number(entity.unitPrice);
    dto.discountPercent = Number(entity.discountPercent ?? 0);
    dto.discountAmount = Number(entity.discountAmount ?? 0);
    dto.taxPercent = Number(entity.taxPercent ?? 0);
    dto.totalAmount = Number(entity.totalAmount);
    return dto;
  }
}

export class CreditNoteResponseDto {
  id!: string;
  creditNoteNo!: string;
  refundAmount!: number;
  refundMode!: string;
  reason!: string;
  issuedAt!: Date;

  static fromEntity(entity: any): CreditNoteResponseDto {
    const dto = new CreditNoteResponseDto();
    dto.id = entity.id;
    dto.creditNoteNo = entity.creditNoteNo;
    dto.refundAmount = Number(entity.refundAmount);
    dto.refundMode = entity.refundMode;
    dto.reason = entity.reason;
    dto.issuedAt = entity.issuedAt;
    return dto;
  }
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

  appointmentId: string | null = null;
  appointmentNo!: string;

  /** Spec V2 — consulting doctor attribution. */
  doctorProfileId: string | null = null;
  doctor: {
    id: string;
    name: string;
    specialization: string | null;
  } | null = null;

  /** Spec V2 — visit number (APT-… / walk-in). */
  visitNo: string | null = null;

  /** Panel linkage */
  panelId: string | null = null;

  // Charges — grossAmount/netAmount are the spec aliases of subtotal/totalAmount
  grossAmount!: number;
  subtotal!: number;

  // Discount
  discountPercent!: number;
  discountAmount!: number;
  discountReason: string | null = null;
  discountAuthorityId: string | null = null;

  // Co-payment & panel split (V2)
  coPayPercent!: number;
  coPayAmount!: number;
  patientPayable: number | null = null;
  panelPayable: number | null = null;

  // Tax
  taxAmount!: number;

  // Totals
  netAmount!: number;
  totalAmount!: number;
  paidAmount!: number;
  changeAmount!: number;
  dueAmount!: number;

  // Status
  paymentStatus!: string;
  billStatus!: string;
  paymentMode: string | null = null;
  remarks: string | null = null;

  // Insurance
  isInsurance!: boolean;
  insuranceProvider: string | null = null;
  insurancePolicyNo: string | null = null;
  insuranceClaimed: number | null = null;
  insuranceApproved: number | null = null;

  // Meta
  generatedBy: string | null = null;
  billedAt!: Date;
  createdAt!: Date;
  paidAt: Date | null = null;
  cancelledAt: Date | null = null;
  cancelReason: string | null = null;

  // Line items (V2 — full bill detail)
  items!: BillItemResponseDto[];

  // Payments
  payments!: PaymentResponseDto[];

  // Credit notes / refunds (V2)
  creditNotes!: CreditNoteResponseDto[];

  static fromEntity(entity: any): BillResponseDto {
    const dto = new BillResponseDto();

    dto.id = entity.id;
    dto.billNo = entity.billNo;
    dto.appointmentId = entity.appointmentId ?? null;
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

    // Doctor (V2)
    dto.doctorProfileId = entity.doctorProfileId ?? null;
    const doc = entity.doctorProfile;
    if (doc) {
      dto.doctor = {
        id: doc.id,
        name: [doc.hospitalUser?.firstName, doc.hospitalUser?.lastName]
          .filter(Boolean)
          .join(' '),
        specialization: doc.specialization ?? null,
      };
    } else {
      dto.doctor = null;
    }

    dto.visitNo = entity.visitNo ?? null;
    dto.panelId = entity.panelId ?? null;

    // Charges — legacy header fee fields were removed from the model;
    // guard with Number() only over values that still exist.
    dto.subtotal = Number(entity.subtotal ?? 0);
    dto.grossAmount = dto.subtotal;

    dto.discountPercent = Number(entity.discountPercent ?? 0);
    dto.discountAmount = Number(entity.discountAmount ?? 0);
    dto.discountReason = entity.discountReason ?? null;
    dto.discountAuthorityId = entity.discountAuthorizedBy ?? null;

    // Co-pay / panel split (V2)
    dto.coPayPercent = Number(entity.coPayPercent ?? 0);
    dto.coPayAmount = Number(entity.coPayAmount ?? 0);
    dto.patientPayable =
      entity.patientPayable != null ? Number(entity.patientPayable) : null;
    dto.panelPayable =
      entity.panelPayable != null ? Number(entity.panelPayable) : null;

    dto.taxAmount = Number(entity.taxAmount ?? 0);

    dto.totalAmount = Number(entity.totalAmount ?? 0);
    dto.netAmount = dto.totalAmount;
    dto.paidAmount = Number(entity.paidAmount ?? 0);
    dto.changeAmount = Number(entity.changeAmount ?? 0);
    dto.dueAmount = Number(entity.dueAmount ?? 0);

    dto.paymentStatus = entity.paymentStatus;
    dto.billStatus = entity.billStatus;
    dto.paymentMode = entity.paymentMode ?? null;
    dto.remarks = entity.remarks ?? null;

    dto.isInsurance = entity.isInsurance ?? false;
    dto.insuranceProvider = entity.insuranceProvider ?? null;
    dto.insurancePolicyNo = entity.insurancePolicyNo ?? null;
    dto.insuranceClaimed =
      entity.insuranceClaimed != null ? Number(entity.insuranceClaimed) : null;
    dto.insuranceApproved =
      entity.insuranceApproved != null
        ? Number(entity.insuranceApproved)
        : null;

    dto.generatedBy = entity.generatedBy ?? null;
    dto.billedAt = entity.billedAt;
    dto.createdAt = entity.createdAt ?? entity.billedAt;
    dto.paidAt = entity.paidAt ?? null;
    dto.cancelledAt = entity.cancelledAt ?? null;
    dto.cancelReason = entity.cancelReason ?? null;

    // Line items
    dto.items = (entity.items ?? []).map((it: any) =>
      BillItemResponseDto.fromEntity(it),
    );

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

    // Credit notes (V2)
    dto.creditNotes = (entity.creditNotes ?? []).map((cn: any) =>
      CreditNoteResponseDto.fromEntity(cn),
    );

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
