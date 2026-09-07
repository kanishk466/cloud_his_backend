import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { HospitalAuthUserRepository } from '../repositories/hospital-auth-user.repository/hospital-auth-user.repository';
import { AuthSecurityService, assertPasswordPolicy } from '../../../common/auth/auth-security.service';
import { SECURITY_FLAGS, securityFlag } from '../../../common/auth/security-config';
import { AuditService } from '../../../Platform/audit/audit.service';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TokenPayload {
  userId: string;
  code: string;
  email: string;
  userType: string;
  tenantId: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

@Injectable()
export class HospitalAuthService {
  private readonly logger = new Logger(HospitalAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly hospitalAuthUserRepository: HospitalAuthUserRepository,
    private readonly authSecurityService: AuthSecurityService,
    private readonly auditService: AuditService,
  ) {}

  /* ========================== LOGIN ========================== */

  async login(email: string, password: string) {
    const user =
      await this.hospitalAuthUserRepository.findByEmailWithHospital(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // --- Rate-limit check ---
    if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) {
      await this.authSecurityService.assertLoginAllowed(user.id, true);
    }

    // --- Status guards ---
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('User is inactive');
    if (user.hospital.status !== 'ACTIVE')
      throw new UnauthorizedException('Hospital is not active');
    if (user.accountValidTill && user.accountValidTill.getTime() < Date.now())
      throw new UnauthorizedException('Account expired');

    // --- Password check ---
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) {
        const result = await this.authSecurityService.recordFailedLogin(
          user.id,
          true,
        );
        if (result.lockedUntil)
          throw new UnauthorizedException('Account locked for 30 minutes');
        throw new UnauthorizedException(
          `Invalid credentials. ${5 - result.attempts} attempts remaining`,
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on success
    if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) {
      await this.authSecurityService.resetLoginAttempts(user.id, true);
    }

    // --- 2FA gate ---
    if (securityFlag(SECURITY_FLAGS.twoFactor)) {
      const roleNames = user.roles.map(
        (r) => r.hospitalRole.roleName.name.toLowerCase(),
      );
      const requires2fa =
        user.twoFactorEnabled ||
        roleNames.some((r) => r === 'admin' || r === 'doctor');

      if (requires2fa) {
        const otp = await this.authSecurityService.createOtp({
          hospitalUserId: user.id,
          email: user.email,
        });
        const otpToken = await this.jwtService.signAsync(
          { otpId: otp.id, purpose: 'login-otp' },
          {
            secret: process.env.JWT_ACCESS_SECRET!,
            expiresIn: '10m',
          },
        );
        // ⚠️ No tokens, no cookie — frontend shows OTP screen
        return { message: 'OTP sent', otpToken, userId: user.id };
      }
    }

    // --- Issue tokens ---
    return this.issueTokensForUser(user);
  }

  /* ======================== VERIFY OTP ======================== */

  async verifyOtp(otpToken: string, code: string) {
    // 1. Verify the short-lived OTP JWT
    let payload: { otpId: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(otpToken, {
        secret: process.env.JWT_ACCESS_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('OTP token expired or invalid');
    }

    if (payload.purpose !== 'login-otp')
      throw new UnauthorizedException('Invalid OTP token purpose');

    // 2. Verify the actual OTP code (rate-limited inside AuthSecurityService)
    const otp = await this.authSecurityService.verifyOtp(
      payload.otpId,
      code,
    );

    // 3. Fetch full user (with hospital!) — findById now includes hospital
    const user = await this.hospitalAuthUserRepository.findById(
      otp.hospitalUserId!,
    );
    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedException('User not found or inactive');

    // 4. Issue tokens (same shape as login)
    return this.issueTokensForUser(user);
  }

  /* ========================= REFRESH ========================= */

  async refresh(refreshToken: string): Promise<TokenPair> {
    // 1. Verify JWT signature & expiry
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    // 2. Fetch user
    const user = await this.hospitalAuthUserRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // 3. Re-check status (user may have been deactivated since last login)
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('User is inactive');
    if (user.hospital?.status !== 'ACTIVE')
      throw new UnauthorizedException('Hospital is not active');
    if (user.accountValidTill && user.accountValidTill.getTime() < Date.now())
      throw new UnauthorizedException('Account expired');

    // 4. Compare stored hash (rotation reuse detection)
    if (!user.refreshTokenHash)
      throw new UnauthorizedException('Refresh token revoked');

    const hashMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!hashMatch) {
      // 🔒 REUSE DETECTION — someone is replaying an old token → nuke all sessions
      this.logger.warn(
        `Refresh token reuse detected for user ${user.id}. Revoking all sessions.`,
      );
      await this.hospitalAuthUserRepository.setRefreshTokenHash(
        user.id,
        null,
      );
      throw new UnauthorizedException('Token reuse detected — all sessions revoked');
    }

    // 5. Session check
    if (securityFlag(SECURITY_FLAGS.sessionManagement)) {
      await this.authSecurityService.assertActiveSession(payload.sessionId);
    }

    // 6. Rotate
    const tokens = await this.generateTokens(
      {
        userId: user.id,
        code: user.hospital?.code ?? payload.code,
        email: user.email,
        userType: user.userType,
        tenantId: user.tenantId ?? payload.tenantId,
      },
      payload.sessionId,
    );

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.hospitalAuthUserRepository.setRefreshTokenHash(
      user.id,
      refreshHash,
    );

    return tokens;
  }

  /* ========================= LOGOUT ========================== */

  async logout(refreshToken?: string) {
    if (!refreshToken) return { message: 'Logged out successfully' };

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });

      if (securityFlag(SECURITY_FLAGS.sessionManagement)) {
        await this.authSecurityService.deactivateSession(payload.sessionId);
      }

      await this.hospitalAuthUserRepository.setRefreshTokenHash(
        payload.sub,
        null,
      );
    } catch {
      // Token already invalid — nothing to revoke
    }

    return { message: 'Logged out successfully' };
  }

  /* ==================== CHANGE PASSWORD ====================== */

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.hospitalAuthUserRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Old password is incorrect');

    if (securityFlag(SECURITY_FLAGS.passwordPolicy)) {
      assertPasswordPolicy(newPassword);
    }

    // Prevent reusing the same password
    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword)
      throw new BadRequestException(
        'New password must be different from the current password',
      );

    const passwordHash = await bcrypt.hash(newPassword, 12); // bump cost factor
    await this.hospitalAuthUserRepository.updatePassword(userId, passwordHash);
    // ↑ updatePassword now also sets refreshTokenHash = null → forces re-login everywhere

    await this.auditService.log({
      action: 'AUTH_PASSWORD_CHANGED',
      actorId: userId,
      actorEmail: user.email,
      tenantId: user.tenantId,
      targetType: 'HospitalUser',
      targetName: user.email,
      detail: 'Password changed via profile settings',
    });

    return { message: 'Password changed successfully' };
  }

  /* ==================== FORGOT PASSWORD ====================== */

  /**
   * Step 1: User submits email → system generates a reset token.
   * In production, email the token via your mail service.
   * Returns a generic message regardless of whether the email exists
   * to prevent user-enumeration attacks.
   */
  async forgotPassword(email: string) {
    const user =
      await this.hospitalAuthUserRepository.findActiveByEmail(email);

    if (user) {
      const resetToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: 'password-reset' },
        {
          secret: process.env.JWT_RESET_SECRET ?? process.env.JWT_ACCESS_SECRET!,
          expiresIn: '30m',
        },
      );

      // TODO: Replace with actual email dispatch
      // await this.mailService.sendPasswordReset(user.email, resetToken);
      this.logger.log(
        `[DEV] Password reset token for ${user.email}: ${resetToken}`,
      );
    }

    // Always return the same message (prevents email enumeration)
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Step 2: User submits reset token + new password.
   */
  async resetPassword(resetToken: string, newPassword: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(resetToken, {
        secret: process.env.JWT_RESET_SECRET ?? process.env.JWT_ACCESS_SECRET!,
      });
    } catch {
      throw new BadRequestException('Reset token expired or invalid');
    }

    if (payload.purpose !== 'password-reset')
      throw new BadRequestException('Invalid reset token');

    if (securityFlag(SECURITY_FLAGS.passwordPolicy)) {
      assertPasswordPolicy(newPassword);
    }

    const user = await this.hospitalAuthUserRepository.findById(payload.sub);
    if (!user) throw new BadRequestException('User not found');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.hospitalAuthUserRepository.updatePassword(user.id, passwordHash);
    // ↑ also clears refreshTokenHash → all sessions invalidated

    await this.auditService.log({
      action: 'AUTH_PASSWORD_RESET',
      actorId: user.id,
      actorEmail: user.email,
      tenantId: user.tenantId,
      targetType: 'HospitalUser',
      targetName: user.email,
      detail: 'Password reset via forgot-password flow',
    });

    return { message: 'Password reset successfully. Please log in.' };
  }

  /* ==================== PRIVATE HELPERS ====================== */

  /**
   * Shared logic for login() and verifyOtp() — guarantees
   * identical response shape and cookie-worthy refreshToken.
   */
  private async issueTokensForUser(user: any) {
    const session = securityFlag(SECURITY_FLAGS.sessionManagement)
      ? await this.authSecurityService.createSession({
          hospitalUserId: user.id,
        })
      : undefined;

    const tokens = await this.generateTokens(
      {
        userId: user.id,
        code: user.hospital.code,
        email: user.email,
        userType: user.userType,
        tenantId: user.tenantId,
      },
      session?.id,
    );

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.hospitalAuthUserRepository.setRefreshTokenHash(
      user.id,
      refreshHash,
    );

    await this.auditService.log({
      action: 'AUTH_LOGIN_SUCCEEDED',
      actorId: user.id,
      actorEmail: user.email,
      tenantId: user.tenantId,
      targetType: 'HospitalUser',
      targetName: user.email,
      detail: 'Hospital login succeeded',
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      forcePasswordChange: user.forcePasswordChange,
      hospital: {
        id: user.hospital.id,
        code: user.hospital.code,
        name: user.hospital.name,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        doctorProfileId: user.doctorProfile?.id ?? null,
      },
    };
  }

  private async generateTokens(
    input: TokenPayload,
    sessionId?: string,
  ): Promise<TokenPair> {
    const payload = {
      sub: input.userId,
      code: input.code,
      email: input.email,
      userType: input.userType,
      tenantId: input.tenantId,
      aud: 'hospital',
      ...(sessionId ? { sessionId } : {}),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }
}