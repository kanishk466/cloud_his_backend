import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { HospitalUserType, HospitalUserStatus, LoginType } from '@prisma/client';

@Injectable()
export class HospitalUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSuperAdminByHospital(hospitalId: string) {
    return this.prisma.hospitalUser.findFirst({
      where: { hospitalId, userType: HospitalUserType.SUPER_ADMIN },
    });
  }

  createSuperAdmin(data: {
    hospitalId: string;
    email: string;
    username: string;
    passwordHash: string;
    firstName: string;
    lastName?: string;
  }) {
    return this.prisma.hospitalUser.create({
      data: {
        hospitalId: data.hospitalId,
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,

        firstName: data.firstName,        // ✅ REQUIRED
        lastName: data.lastName ?? null,

        userType: HospitalUserType.SUPER_ADMIN,
        status: HospitalUserStatus.ACTIVE,

        loginType: LoginType.PASSWORD,
        isTemporaryPassword: true,
        forcePasswordChange: true,

        twoFactorEnabled: false,
        sendCredentialsViaSms: false,
        sendCredentialsViaEmail: false,
      },
    });
  }
}