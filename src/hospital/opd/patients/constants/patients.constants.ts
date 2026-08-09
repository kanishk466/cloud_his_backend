// Error codes for Patient module
export const PATIENT_ERRORS = {
  ALREADY_EXISTS: {
    code: 'OPD_001',
    message: 'Patient already registered with this mobile number',
  },
  NOT_FOUND: {
    code: 'OPD_002',
    message: 'Patient not found',
  },
  UHID_GENERATION_FAILED: {
    code: 'OPD_003',
    message: 'Failed to generate UHID. Please try again.',
  },
  INVALID_TENANT: {
    code: 'OPD_004',
    message: 'Cross-tenant access not allowed',
  },
} as const;

// UHID Configuration
export const UHID_CONFIG = {
  PREFIX: 'PT',
  SEQUENCE_LENGTH: 6, // PT-2025-000001
  YEARLY_RESET: true, // Reset sequence each year
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;