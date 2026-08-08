import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalAuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // findByHospitalAndEmail(hospitalId: string, email: string) {
  //   return this.prisma.hospitalUser.findUnique({
  //     where: { hospitalId_email: { hospitalId, email } },
  //     include: {
  //       hospital: {
  //         select: { id: true, code: true, name: true, status: true },
  //       },
  //     },
  //   });
  // }


// findByEmailWithHospital(email: string) {
//   return this.prisma.hospitalUser.findUnique({
//     where: { email } as any,  // ✅ bypass type check temporarily
//     include: {
//       hospital: {
//         select: { id: true, code: true, name: true, status: true },
//       },
//     },
//   });
// }


 findByEmailWithHospital(email: string) {
    return this.prisma.hospitalUser.findFirst({
      where: {
        email,
        status: 'ACTIVE',
      },
      include: {
        hospital: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
          },
        },
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