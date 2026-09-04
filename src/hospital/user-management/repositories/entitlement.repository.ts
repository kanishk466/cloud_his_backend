import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class EntitlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get Entitled Module IDs ────────────────────────────────────────────────

  async getEntitledModuleIds(tenantId: string): Promise<number[]> {
    const assignedPackages = await this.prisma.assignedPackage.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        package: {
          include: {
            modules: { select: { moduleId: true } },
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

  // ─── Get Entitled Modules With Features ─────────────────────────────────────

  async getEntitledModulesWithFeatures(tenantId: string) {
    const moduleIds = await this.getEntitledModuleIds(tenantId);
    if (moduleIds.length === 0) return [];

    return this.prisma.module.findMany({
      where: { id: { in: moduleIds }, isActive: true },
      include: {
        features: { include: { feature: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ─── Check Single Module ────────────────────────────────────────────────────

  async isModuleEntitled(tenantId: string, moduleId: number): Promise<boolean> {
    const moduleIds = await this.getEntitledModuleIds(tenantId);
    return moduleIds.includes(moduleId);
  }

  // ─── Get Licensed Module IDs (alias) ────────────────────────────────────────

  async getLicensedModuleIds(tenantId: string): Promise<number[]> {
    return this.getEntitledModuleIds(tenantId);
  }

  // ─── Get Modules & Features For User (ROLE-BASED ONLY) ─────────────────────
  //
  // ✅ CHANGED: Removed direct user permissions (userAuthData.permissions).
  // Now ONLY resolves permissions through assigned roles.
  // SUPER_ADMIN still gets full access to all licensed modules.

  async getModulesWithFeaturesForUser(
    tenantId: string,
    userId: string,
    userType?: string,
  ) {
    try {
      // Step A: Licensed modules for this hospital
      const licensedModuleIds = await this.getLicensedModuleIds(tenantId);
      if (licensedModuleIds.length === 0) return [];

      // Step B: Fetch full module/feature tree
      const availableModules = await this.prisma.module.findMany({
        where: { id: { in: licensedModuleIds }, isActive: true },
        include: {
          features: { include: { feature: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });

      // ─── SUPER ADMIN: Full access ──────────────────────────────────────────
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

      // ─── REGULAR USER / DOCTOR: Role-based only ────────────────────────────
      const userAuthData = await this.prisma.hospitalUser.findFirst({
        where: { tenantId, id: userId },
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
          // ❌ REMOVED: permissions (direct user-level)
          // Ab sirf roles ke through permissions aayengi
        },
      });

      if (!userAuthData) return [];

      // Build authorized features map from ROLES ONLY
      const authorizedFeaturesByModule = new Map<number, Set<number>>();

      for (const assignment of userAuthData.roles) {
        for (const perm of assignment.hospitalRole.permissions) {
          if (licensedModuleIds.includes(perm.moduleId)) {
            if (!authorizedFeaturesByModule.has(perm.moduleId)) {
              authorizedFeaturesByModule.set(perm.moduleId, new Set<number>());
            }
            authorizedFeaturesByModule.get(perm.moduleId)!.add(perm.featureId);
          }
        }
      }

      // ❌ REMOVED: Direct user permissions loop
      // for (const perm of userAuthData.permissions) { ... }

      // Filter and return
      return availableModules
        .filter((mod) => authorizedFeaturesByModule.has(mod.id))
        .map((mod) => {
          const allowedFeatureIds = authorizedFeaturesByModule.get(mod.id)!;
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