// import {
//   BadRequestException,
//   ConflictException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { HospitalRoleRepository } from '../repositories/hospital-role.repository';
// import { EntitlementRepository } from '../repositories/entitlement.repository';
// import { CreateHospitalRoleDto } from '../dto/create-hospital-role.dto';
// import { UpdateHospitalRoleDto } from '../dto/update-hospital-role.dto';
// import { SetRolePermissionsDto } from '../dto/set-role-permissions.dto';

// @Injectable()
// export class HospitalRoleService {
//   constructor(
//     private readonly roleRepo: HospitalRoleRepository,
//     private readonly entitlementRepo: EntitlementRepository,
//   ) {}

//   // -------------------------
//   // Create Role
//   // -------------------------
//   async create(hospitalId: string, dto: CreateHospitalRoleDto) {
//     // Check duplicate: same roleName already used in this hospital
//     const existing = await this.roleRepo.findByHospitalAndRoleName(
//       hospitalId,
//       dto.roleNameId,
//     );

//     if (existing) {
//       throw new ConflictException(
//         'A role with this name already exists for your hospital',
//       );
//     }

//     return this.roleRepo.create({
//       hospitalId,
//       roleNameId: dto.roleNameId,
//       description: dto.description,
//     });
//   }

//   // -------------------------
//   // List Roles
//   // -------------------------
//   // findAll(hospitalId: string) {
//   //   return this.roleRepo.findAll(hospitalId);
//   // }

//   // hospital-role.service.ts

// async findAll(hospitalId: string) {
//   const roles = await this.roleRepo.findAll(hospitalId);

//   return roles.map((role) => ({
//     id: role.id,
//     name: role.roleName.name,
//     description: role.description,
//     isSystem: role.isSystem,
//     isActive: role.isActive,
//     permissionCount: role._count.permissions,
//     createdAt: role.createdAt,
//   }));
// }

//   // -------------------------
//   // Get Role by Id
//   // -------------------------
//   async findByIdOrThrow(hospitalId: string, id: string) {
//     const role = await this.roleRepo.findById(id);

//     if (!role || role.hospitalId !== hospitalId) {
//       throw new NotFoundException('Role not found');
//     }

//     return role;
//   }

//   // -------------------------
//   // Update Role
//   // -------------------------
//   async update(
//     hospitalId: string,
//     id: string,
//     dto: UpdateHospitalRoleDto,
//   ) {
//     await this.findByIdOrThrow(hospitalId, id);
//     return this.roleRepo.update(id, dto);
//   }

//   // -------------------------
//   // Toggle Active/Inactive
//   // -------------------------
//   async toggle(hospitalId: string, id: string, isActive: boolean) {
//     await this.findByIdOrThrow(hospitalId, id);
//     return this.roleRepo.toggle(id, isActive);
//   }

//   // -------------------------
//   // Set Permissions (replace all)
//   // -------------------------
//   async setPermissions(
//     hospitalId: string,
//     roleId: string,
//     dto: SetRolePermissionsDto,
//   ) {
//     await this.findByIdOrThrow(hospitalId, roleId);

//     // Get entitled moduleIds for this hospital
//     const entitledModuleIds =
//       await this.entitlementRepo.getEntitledModuleIds(hospitalId);

//     if (entitledModuleIds.length === 0) {
//       throw new BadRequestException(
//         'No active package found for this hospital',
//       );
//     }

//     // Validate each (moduleId, featureId) pair
//     const invalidModules: string[] = [];

//     for (const mf of dto.moduleFeatures) {
//       // Entitlement check (Option A - strict)
//       if (!entitledModuleIds.includes(mf.moduleId)) {
//         invalidModules.push(mf.moduleId);
//       }
//     }

//     if (invalidModules.length > 0) {
//       throw new BadRequestException(
//         `Modules not available in hospital package: ${invalidModules.join(', ')}`,
//       );
//     }

//     return this.roleRepo.setPermissions(roleId, dto.moduleFeatures);
//   }

//   // -------------------------
//   // Get Permissions
//   // -------------------------
//   async getPermissions(hospitalId: string, roleId: string) {
//     await this.findByIdOrThrow(hospitalId, roleId);
//     return this.roleRepo.getPermissions(roleId);
//   }

//   // -------------------------
//   // Get Entitlements (for UI dropdown)
//   // -------------------------
//   getEntitledModules(hospitalId: string) {
//     return this.entitlementRepo.getEntitledModulesWithFeatures(hospitalId);
//   }
// }





import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HospitalRoleRepository } from '../repositories/hospital-role.repository';
import { EntitlementRepository } from '../repositories/entitlement.repository';
import { CreateHospitalRoleDto } from '../dto/create-hospital-role.dto';
import { UpdateHospitalRoleDto } from '../dto/update-hospital-role.dto';
import { SetRolePermissionsDto } from '../dto/set-role-permissions.dto';
import { isPrismaError } from '../../../shared/prisma/prisma-error.util';

@Injectable()
export class HospitalRoleService {
  constructor(
    private readonly roleRepo: HospitalRoleRepository,
    private readonly entitlementRepo: EntitlementRepository,
  ) {}

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(hospitalId: number, dto: CreateHospitalRoleDto) {
    // Check duplicate: same roleName already used in this hospital
    const existing = await this.roleRepo.findByHospitalAndRoleName(
      hospitalId,
      dto.roleNameId,
    );

    if (existing) {
      throw new ConflictException(
        'A role with this name already exists for your hospital',
      );
    }

    return this.roleRepo.create({
      hospitalId,
      roleNameId: dto.roleNameId,
      description: dto.description,
    });
  }

  // ─── List ───────────────────────────────────────────────────────────────────

  async findAll(hospitalId: number) {
    const roles = await this.roleRepo.findAll(hospitalId);

    return roles.map((role) => ({
      id: role.id,
      name: role.roleName.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      permissionCount: role._count.permissions,
      createdAt: role.createdAt,
    }));
  }

  // ─── Get By Id ──────────────────────────────────────────────────────────────
  //
  // Single scoped query. No in-memory ownership check.
  // Prisma returns null if id does not match hospitalId — treated as 404.

  async findByIdOrThrow(hospitalId: number, id: number) {
    const role = await this.roleRepo.findById(id, hospitalId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  //
  // Single scoped update. hospitalId is in the WHERE clause inside the repo.
  // If role does not belong to this hospital, Prisma throws P2025 (record not found).
  // We catch that and surface as NotFoundException.
  // No pre-fetch round trip needed.

  async update(hospitalId: number, id: number, dto: UpdateHospitalRoleDto) {
    try {
      return await this.roleRepo.update(id, hospitalId, dto);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'ROLE_NOT_FOUND') {
        throw new NotFoundException('Role not found');
      }
      // Scoped WHERE (id + hospitalId) misses on cross-tenant access → P2025
      if (isPrismaError(err, 'P2025')) {
        throw new NotFoundException('Role not found');
      }
      throw err;
    }
  }

  // ─── Toggle ─────────────────────────────────────────────────────────────────

  async toggle(hospitalId: number, id: number, isActive: boolean) {
    try {
      return await this.roleRepo.toggle(id, hospitalId, isActive);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'ROLE_NOT_FOUND') {
        throw new NotFoundException('Role not found');
      }
      if (isPrismaError(err, 'P2025')) {
        throw new NotFoundException('Role not found');
      }
      throw err;
    }
  }

  // ─── Set Permissions ────────────────────────────────────────────────────────
  //
  // Entitlement check happens in the service (application rule).
  // Ownership check happens inside the repo transaction (data integrity).
  // Both must pass. Order: entitlement first (cheaper), then ownership + write.

  async setPermissions(
    hospitalId: number,
    roleId: number,
    dto: SetRolePermissionsDto,
  ) {
    // Entitlement check — is this module available in hospital's package?
    const entitledModuleIds =
      await this.entitlementRepo.getEntitledModuleIds(hospitalId);

    if (entitledModuleIds.length === 0) {
      throw new BadRequestException(
        'No active package found for this hospital',
      );
    }

    // Validate each (moduleId, featureId) pair — entitlement check (strict)
    const invalidModules = dto.moduleFeatures.filter(
      (mf) => !entitledModuleIds.includes(mf.moduleId),
    );

    if (invalidModules.length > 0) {
      throw new BadRequestException(
        `Modules not available in hospital package: ${invalidModules.map((m) => m.moduleId).join(', ')}`,
      );
    }

    // Ownership + write — atomic inside repo transaction
    try {
      return await this.roleRepo.setPermissions(
        roleId,
        hospitalId,
        dto.moduleFeatures,
      );
    } catch (err: unknown) {
  if (err instanceof Error && err.message === 'ROLE_NOT_FOUND') {
    throw new NotFoundException('Role not found');
  }
  throw err;
}
  }

  // ─── Get Permissions ────────────────────────────────────────────────────────
  //
  // Repo query is scoped via hospitalRole relation.
  // No pre-fetch needed — returns empty array if role doesn't belong to hospital.
  // We do a single existence check to give a proper 404 if role is not found.

  async getPermissions(hospitalId: number, roleId: number) {
    const role = await this.roleRepo.findById(roleId, hospitalId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.roleRepo.getPermissions(roleId, hospitalId);
  }

  // ─── Get Entitlements (UI dropdown) ─────────────────────────────────────────

  getEntitledModules(hospitalId: number) {
    return this.entitlementRepo.getEntitledModulesWithFeatures(hospitalId);
  }
}