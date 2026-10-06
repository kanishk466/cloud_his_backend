import { BedCurrentStatus } from '@prisma/client';

/**
 * Allowed bed status transitions (state machine).
 * Any transition not listed here is rejected.
 *
 *  VACANT      → OCCUPIED | CLEANING | RESERVED | MAINTENANCE
 *  RESERVED    → OCCUPIED | VACANT
 *  OCCUPIED    → CLEANING
 *  CLEANING    → VACANT | MAINTENANCE
 *  MAINTENANCE → VACANT
 */
export const BED_STATUS_TRANSITIONS: Record<BedCurrentStatus, BedCurrentStatus[]> = {
  VACANT: ['OCCUPIED', 'CLEANING', 'RESERVED', 'MAINTENANCE'],
  RESERVED: ['OCCUPIED', 'VACANT'],
  OCCUPIED: ['CLEANING'],
  CLEANING: ['VACANT', 'MAINTENANCE'],
  MAINTENANCE: ['VACANT'],
};

export const BED_STATUS_ERRORS = {
  NOT_FOUND: { code: 'BED_STATUS_001', message: 'Bed status not found' },
  CROSS_TENANT: { code: 'BED_STATUS_002', message: 'Cross-tenant access denied' },
  INVALID_TRANSITION: { code: 'BED_STATUS_003', message: 'Invalid bed status transition' },
  PATIENT_REQUIRED: {
    code: 'BED_STATUS_004',
    message: 'patientId is required when marking a bed OCCUPIED',
  },
};
