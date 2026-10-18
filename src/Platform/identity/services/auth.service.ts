import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
// === SECURITY ADDITION START ===
import { AuthSecurityService } from '../../../common/auth/auth-security.service';
import { SECURITY_FLAGS, securityFlag } from '../../../common/auth/security-config';
// === SECURITY ADDITION END ===
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    // === SECURITY ADDITION START ===
    private readonly authSecurityService: AuthSecurityService,
    // === SECURITY ADDITION END ===
    private readonly auditService: AuditService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) {
      await this.authSecurityService.assertLoginAllowed(user.id, false);
    }
    // === SECURITY ADDITION END ===

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      // === SECURITY ADDITION START ===
      if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) {
        const result = await this.authSecurityService.recordFailedLogin(user.id, false);
        if (result.lockedUntil) {
          throw new UnauthorizedException('Account locked. Locked for 30 min');
        }
        throw new UnauthorizedException(`Invalid credentials. ${5 - result.attempts} attempts left`);
      }
      // === SECURITY ADDITION END ===
      throw new UnauthorizedException('Invalid credentials');
    }

    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) {
      await this.authSecurityService.resetLoginAttempts(user.id, false);
    }
    if (securityFlag(SECURITY_FLAGS.twoFactor) && ['SUPER_ADMIN'].includes(user.role)) {
      const otp = await this.authSecurityService.createOtpHospital({ platformUserId: user.id, email: user.email, purpose: 'login' });
      const otpToken = await this.jwtService.signAsync({ otpId: otp.id, purpose: 'login-otp' }, { secret: process.env.JWT_ACCESS_SECRET!, expiresIn: '10m' });
      return { message: 'OTP sent', otpToken, userId: user.id };
    }
    const session = securityFlag(SECURITY_FLAGS.sessionManagement)
      ? await this.authSecurityService.createSession({ platformUserId: user.id })
      : undefined;
    // === SECURITY ADDITION END ===

    const tokens = await this.generateTokens(user, session?.id);

    await this.auditService.log({
      action: 'AUTH_LOGIN_SUCCEEDED',
      actorId: user.id,
      actorEmail: user.email,
      targetType: 'PlatformUser',
      targetName: user.email,
      detail: 'Platform login succeeded',
    });

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return tokens;
  }

  // === SECURITY ADDITION START ===
  async verifyOtp(otpToken: string, code: string) {
    const payload = await this.jwtService.verifyAsync(otpToken, { secret: process.env.JWT_ACCESS_SECRET! });

    // SECURITY: purpose binding — an access/refresh/reset JWT must never
    // satisfy an OTP challenge.
    if ((payload as { purpose?: string }).purpose !== 'login-otp') {
      throw new UnauthorizedException('Invalid OTP token');
    }

    const otp = await this.authSecurityService.verifyOtp(payload.otpId, code);
    const user = await this.userRepository.findById(otp.platformUserId!);
    if (!user) throw new UnauthorizedException('Invalid OTP user');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is inactive');
    const session = securityFlag(SECURITY_FLAGS.sessionManagement)
      ? await this.authSecurityService.createSession({ platformUserId: user.id })
      : undefined;
    const tokens = await this.generateTokens(user, session?.id);
    await this.auditService.log({
      action: 'AUTH_OTP_VERIFIED',
      actorId: user.id,
      actorEmail: user.email,
      targetType: 'PlatformUser',
      targetName: user.email,
      detail: 'Platform login OTP verified',
    });
    await this.refreshTokenRepository.create({ userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    // SECURITY: never leak passwordHash / account-lock internals to API responses.
    const { passwordHash, failedLoginAttempts, lockedUntil, ...safeUser } = user;
    void passwordHash; void failedLoginAttempts; void lockedUntil;
    return { ...tokens, user: safeUser };
  }
  // === SECURITY ADDITION END ===

  private async generateTokens(user: any, sessionId?: string) {
    // 1. "user.roles" ab Prisma schema mein nahi hai, 
    // Isliye hum yahan hardcoded role denge kyunki platform admin ek hi hai.
    const roles = ['PLATFORM_ADMIN']; 

    const payload = {
      sub: user.id,
      email: user.email,
      roles: roles,
      // Real column now exists on PlatformUser; added alongside the legacy
      // hardcoded `roles` claim so existing consumers keep working.
      role: user.role ?? 'PLATFORM_ADMIN',
      userType: 'platform', // Ye future mein Hospital User se distinguish karne mein kaam aayega
      // === SECURITY ADDITION START ===
      ...(sessionId ? { sessionId } : {}),
      // === SECURITY ADDITION END ===
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    // 1. Verify signature first (cheap) so we know whose token it claims to be.
    let payload: { sub?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Rotation + reuse detection: the stored row is the single live copy.
    //    A cryptographically valid JWT with NO stored row means the token was
    //    already consumed (rotated) and is being replayed → revoke everything.
    const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);

    if (!storedToken) {
      if (payload.sub) {
        await this.refreshTokenRepository.revokeAllForUser(payload.sub);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 3. Account status check (an INACTIVE user cannot refresh a session).
    const user = storedToken.user;
    if (!user || user.status !== 'ACTIVE') {
      await this.refreshTokenRepository.delete(refreshToken);
      throw new UnauthorizedException('Account is inactive');
    }

    // 4. Consume the old token and issue a fresh pair (rotation).
    const tokens = await this.generateTokens(user);
    await this.refreshTokenRepository.delete(refreshToken);
    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.refreshTokenRepository.delete(refreshToken);

    return {
      message: 'Logged out successfully',
    };
  }
}