// src/hospital/identity/repositories/hospital-auth-user.repository/hospital-auth-user.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalAuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full user lookup with hospital, roles and doctor profile.
   * Used by login().
   */
  findByEmailWithHospital(email: string) {
    return this.prisma.hospitalUser.findFirst({
      where: { email },
      include: {
        hospital: {
          select: { id: true, code: true, name: true, status: true },
        },
        roles: {
          include: {
            hospitalRole: {
              include: { roleName: true },
            },
          },
        },
        doctorProfile: {
          select: { id: true },
        },
      },
    });
  }

  /**
   * Full user lookup by ID with relations.
   * Used by verifyOtp() & refresh().
   */
  findById(userId: string) {
    return this.prisma.hospitalUser.findUnique({
      where: { id: userId },
      include: {
        hospital: {
          select: { id: true, code: true, name: true, status: true },
        },
        roles: {
          include: {
            hospitalRole: {
              include: { roleName: true },
            },
          },
        },
        doctorProfile: {
          select: { id: true },
        },
      },
    });
  }

  /**
   * Lightweight lookup for forgot-password.
   */
  findActiveByEmail(email: string) {
    return this.prisma.hospitalUser.findFirst({
      where: { email, status: 'ACTIVE' },
      select: { id: true, email: true, firstName: true, tenantId: true },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.hospitalUser.update({
      where: { id: userId },
      data: {
        passwordHash,
        isTemporaryPassword: false,
        forcePasswordChange: false,
        refreshTokenHash: null, // 🔒 Invalidate all sessions on password change
      },
    });
  }

  setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.prisma.hospitalUser.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}