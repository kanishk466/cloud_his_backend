import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class DoctorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id: doctorProfileId, tenantId },
      include: {
        hospitalUser: {
          select: { firstName: true, lastName: true, email: true },
        },
        clinicalDepartment: { select: { id: true, name: true, code: true } },
        specializationRel: { select: { id: true, name: true, code: true } },
      },
    });
  }

  updateSignatureUrl(
    tenantId: string,
    doctorProfileId: string,
    url: string | null,
  ) {
    return this.prisma.doctorProfile.update({
      where: { id: doctorProfileId, tenantId },
      data: { digitalSignatureUrl: url },
      include: {
        hospitalUser: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
