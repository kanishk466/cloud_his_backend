import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class EntitlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Returns all moduleIds available to this hospital via active package
  async getEntitledModuleIds(hospitalId: number): Promise<number[]> {
    const assignedPackages =
      await this.prisma.assignedPackage.findMany({
        where: {
          hospitalId,
          status: 'ACTIVE',
        },
        include: {
          package: {
            include: {
              modules: {
                select: { moduleId: true },
              },
            },
          },
        },
      });

    const moduleIds = new Set<number>();

    for (const ap of assignedPackages) {
      for (const pm of ap.package.modules) {
        moduleIds.add(pm.moduleId);
      }
    }

    return Array.from(moduleIds);
  }

  // Returns all entitled modules with their features
  async getEntitledModulesWithFeatures(hospitalId: number) {
    const moduleIds = await this.getEntitledModuleIds(hospitalId);

    if (moduleIds.length === 0) return [];

    return this.prisma.module.findMany({
      where: {
        id: { in: moduleIds },
        isActive: true,
      },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Check if a specific moduleId is entitled for this hospital
  async isModuleEntitled(
    hospitalId: number,
    moduleId: number,
  ): Promise<boolean> {
    const moduleIds = await this.getEntitledModuleIds(hospitalId);
    return moduleIds.includes(moduleId);
  }
}