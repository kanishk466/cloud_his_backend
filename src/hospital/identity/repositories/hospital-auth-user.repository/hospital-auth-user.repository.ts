import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalAuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByHospitalAndEmail(hospitalId: string, email: string) {
    return this.prisma.hospitalUser.findUnique({
      where: {
        hospitalId_email: { hospitalId, email },
      },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.hospitalUser.update({
      where: { id: userId },
      data: {
        passwordHash,
        isTemporaryPassword: false,
        forcePasswordChange: false,
      },
    });
  }

  setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.prisma.hospitalUser.update({
      where: { id: userId },
      data: { refreshTokenHash: refreshTokenHash },
    });
  }

  findById(userId: string) {
    return this.prisma.hospitalUser.findUnique({
      where: { id: userId },
    });
  }
}