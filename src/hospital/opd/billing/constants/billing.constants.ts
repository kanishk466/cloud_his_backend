export const BILLING_ERRORS = {
  BILL_NOT_FOUND: {
    code: 'OPD_BIL_001',
    message: 'Bill not found',
  },
  APPOINTMENT_NOT_FOUND: {
    code: 'OPD_BIL_002',
    message: 'Appointment not found',
  },
  BILL_ALREADY_EXISTS: {
    code: 'OPD_BIL_003',
    message: 'Bill already generated for this appointment',
  },
  BILL_NOT_GENERATED: {
    code: 'OPD_BIL_004',
    message: 'Bill must be in GENERATED status to collect payment',
  },
  PAYMENT_EXCEEDS_DUE: {
    code: 'OPD_BIL_005',
    message: 'Payment amount exceeds due amount',
  },
  BILL_ALREADY_PAID: {
    code: 'OPD_BIL_006',
    message: 'Bill is already fully paid',
  },
  CANNOT_CANCEL: {
    code: 'OPD_BIL_007',
    message: 'Only DRAFT or GENERATED bills can be cancelled',
  },
  CANNOT_CANCEL_PAID: {
    code: 'OPD_BIL_008',
    message: 'Cannot cancel a bill with payments. Refund first.',
  },
  PATIENT_NOT_FOUND: {
    code: 'OPD_BIL_009',
    message: 'Patient not found',
  },
  CROSS_TENANT: {
    code: 'OPD_BIL_010',
    message: 'Cross-tenant access not allowed',
  },
  INVALID_DISCOUNT: {
    code: 'OPD_BIL_011',
    message: 'Discount cannot exceed subtotal amount',
  },
} as const;

// ─── PHASE 2.1B: Bill-line service validation errors ─────────────────────────
export const SERVICE_VALIDATION_ERRORS = {
  SERVICE_NOT_FOUND: {
    code: 'SERVICE_NOT_FOUND',
    message: 'Service not found or is not active',
  },
  SERVICE_GENDER_MISMATCH: {
    code: 'SERVICE_GENDER_MISMATCH',
    message: 'This service is restricted for patients of a specific gender',
  },
  SERVICE_AGE_MISMATCH: {
    code: 'SERVICE_AGE_MISMATCH',
    message: 'This service is not applicable for the patient age',
  },
  RATE_NOT_EDITABLE: {
    code: 'RATE_NOT_EDITABLE',
    message: 'Rate for this service is fixed and cannot be modified',
  },
  SERVICE_NOT_DISCOUNTABLE: {
    code: 'SERVICE_NOT_DISCOUNTABLE',
    message: 'Discount is not allowed on this service',
  },
} as const;

export const BILL_NO_CONFIG = {
  PREFIX: 'BILL',
  SEQUENCE_LENGTH: 4,
} as const;

export const RECEIPT_NO_CONFIG = {
  PREFIX: 'RCP',
  SEQUENCE_LENGTH: 4,
} as const;

// Bills that can receive payment
export const PAYABLE_STATUSES = ['GENERATED', 'PARTIALLY_PAID'] as const;

// Bills that can be cancelled
export const CANCELLABLE_STATUSES = ['DRAFT', 'GENERATED'] as const;
