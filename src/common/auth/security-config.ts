// === SECURITY ADDITION START ===
export function securityFlag(name: string): boolean {
  return process.env[name]?.toLowerCase() === 'true';
}

export const SECURITY_FLAGS = {
  loginAttemptLimit: 'SECURITY_LOGIN_ATTEMPT_LIMIT_ENABLED',
  sessionManagement: 'SECURITY_SESSION_MANAGEMENT_ENABLED',
  twoFactor: 'SECURITY_2FA_ENABLED',
  passwordPolicy: 'SECURITY_PASSWORD_POLICY_ENABLED',
} as const;
// === SECURITY ADDITION END ===