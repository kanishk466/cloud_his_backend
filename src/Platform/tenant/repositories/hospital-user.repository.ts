import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  HospitalUserType,
  HospitalUserStatus,
  LoginType,
} from '@prisma/client';

@Injectable()
export class HospitalUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSuperAdminByHospital(tenantId: string) {
    return this.prisma.hospitalUser.findFirst({
      where: { tenantId, userType: HospitalUserType.SUPER_ADMIN },
    });
  }

  createSuperAdmin(data: {
    tenantId: string;
    email: string;
    username: string;
    passwordHash: string;
    code: string;
    firstName: string;
    lastName?: string;
  }) {
    return this.prisma.hospitalUser.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        username: data.username,
        code: data.code,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
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
