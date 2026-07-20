import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    hospitalId: string;
    roleNameId: string;
    description?: string;
  }) {
    return this.prisma.hospitalRole.create({
      data: {
        hospitalId: data.hospitalId,
        roleNameId: data.roleNameId,
        description: data.description,
        isSystem: false,
        isActive: true,
      },
      include: {
        roleName: true,
      },
    });
  }



  // hospital-role.repository.ts

findAll(hospitalId: string) {
  return this.prisma.hospitalRole.findMany({
    where: { hospitalId },
    select: {
      id: true,
      description: true,
      isSystem: true,
      isActive: true,
      createdAt: true,
      roleName: {
        select: {
          name: true,         // ← only field dropdown + table needs
        },
      },
      _count: {
        select: {
          permissions: true,  // ← count only, no join on permissions table
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

  findById(id: string) {
    return this.prisma.hospitalRole.findUnique({
      where: { id },
      include: {
        roleName: true,
        permissions: {
          include: {
            moduleFeature: {
              include: {
                module: true,
                feature: true,
              },
            },
          },
        },
      },
    });
  }

  findByHospitalAndRoleName(hospitalId: string, roleNameId: string) {
    return this.prisma.hospitalRole.findUnique({
      where: {
        hospitalId_roleNameId: { hospitalId, roleNameId },
      },
    });
  }

  update(id: string, data: { description?: string }) {
    return this.prisma.hospitalRole.update({
      where: { id },
      data,
      include: { roleName: true },
    });
  }

  toggle(id: string, isActive: boolean) {
    return this.prisma.hospitalRole.update({
      where: { id },
      data: { isActive },
    });
  }

  // Replace all permissions for a role (transaction)
  async setPermissions(
    hospitalRoleId: string,
    moduleFeatures: { moduleId: string; featureId: string }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Delete existing
      await tx.hospitalRolePermission.deleteMany({
        where: { hospitalRoleId },
      });

      // Insert new
      if (moduleFeatures.length > 0) {
        await tx.hospitalRolePermission.createMany({
          data: moduleFeatures.map((mf) => ({
            hospitalRoleId,
            moduleId: mf.moduleId,
            featureId: mf.featureId,
          })),
        });
      }

      // Return updated role with permissions
      return tx.hospitalRole.findUnique({
        where: { id: hospitalRoleId },
        include: {
          roleName: true,
          permissions: {
            include: {
              moduleFeature: {
                include: {
                  module: true,
                  feature: true,
                },
              },
            },
          },
        },
      });
    });
  }

  getPermissions(hospitalRoleId: string) {
    return this.prisma.hospitalRolePermission.findMany({
      where: { hospitalRoleId },
      include: {
        moduleFeature: {
          include: {
            module: true,
            feature: true,
          },
        },
      },
    });
  }

  hasAssignedUsers(hospitalRoleId: string) {
    return this.prisma.userRoleAssignment.count({
      where: { hospitalRoleId },
    });
  }
}