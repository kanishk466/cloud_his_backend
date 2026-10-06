export enum ThresholdCheckResult {
  OK = 'OK',
  WARNING = 'WARNING',
  BLOCKED = 'BLOCKED',
}

export const THRESHOLD_ERRORS = {
  NOT_FOUND: { code: 'THRESHOLD_001', message: 'Threshold limit not found' },
  CROSS_TENANT: { code: 'THRESHOLD_002', message: 'Cross-tenant access denied' },
};
