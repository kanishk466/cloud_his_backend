export const CONSULTATION_ERRORS = {
  NOT_FOUND: {
    code: 'OPD_CON_001',
    message: 'Consultation not found',
  },
  APPOINTMENT_NOT_FOUND: {
    code: 'OPD_CON_002',
    message: 'Appointment not found',
  },
  ALREADY_EXISTS: {
    code: 'OPD_CON_003',
    message: 'Consultation already exists for this appointment',
  },
  INVALID_APPOINTMENT_STATUS: {
    code: 'OPD_CON_004',
    message: 'Appointment must be IN_CONSULTATION to start consultation',
  },
  NOT_IN_PROGRESS: {
    code: 'OPD_CON_005',
    message: 'Consultation is not in IN_PROGRESS status',
  },
  ALREADY_COMPLETED: {
    code: 'OPD_CON_006',
    message: 'Consultation is already completed',
  },
  DIAGNOSIS_REQUIRED: {
    code: 'OPD_CON_007',
    message: 'At least provisional or final diagnosis is required to complete',
  },
  PRESCRIPTION_NOT_FOUND: {
    code: 'OPD_CON_008',
    message: 'Prescription item not found',
  },
  INVESTIGATION_NOT_FOUND: {
    code: 'OPD_CON_009',
    message: 'Investigation order not found',
  },
  CROSS_TENANT: {
    code: 'OPD_CON_010',
    message: 'Cross-tenant access not allowed',
  },
} as const;

export const CONSULTATION_NO_CONFIG = {
  PREFIX: 'CON',
  SEQUENCE_LENGTH: 4,
  RESETS: 'daily',
} as const;

export const CONSULTATION_ELIGIBLE_STATUSES = [
  'IN_CONSULTATION',
  'IN_QUEUE',
] as const;