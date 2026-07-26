// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../../../shared/prisma/prisma.service';

// @Injectable()
// export class HospitalRoleRepository {
//   constructor(private readonly prisma: PrismaService) {}

//   create(data: {
//     hospitalId: string;
//     roleNameId: string;
//     description?: string;
//   }) {
//     return this.prisma.hospitalRole.create({
//       data: {
//         hospitalId: data.hospitalId,
//         roleNameId: data.roleNameId,
//         description: data.description,
//         isSystem: false,
//         isActive: true,
//       },
//       include: {
//         roleName: true,
//       },
//     });
//   }



//   // hospital-role.repository.ts

// findAll(hospitalId: string) {
//   return this.prisma.hospitalRole.findMany({
//     where: { hospitalId },
//     select: {
//       id: true,
//       description: true,
//       isSystem: true,
//       isActive: true,
//       createdAt: true,
//       roleName: {
//         select: {
//           name: true,         // ← only field dropdown + table needs
//         },
//       },
//       _count: {
//         select: {
//           permissions: true,  // ← count only, no join on permissions table
//         },
//       },
//     },
//     orderBy: { createdAt: 'desc' },
//   });
// }

//   findById(id: string) {
//     return this.prisma.hospitalRole.findUnique({
//       where: { id },
//       include: {
//         roleName: true,
//         permissions: {
//           include: {
//             moduleFeature: {
//               include: {
//                 module: true,
//                 feature: true,
//               },
//             },
//           },
//         },
//       },
//     });
//   }

//   findByHospitalAndRoleName(hospitalId: string, roleNameId: string) {
//     return this.prisma.hospitalRole.findUnique({
//       where: {
//         hospitalId_roleNameId: { hospitalId, roleNameId },
//       },
//     });
//   }

//   update(id: string, data: { description?: string }) {
//     return this.prisma.hospitalRole.update({
//       where: { id },
//       data,
//       include: { roleName: true },
//     });
//   }

//   toggle(id: string, isActive: boolean) {
//     return this.prisma.hospitalRole.update({
//       where: { id },
//       data: { isActive },
//     });
//   }

//   // Replace all permissions for a role (transaction)
//   async setPermissions(
//     hospitalRoleId: string,
//     moduleFeatures: { moduleId: string; featureId: string }[],
//   ) {
//     return this.prisma.$transaction(async (tx) => {
//       // Delete existing
//       await tx.hospitalRolePermission.deleteMany({
//         where: { hospitalRoleId },
//       });

//       // Insert new
//       if (moduleFeatures.length > 0) {
//         await tx.hospitalRolePermission.createMany({
//           data: moduleFeatures.map((mf) => ({
//             hospitalRoleId,
//             moduleId: mf.moduleId,
//             featureId: mf.featureId,
//           })),
//         });
//       }

//       // Return updated role with permissions
//       return tx.hospitalRole.findUnique({
//         where: { id: hospitalRoleId },
//         include: {
//           roleName: true,
//           permissions: {
//             include: {
//               moduleFeature: {
//                 include: {
//                   module: true,
//                   feature: true,
//                 },
//               },
//             },
//           },
//         },
//       });
//     });
//   }

//   getPermissions(hospitalRoleId: string) {
//     return this.prisma.hospitalRolePermission.findMany({
//       where: { hospitalRoleId },
//       include: {
//         moduleFeature: {
//           include: {
//             module: true,
//             feature: true,
//           },
//         },
//       },
//     });
//   }

//   hasAssignedUsers(hospitalRoleId: string) {
//     return this.prisma.userRoleAssignment.count({
//       where: { hospitalRoleId },
//     });
//   }
// }






import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────────────────

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

  // ─── Find All ───────────────────────────────────────────────────────────────

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
          select: { name: true },
        },
        _count: {
          select: { permissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Find By Id ─────────────────────────────────────────────────────────────
  //
  // hospitalId is included in the WHERE clause.
  // If the role does not belong to this hospital, Prisma returns null.
  // The service treats null as NotFoundException — no in-memory ownership check needed.

  findById(id: string, hospitalId: string) {
    return this.prisma.hospitalRole.findUnique({
      where: {
        id,
        hospitalId, // ← tenant scope enforced at query level
      },
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

  // ─── Find By Hospital + RoleName (duplicate check) ──────────────────────────

  findByHospitalAndRoleName(hospitalId: string, roleNameId: string) {
    return this.prisma.hospitalRole.findUnique({
      where: {
        hospitalId_roleNameId: { hospitalId, roleNameId },
      },
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  //
  // WHERE includes both id AND hospitalId.
  // If the role belongs to a different hospital, Prisma throws RecordNotFound.
  // We catch that in the service and surface it as NotFoundException.

  update(id: string, hospitalId: string, data: { description?: string }) {
    return this.prisma.hospitalRole.update({
      where: {
        id,
        hospitalId, // ← tenant scope enforced at query level
      },
      data,
      include: { roleName: true },
    });
  }

  // ─── Toggle Active ──────────────────────────────────────────────────────────

  toggle(id: string, hospitalId: string, isActive: boolean) {
    return this.prisma.hospitalRole.update({
      where: {
        id,
        hospitalId, // ← tenant scope enforced at query level
      },
      data: { isActive },
    });
  }

  // ─── Set Permissions (replace all) ──────────────────────────────────────────
  //
  // Ownership is verified INSIDE the transaction as the first step.
  // If the role does not belong to this hospital, we throw before any write.
  // This means the check and the mutation are atomic — no two-trip race.

  async setPermissions(
    roleId: string,
    hospitalId: string,
    moduleFeatures: { moduleId: string; featureId: string }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1 — ownership check inside the transaction (atomic with writes)
      const role = await tx.hospitalRole.findUnique({
        where: {
          id: roleId,
          hospitalId, // ← tenant scope enforced at query level
        },
        select: { id: true },
      });

      if (!role) {
        throw new Error('ROLE_NOT_FOUND'); // service maps this to NotFoundException
      }

      // Step 2 — delete existing permissions for this role
      await tx.hospitalRolePermission.deleteMany({
        where: { hospitalRoleId: roleId },
      });

      // Step 3 — insert new permissions
      if (moduleFeatures.length > 0) {
        await tx.hospitalRolePermission.createMany({
          data: moduleFeatures.map((mf) => ({
            hospitalRoleId: roleId,
            moduleId: mf.moduleId,
            featureId: mf.featureId,
          })),
        });
      }

      // Step 4 — return updated role with full permissions
      return tx.hospitalRole.findUnique({
        where: { id: roleId },
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

  // ─── Get Permissions ────────────────────────────────────────────────────────
  //
  // Scoped via hospitalRole relation — only returns permissions
  // for roles that belong to this hospital.

  getPermissions(roleId: string, hospitalId: string) {
    return this.prisma.hospitalRolePermission.findMany({
      where: {
        hospitalRoleId: roleId,
        hospitalRole: {
          hospitalId, // ← tenant scope via relation filter
        },
      },
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

  // ─── Has Assigned Users ─────────────────────────────────────────────────────
  //
  // Scoped via hospitalRole relation to prevent cross-tenant counts.

  hasAssignedUsers(roleId: string, hospitalId: string) {
    return this.prisma.userRoleAssignment.count({
      where: {
        hospitalRoleId: roleId,
        hospitalRole: {
          hospitalId, // ← tenant scope via relation filter
        },
      },
    });
  }
}
