export const DOCTOR_ERRORS = {
  USER_NOT_FOUND: {
    code: 'OPD_DOC_001',
    message: 'Hospital user not found',
  },
  PROFILE_ALREADY_EXISTS: {
    code: 'OPD_DOC_002',
    message: 'Doctor profile already exists for this user',
  },
  PROFILE_NOT_FOUND: {
    code: 'OPD_DOC_003',
    message: 'Doctor profile not found',
  },
  INVALID_TIME_RANGE: {
    code: 'OPD_DOC_004',
    message: 'endTime must be after startTime',
  },
  INVALID_BREAK_TIME: {
    code: 'OPD_DOC_005',
    message: 'Break time must be within working hours',
  },
  LEAVE_NOT_FOUND: {
    code: 'OPD_DOC_006',
    message: 'Leave block not found',
  },
  PAST_LEAVE_DATE: {
    code: 'OPD_DOC_007',
    message: 'Cannot create leave for past dates',
  },
  DUPLICATE_LEAVE: {
    code: 'OPD_DOC_008',
    message: 'Leave already exists for this date',
  },
  CROSS_TENANT: {
    code: 'OPD_DOC_009',
    message: 'Cross-tenant access not allowed',
  },
} as const;

// Day of week mapping
export const DAY_OF_WEEK_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
} as const;

// Reverse mapping for DTO input
export const DAY_STRING_TO_NUMBER: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;