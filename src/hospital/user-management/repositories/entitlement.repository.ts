import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class EntitlementRepository {
  
  constructor(private readonly prisma: PrismaService) {}

  // Returns all moduleIds available to this hospital via active package
  async getEntitledModuleIds(tenantId: string): Promise<number[]> {
    const assignedPackages =
      await this.prisma.assignedPackage.findMany({
        where: {
          tenantId,
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
  async getEntitledModulesWithFeatures(tenantId: string) {
    const moduleIds = await this.getEntitledModuleIds(tenantId);

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
    tenantId: string,
    moduleId: number,
  ): Promise<boolean> {
    const moduleIds = await this.getEntitledModuleIds(tenantId);
    return moduleIds.includes(moduleId);
  }




  
  // ─── 1. FETCH LICENSED MODULE IDS IN HOSPITAL'S ACTIVE PACKAGE ─────
  async getLicensedModuleIds(tenantId: string): Promise<number[]> {
    const assignedPackages = await this.prisma.assignedPackage.findMany({
      where: {
        tenantId,
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

  // ─── 2. GET MODULES & FEATURES FOR USER (ROLE & PRIVILEGE AWARE) ──
  async getModulesWithFeaturesForUser(
    tenantId: string,
    userId: string,
    userType?: string,
  ) {
    try {
      // Step A: Get all modules licensed under hospital's active subscription
      const licensedModuleIds = await this.getLicensedModuleIds(tenantId);
      if (licensedModuleIds.length === 0) return [];

      // Step B: Fetch base licensed modules from DB
      const availableModules = await this.prisma.module.findMany({
        where: {
          id: { in: licensedModuleIds },
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

      // ─── SUPER ADMIN CASE ──────────────────────────────────────────
      // If user is SUPER_ADMIN, grant full access to all licensed features
      if (userType === 'SUPER_ADMIN') {
        return availableModules.map((mod) => ({
          id: mod.id,
          name: mod.name,
          code: mod.code,
          route: mod.route,
          icon: mod.icon,
          sortOrder: mod.sortOrder,
          parentId: mod.parentId,
          features: mod.features.map((f) => ({
            id: f.feature.id,
            name: f.feature.name,
            code: f.feature.code,
            description: f.feature.description,
          })),
        }));
      }

      // ─── REGULAR USER & DOCTOR CASE ───────────────────────────────
      // Query specific role assignments and direct custom permissions
      const userAuthData = await this.prisma.hospitalUser.findFirst({
        where: {
          tenantId,
          id: userId,
        },
        select: {
          roles: {
            where: {
              hospitalRole: { isActive: true },
            },
            select: {
              hospitalRole: {
                select: {
                  permissions: {
                    select: {
                      moduleId: true,
                      featureId: true,
                    },
                  },
                },
              },
            },
          },
          permissions: {
            select: {
              moduleId: true,
              featureId: true,
            },
          },
        },
      });

      if (!userAuthData) return [];

      // Build a set of authorized feature IDs per module
      const authorizedFeaturesByModule = new Map<number, Set<number>>();

      const registerPermission = (moduleId: number, featureId: number) => {
        if (licensedModuleIds.includes(moduleId)) {
          if (!authorizedFeaturesByModule.has(moduleId)) {
            authorizedFeaturesByModule.set(moduleId, new Set<number>());
          }
          authorizedFeaturesByModule.get(moduleId).add(featureId);
        }
      };

      // Add features from assigned roles
      for (const assignment of userAuthData.roles) {
        for (const perm of assignment.hospitalRole.permissions) {
          registerPermission(perm.moduleId, perm.featureId);
        }
      }

      // Add direct feature overrides
      for (const perm of userAuthData.permissions) {
        registerPermission(perm.moduleId, perm.featureId);
      }

      // Filter and return only the permitted modules and features
      return availableModules
        .filter((mod) => authorizedFeaturesByModule.has(mod.id))
        .map((mod) => {
          const allowedFeatureIds = authorizedFeaturesByModule.get(mod.id);
          const filteredFeatures = mod.features
            .filter((f) => allowedFeatureIds.has(f.featureId))
            .map((f) => ({
              id: f.feature.id,
              name: f.feature.name,
              code: f.feature.code,
              description: f.feature.description,
            }));

          return {
            id: mod.id,
            name: mod.name,
            code: mod.code,
            route: mod.route,
            icon: mod.icon,
            sortOrder: mod.sortOrder,
            parentId: mod.parentId,
            features: filteredFeatures,
          };
        });
    } catch (error) {
      console.error('Error fetching modules and features for user:', error);
      return [];
    }
  }
}