import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { HospitalLookupRepository } from '../repositories/hospital-lookup.repository/hospital-lookup.repository';
import { HospitalAuthUserRepository } from '../repositories/hospital-auth-user.repository/hospital-auth-user.repository';

@Injectable()
export class HospitalAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly hospitalLookupRepository: HospitalLookupRepository,
    private readonly hospitalAuthUserRepository: HospitalAuthUserRepository,
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

    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('User is inactive');
    if (user.hospital.status !== 'ACTIVE')
      throw new UnauthorizedException('Hospital is not active');
    if (user.accountValidTill && user.accountValidTill.getTime() < Date.now()) {
      throw new UnauthorizedException('Account expired');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens({
      userId: user.id,
      code: user.hospital.code,
      email: user.email,
      userType: user.userType,
      tenantId: user.tenantId,
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

    const tokens = await this.generateTokens({
      userId: user.id,
      code: payload.code,
      email: user.email,
      userType: user.userType,
      tenantId: payload.tenantId,
    });

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
  }) {
    const payload = {
      sub: input.userId,
      code: input.code,
      email: input.email,
      userType: input.userType,
      tenantId: input.tenantId,
      aud: 'hospital',
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
