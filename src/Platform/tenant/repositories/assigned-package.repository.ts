import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AssignedPackageRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    tenantId: string;
    packageId: number;
    startDate: Date;
    endDate?: Date;
  }) {
    return this.prisma.assignedPackage.create({ data });
  }

  findActiveByHospital(id: number) {
    return this.prisma.assignedPackage.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { package: true },
    });
  }

  findByHospital(tenantId: string) {
    return this.prisma.assignedPackage.findMany({
      where: { tenantId },
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