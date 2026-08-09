export const APPOINTMENT_ERRORS = {
  NOT_FOUND: {
    code: 'OPD_APT_001',
    message: 'Appointment not found',
  },
  PATIENT_NOT_FOUND: {
    code: 'OPD_APT_002',
    message: 'Patient not found',
  },
  DOCTOR_NOT_FOUND: {
    code: 'OPD_APT_003',
    message: 'Doctor profile not found or inactive',
  },
  DOCTOR_NOT_AVAILABLE: {
    code: 'OPD_APT_004',
    message: 'Doctor is not available on the requested date',
  },
  SLOT_ALREADY_BOOKED: {
    code: 'OPD_APT_005',
    message: 'Selected time slot is already booked',
  },
  MAX_PATIENTS_REACHED: {
    code: 'OPD_APT_006',
    message: 'Doctor has reached maximum patients limit for the day',
  },
  DOCTOR_ON_LEAVE: {
    code: 'OPD_APT_007',
    message: 'Doctor is on leave for the requested date or time',
  },
  CANNOT_CANCEL: {
    code: 'OPD_APT_008',
    message: 'Appointment cannot be cancelled in current status',
  },
  CANNOT_CHECKIN: {
    code: 'OPD_APT_009',
    message: 'Patient can only be checked in for BOOKED appointments',
  },
  PAST_DATE: {
    code: 'OPD_APT_010',
    message: 'Cannot book appointment for a past date',
  },
  INVALID_SLOT_TIME: {
    code: 'OPD_APT_011',
    message: 'Slot time does not fall within doctor availability',
  },
  DEPARTMENT_NOT_FOUND: {
    code: 'OPD_APT_012',
    message: 'Department not found',
  },
  CROSS_TENANT: {
    code: 'OPD_APT_013',
    message: 'Cross-tenant access not allowed',
  },
} as const;

// Appointment number format: APT-{YYYYMMDD}-{0001}
export const APPOINTMENT_NO_CONFIG = {
  PREFIX: 'APT',
  SEQUENCE_LENGTH: 4, // APT-20250610-0001
  RESETS: 'daily',   // Resets every day
} as const;

// Cancellable statuses
export const CANCELLABLE_STATUSES = [
  'BOOKED',
  'CHECKED_IN',
] as const;

// How many days in advance can appointment be booked
export const MAX_ADVANCE_BOOKING_DAYS = 30;

// Day of week mapping
export const DAY_OF_WEEK: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
} as const;