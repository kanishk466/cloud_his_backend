export const VITALS_ERRORS = {
  NOT_FOUND: {
    code: 'OPD_VIT_001',
    message: 'Vitals record not found',
  },
  PATIENT_NOT_FOUND: {
    code: 'OPD_VIT_002',
    message: 'Patient not found',
  },
  APPOINTMENT_NOT_FOUND: {
    code: 'OPD_VIT_003',
    message: 'Appointment not found',
  },
  APPOINTMENT_NOT_ACTIVE: {
    code: 'OPD_VIT_004',
    message: 'Vitals can only be recorded for active appointments (CHECKED_IN / IN_QUEUE / IN_CONSULTATION)',
  },
  CROSS_TENANT: {
    code: 'OPD_VIT_005',
    message: 'Cross-tenant access not allowed',
  },
} as const;

// Appointment statuses where vitals can be recorded
export const VITALS_ELIGIBLE_STATUSES = [
  'CHECKED_IN',
  'IN_QUEUE',
  'IN_CONSULTATION',
] as const;

// Normal vitals ranges (for flagging abnormal values in UI)
export const VITALS_NORMAL_RANGES = {
  temperatureF: { min: 97.0, max: 99.5 },
  bloodPressureSys: { min: 90, max: 140 },
  bloodPressureDia: { min: 60, max: 90 },
  pulseRate: { min: 60, max: 100 },
  respiratoryRate: { min: 12, max: 20 },
  spo2: { min: 95.0, max: 100.0 },
  bloodSugarFasting: { min: 70, max: 110 },
  bloodSugarPP: { min: 70, max: 140 },
  bloodSugarRandom: { min: 70, max: 200 },
  bmi: { min: 18.5, max: 24.9 },
} as const;