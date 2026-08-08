export const QUEUE_ERRORS = {
  TOKEN_NOT_FOUND: {
    code: 'OPD_QUE_001',
    message: 'Token not found',
  },
  APPOINTMENT_NOT_FOUND: {
    code: 'OPD_QUE_002',
    message: 'Appointment not found',
  },
  TOKEN_ALREADY_EXISTS: {
    code: 'OPD_QUE_003',
    message: 'Token already generated for this appointment',
  },
  INVALID_APPOINTMENT_STATUS: {
    code: 'OPD_QUE_004',
    message: 'Appointment must be CHECKED_IN or BOOKED to generate token',
  },
  CANNOT_CALL: {
    code: 'OPD_QUE_005',
    message: 'Only WAITING tokens can be called',
  },
  CANNOT_SKIP: {
    code: 'OPD_QUE_006',
    message: 'Only WAITING or IN_PROGRESS tokens can be skipped',
  },
  CANNOT_COMPLETE: {
    code: 'OPD_QUE_007',
    message: 'Only IN_PROGRESS tokens can be completed',
  },
  CANNOT_CANCEL: {
    code: 'OPD_QUE_008',
    message: 'Only WAITING or IN_PROGRESS tokens can be cancelled',
  },
  ANOTHER_IN_PROGRESS: {
    code: 'OPD_QUE_009',
    message: 'Another patient is currently in consultation with this doctor',
  },
  CROSS_TENANT: {
    code: 'OPD_QUE_010',
    message: 'Cross-tenant access not allowed',
  },
  DOCTOR_NOT_FOUND: {
    code: 'OPD_QUE_011',
    message: 'Doctor profile not found',
  },
} as const;

// Token can be generated for these appointment statuses
export const TOKEN_ELIGIBLE_STATUSES = ['BOOKED', 'CHECKED_IN'] as const;

// Token can be called for these statuses
export const CALLABLE_STATUSES = ['WAITING'] as const;

// Token can be skipped for these statuses
export const SKIPPABLE_STATUSES = ['WAITING', 'IN_PROGRESS'] as const;

// Token can be completed for these statuses
export const COMPLETABLE_STATUSES = ['IN_PROGRESS'] as const;

// Token can be cancelled for these statuses
export const CANCELLABLE_STATUSES = ['WAITING', 'IN_PROGRESS'] as const;