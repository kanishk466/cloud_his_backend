import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SCENARIO A: Activate Existing Master Role in Hospital ─────────────────
  //
  // Master table me "Accountant" already hai (roleNameId: 3)
  // Hospital me nahi hai → HospitalRole create karo with existing roleNameId
  // Master me naya entry NAHI banta

  async createFromExistingMaster(
    tenantId: string,
    data: {
      roleNameId: number;
      description?: string;
      cloneFromRoleId?: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Verify master role exists
      const masterRole = await tx.roleName.findUnique({
        where: { id: data.roleNameId },
      });

      if (!masterRole) {
        throw new Error('MASTER_ROLE_NOT_FOUND');
      }

      // Step 2: Check if already activated in this hospital
      const existing = await tx.hospitalRole.findUnique({
        where: {
          tenantId_roleNameId: {
            tenantId,
            roleNameId: data.roleNameId,
          },
        },
      });

      if (existing) {
        throw new Error('ROLE_ALREADY_EXISTS_IN_HOSPITAL');
      }

      // Step 3: Create HospitalRole (NO new master entry)
      const hospitalRole = await tx.hospitalRole.create({
        data: {
          tenantId,
          roleNameId: data.roleNameId,  // ← Existing master ID
          description: data.description,
          isSystem: false,
          isActive: true,
        },
        include: {
          roleName: true,
          _count: { select: { permissions: true } },
        },
      });

      // Step 4: Clone permissions if requested
      if (data.cloneFromRoleId) {
        await this.clonePermissionsInTransaction(
          tx, tenantId, data.cloneFromRoleId, hospitalRole.id,
        );
      }

      return tx.hospitalRole.findUnique({
        where: { id: hospitalRole.id },
        include: {
          roleName: true,
          _count: { select: { permissions: true } },
          permissions: {
            include: {
              moduleFeature: {
                include: { module: true, feature: true },
              },
            },
          },
        },
      });
    });
  }

  // ─── SCENARIO B: Create Custom Role (New Master + Hospital) ────────────────
  //
  // "Junior Pharmacist" master me nahi hai
  // → Master me naya RoleName banta hai
  // → HospitalRole bhi banta hai

  async createWithCustomMasterRoleName(
    tenantId: string,
    data: {
      roleName: string;
      roleCode: string;
      description?: string;
      cloneFromRoleId?: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Check duplicate by name in this hospital
      const existingByName = await tx.hospitalRole.findFirst({
        where: {
          tenantId,
          roleName: { name: data.roleName },
        },
      });

      if (existingByName) {
        throw new Error('ROLE_ALREADY_EXISTS_IN_HOSPITAL');
      }

      // Step 2: Find or Create Master RoleName
      const masterRoleName = await tx.roleName.upsert({
        where: { code: data.roleCode },
        update: {},
        create: {
          name: data.roleName,
          code: data.roleCode,
          isSystem: false,
          createdByTenantId: tenantId,
        },
      });

      // Step 3: Double-check hospital doesn't already have this roleNameId
      const existingById = await tx.hospitalRole.findUnique({
        where: {
          tenantId_roleNameId: { tenantId, roleNameId: masterRoleName.id },
        },
      });

      if (existingById) {
        throw new Error('ROLE_ALREADY_EXISTS_IN_HOSPITAL');
      }

      // Step 4: Create HospitalRole
      const hospitalRole = await tx.hospitalRole.create({
        data: {
          tenantId,
          roleNameId: masterRoleName.id,
          description: data.description,
          isSystem: false,
          isActive: true,
        },
        include: {
          roleName: true,
          _count: { select: { permissions: true } },
        },
      });

      // Step 5: Clone permissions if requested
      if (data.cloneFromRoleId) {
        await this.clonePermissionsInTransaction(
          tx, tenantId, data.cloneFromRoleId, hospitalRole.id,
        );
      }

      return tx.hospitalRole.findUnique({
        where: { id: hospitalRole.id },
        include: {
          roleName: true,
          _count: { select: { permissions: true } },
          permissions: {
            include: {
              moduleFeature: {
                include: { module: true, feature: true },
              },
            },
          },
        },
      });
    });
  }

  // ─── NEW: Master Catalog ───────────────────────────────────────────────────
  //
  // Returns ALL master roles with a flag showing whether each is
  // already activated in this hospital.
  //
  // Frontend use:
  //   - Dropdown shows all roles
  //   - Already activated ones are disabled/greyed out
  //   - Available ones are clickable to activate

  async getMasterCatalog(tenantId: string) {
    // Get all master roles
    const allMasterRoles = await this.prisma.roleName.findMany({
      orderBy: { name: 'asc' },
    });

    // Get which ones are already in this hospital
    const hospitalRoles = await this.prisma.hospitalRole.findMany({
      where: { tenantId },
      select: { roleNameId: true },
    });

    const activatedRoleNameIds = new Set(hospitalRoles.map((r) => r.roleNameId));

    // Combine
    return allMasterRoles.map((master) => ({
      id: master.id,
      name: master.name,
      code: master.code,
      isSystem: master.isSystem,
      isActivatedInHospital: activatedRoleNameIds.has(master.id),
      // ↑ true = already in hospital (disable in dropdown)
      // ↑ false = available to activate (show in dropdown)
    }));
  }

  // ─── Helper: Clone Permissions Inside Transaction ──────────────────────────

  private async clonePermissionsInTransaction(
    tx: any,
    tenantId: string,
    sourceRoleId: number,
    targetRoleId: number,
  ) {
    const sourceRole = await tx.hospitalRole.findUnique({
      where: { id: sourceRoleId, tenantId },
      include: { permissions: true },
    });

    if (!sourceRole) {
      throw new Error('CLONE_ROLE_NOT_FOUND');
    }

    if (sourceRole.permissions.length > 0) {
      await tx.hospitalRolePermission.createMany({
        data: sourceRole.permissions.map((p: any) => ({
          hospitalRoleId: targetRoleId,
          moduleId: p.moduleId,
          featureId: p.featureId,
        })),
      });
    }
  }

  // ─── Existing Methods (unchanged) ──────────────────────────────────────────

  findAll(tenantId: string) {
    return this.prisma.hospitalRole.findMany({
      where: { tenantId },
      include: {
        roleName: true,
        _count: { select: { permissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: number, tenantId: string) {
    return this.prisma.hospitalRole.findUnique({
      where: { id, tenantId },
      include: {
        roleName: true,
        _count: { select: { permissions: true } },
        permissions: {
          include: {
            moduleFeature: {
              include: { module: true, feature: true },
            },
          },
        },
      },
    });
  }

  update(id: number, tenantId: string, data: { description?: string }) {
    return this.prisma.hospitalRole.update({
      where: { id, tenantId },
      data,
    });
  }

  toggle(id: number, tenantId: string, isActive: boolean) {
    return this.prisma.hospitalRole.update({
      where: { id, tenantId },
      data: { isActive },
    });
  }

  async setPermissions(
    roleId: number,
    tenantId: string,
    moduleFeatures: { moduleId: number; featureId: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.hospitalRole.findUnique({
        where: { id: roleId, tenantId },
        select: { id: true },
      });
      if (!role) throw new Error('ROLE_NOT_FOUND');

      await tx.hospitalRolePermission.deleteMany({
        where: { hospitalRoleId: roleId },
      });

      if (moduleFeatures.length > 0) {
        await tx.hospitalRolePermission.createMany({
          data: moduleFeatures.map((mf) => ({
            hospitalRoleId: roleId,
            moduleId: mf.moduleId,
            featureId: mf.featureId,
          })),
        });
      }

      return tx.hospitalRole.findUnique({
        where: { id: roleId },
        include: {
          roleName: true,
          permissions: {
            include: {
              moduleFeature: {
                include: { module: true, feature: true },
              },
            },
          },
        },
      });
    });
  }

  getPermissions(roleId: number, tenantId: string) {
    return this.prisma.hospitalRolePermission.findMany({
      where: { hospitalRoleId: roleId, hospitalRole: { tenantId } },
      include: {
        moduleFeature: {
          include: { module: true, feature: true },
        },
      },
    });
  }

  async copyPermissions(
    tenantId: string,
    performedByUserId: string,
    sourceRoleId: number,
    targetRoleIds: number[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const sourceRole = await tx.hospitalRole.findUnique({
        where: { id: sourceRoleId, tenantId },
        include: { permissions: true },
      });
      if (!sourceRole) throw new Error('SOURCE_ROLE_NOT_FOUND');

      const count = await tx.hospitalRole.count({
        where: { id: { in: targetRoleIds }, tenantId },
      });
      if (count !== targetRoleIds.length) throw new Error('SOME_TARGET_ROLES_NOT_FOUND');

      for (const targetId of targetRoleIds) {
        await tx.hospitalRolePermission.deleteMany({
          where: { hospitalRoleId: targetId },
        });
        if (sourceRole.permissions.length > 0) {
          await tx.hospitalRolePermission.createMany({
            data: sourceRole.permissions.map((p: any) => ({
              hospitalRoleId: targetId,
              moduleId: p.moduleId,
              featureId: p.featureId,
            })),
          });
        }
      }

      return { success: true, copiedCount: sourceRole.permissions.length };
    });
  }

  hasAssignedUsers(roleId: number, tenantId: string) {
    return this.prisma.userRoleAssignment.count({
      where: { hospitalRoleId: roleId, hospitalRole: { tenantId } },
    });
  }
}