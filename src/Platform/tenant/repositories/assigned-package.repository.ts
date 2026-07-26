import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AssignedPackageRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    hospitalId: number;
    packageId: number;
    startDate: Date;
    endDate?: Date;
  }) {
    return this.prisma.assignedPackage.create({ data });
  }

  findActiveByHospital(hospitalId: number) {
    return this.prisma.assignedPackage.findFirst({
      where: { hospitalId, status: 'ACTIVE' },
      include: { package: true },
    });
  }

  findByHospital(hospitalId: number) {
    return this.prisma.assignedPackage.findMany({
      where: { hospitalId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  deactivate(id: number) {
    return this.prisma.assignedPackage.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}