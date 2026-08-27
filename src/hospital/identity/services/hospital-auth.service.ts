import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { HospitalLookupRepository } from '../repositories/hospital-lookup.repository/hospital-lookup.repository';
import { HospitalAuthUserRepository } from '../repositories/hospital-auth-user.repository/hospital-auth-user.repository';
// === SECURITY ADDITION START ===
import { AuthSecurityService, assertPasswordPolicy } from '../../../common/auth/auth-security.service';
import { SECURITY_FLAGS, securityFlag } from '../../../common/auth/security-config';
// === SECURITY ADDITION END ===
import { AuditService } from '../../../Platform/audit/audit.service';

@Injectable()
export class HospitalAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly hospitalLookupRepository: HospitalLookupRepository,
    private readonly hospitalAuthUserRepository: HospitalAuthUserRepository,
    // === SECURITY ADDITION START ===
    private readonly authSecurityService: AuthSecurityService,
    // === SECURITY ADDITION END ===
    private readonly auditService: AuditService,
  ) {}

  // async login(hospitalCode: string, email: string, password: string) {
  //   const hospital = await this.hospitalLookupRepository.findByCode(hospitalCode);
  //   if (!hospital) throw new UnauthorizedException('Invalid credentials');
  //   if (hospital.status !== 'ACTIVE') throw new UnauthorizedException('Hospital is not active');

  //   const user = await this.hospitalAuthUserRepository.findByHospitalAndEmail(hospital.id, email);
  //   if (!user) throw new UnauthorizedException('Invalid credentials');
  //   if (user.status !== 'ACTIVE') throw new UnauthorizedException('User is inactive');
  //   if (user.accountValidTill && user.accountValidTill.getTime() < Date.now()) {
  //     throw new UnauthorizedException('Account expired');
  //   }

  //   const ok = await bcrypt.compare(password, user.passwordHash);
  //   if (!ok) throw new UnauthorizedException('Invalid credentials');

  //   const tokens = await this.generateTokens({
  //     userId: user.id,
  //     hospitalId: hospital.id,
  //     email: user.email,
  //     userType: user.userType,
  //   });

  //   // store refreshTokenHash (single session approach)
  //   const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  //   await this.hospitalAuthUserRepository.setRefreshTokenHash(user.id, refreshHash);

  //   return {
  //     accessToken: tokens.accessToken,
  //     refreshToken: tokens.refreshToken,
  //     forcePasswordChange: user.forcePasswordChange,
  //   };
  // }

  async login(email: string, password: string) {
    const user =
      await this.hospitalAuthUserRepository.findByEmailWithHospital(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) await this.authSecurityService.assertLoginAllowed(user.id, true);
    // === SECURITY ADDITION END ===

    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('User is inactive');
    if (user.hospital.status !== 'ACTIVE')
      throw new UnauthorizedException('Hospital is not active');
    if (user.accountValidTill && user.accountValidTill.getTime() < Date.now()) {
      throw new UnauthorizedException('Account expired');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      // === SECURITY ADDITION START ===
      if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) {
        const result = await this.authSecurityService.recordFailedLogin(user.id, true);
        if (result.lockedUntil) throw new UnauthorizedException('Account locked. Locked for 30 min');
        throw new UnauthorizedException(`Invalid credentials. ${5 - result.attempts} attempts left`);
      }
      // === SECURITY ADDITION END ===
      throw new UnauthorizedException('Invalid credentials');
    }

    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.loginAttemptLimit)) await this.authSecurityService.resetLoginAttempts(user.id, true);
    const roleNames = user.roles.map((assignment) => assignment.hospitalRole.roleName.name.toLowerCase());
    if (securityFlag(SECURITY_FLAGS.twoFactor) && (user.twoFactorEnabled || roleNames.some((role) => role === 'admin' || role === 'doctor'))) {
      const otp = await this.authSecurityService.createOtp({ hospitalUserId: user.id, email: user.email });
      const otpToken = await this.jwtService.signAsync({ otpId: otp.id, purpose: 'login-otp' }, { secret: process.env.JWT_ACCESS_SECRET!, expiresIn: '10m' });
      return { message: 'OTP sent', otpToken, userId: user.id };
    }
    const session = securityFlag(SECURITY_FLAGS.sessionManagement) ? await this.authSecurityService.createSession({ hospitalUserId: user.id }) : undefined;
    // === SECURITY ADDITION END ===

    const tokens = await this.generateTokens({
      userId: user.id,
      code: user.hospital.code,
      email: user.email,
      userType: user.userType,
      tenantId: user.tenantId,
    }, session?.id);

    await this.auditService.log({
      action: 'AUTH_LOGIN_SUCCEEDED',
      actorId: user.id,
      actorEmail: user.email,
      tenantId: user.tenantId,
      targetType: 'HospitalUser',
      targetName: user.email,
      detail: 'Hospital login succeeded',
    });

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.hospitalAuthUserRepository.setRefreshTokenHash(
      user.id,
      refreshHash,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
        userType: user.userType, // SUPER_ADMIN | REGULAR_USER — used by frontend for basic RBAC bypass/full menu
      },
    };
  }

  // === SECURITY ADDITION START ===
  async verifyOtp(otpToken: string, code: string) {
    const payload = await this.jwtService.verifyAsync(otpToken, { secret: process.env.JWT_ACCESS_SECRET! });
    if (payload.purpose !== 'login-otp') throw new UnauthorizedException('Invalid OTP token');
    const otp = await this.authSecurityService.verifyOtp(payload.otpId, code);
    const user = await this.hospitalAuthUserRepository.findById(otp.hospitalUserId!);
    if (!user) throw new UnauthorizedException('Invalid OTP user');
    const session = securityFlag(SECURITY_FLAGS.sessionManagement) ? await this.authSecurityService.createSession({ hospitalUserId: user.id }) : undefined;
    const tokens = await this.generateTokens({ userId: user.id, code: '', email: user.email, userType: user.userType, tenantId: user.tenantId }, session?.id);
    await this.auditService.log({
      action: 'AUTH_OTP_VERIFIED',
      actorId: user.id,
      actorEmail: user.email,
      tenantId: user.tenantId,
      targetType: 'HospitalUser',
      targetName: user.email,
      detail: 'Hospital login OTP verified',
    });
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.hospitalAuthUserRepository.setRefreshTokenHash(user.id, refreshHash);
    return { ...tokens, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, userType: user.userType } };
  }
  // === SECURITY ADDITION END ===

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET!,
    });

    const user = await this.hospitalAuthUserRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    if (!user.refreshTokenHash)
      throw new UnauthorizedException('Invalid refresh token');

    const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!match) throw new UnauthorizedException('Invalid refresh token');

    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.sessionManagement)) await this.authSecurityService.assertActiveSession(payload.sessionId);
    // === SECURITY ADDITION END ===
    const tokens = await this.generateTokens({
      userId: user.id,
      code: payload.code,
      email: user.email,
      userType: user.userType,
      tenantId: payload.tenantId,
    }, payload.sessionId);

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.hospitalAuthUserRepository.setRefreshTokenHash(
      user.id,
      refreshHash,
    );

    return tokens;
  }

  async logout(refreshToken: string) {
    // best-effort: verify and clear refresh token hash
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
      // === SECURITY ADDITION START ===
      if (securityFlag(SECURITY_FLAGS.sessionManagement)) await this.authSecurityService.deactivateSession(payload.sessionId);
      // === SECURITY ADDITION END ===
      await this.hospitalAuthUserRepository.setRefreshTokenHash(
        payload.sub,
        null,
      );
    } catch {
      // ignore
    }

    return { message: 'Logged out successfully' };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.hospitalAuthUserRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Old password incorrect');

    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.passwordPolicy)) assertPasswordPolicy(newPassword);
    // === SECURITY ADDITION END ===
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.hospitalAuthUserRepository.updatePassword(userId, passwordHash);

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(input: {
    userId: string;
    code: string;
    email: string;
    userType: any;
    tenantId: string;
  }, sessionId?: string) {
    const payload = {
      sub: input.userId,
      code: input.code,
      email: input.email,
      userType: input.userType,
      tenantId: input.tenantId,
      aud: 'hospital',
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

    return { accessToken, refreshToken };
  }
}
