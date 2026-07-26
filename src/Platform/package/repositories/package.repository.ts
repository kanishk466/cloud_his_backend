import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Package -> Module entitlements (via PackageModule) plus the number of
// hospitals currently holding this package (via AssignedPackage).
const PACKAGE_INCLUDE = {
  modules: { include: { module: true } },
  _count: { select: { assignedPackages: true } },
} satisfies Prisma.PackageInclude;

export type PackageWriteData = {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxDoctors: number;
  maxStorageGb: number;
  maxBranches: number;
  isPopular?: boolean;
};

@Injectable()
export class PackageRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: PackageWriteData) {
    return this.prisma.package.create({
      data,
      include: PACKAGE_INCLUDE,
    });
  }

  findById(id: number) {
    return this.prisma.package.findUnique({
      where: { id },
      include: PACKAGE_INCLUDE,
    });
  }

  findByName(name: string) {
    return this.prisma.package.findUnique({ where: { name } });
  }

  findAll() {
    return this.prisma.package.findMany({
      include: PACKAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: number, data: Partial<PackageWriteData & { isActive: boolean }>) {
    return this.prisma.package.update({
      where: { id },
      data,
      include: PACKAGE_INCLUDE,
    });
  }

  remove(id: number) {
    return this.prisma.package.delete({ where: { id } });
  }

  attachModule(packageId: number, moduleId: number) {
    return this.prisma.packageModule.create({
      data: { packageId, moduleId },
    });
  }
}
