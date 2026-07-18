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

@Injectable()
export class HospitalRoleService {
  constructor(
    private readonly roleRepo: HospitalRoleRepository,
    private readonly entitlementRepo: EntitlementRepository,
  ) {}

  // -------------------------
  // Create Role
  // -------------------------
  async create(hospitalId: string, dto: CreateHospitalRoleDto) {
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

  // -------------------------
  // List Roles
  // -------------------------
  findAll(hospitalId: string) {
    return this.roleRepo.findAll(hospitalId);
  }

  // -------------------------
  // Get Role by Id
  // -------------------------
  async findByIdOrThrow(hospitalId: string, id: string) {
    const role = await this.roleRepo.findById(id);

    if (!role || role.hospitalId !== hospitalId) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // -------------------------
  // Update Role
  // -------------------------
  async update(
    hospitalId: string,
    id: string,
    dto: UpdateHospitalRoleDto,
  ) {
    await this.findByIdOrThrow(hospitalId, id);
    return this.roleRepo.update(id, dto);
  }

  // -------------------------
  // Toggle Active/Inactive
  // -------------------------
  async toggle(hospitalId: string, id: string, isActive: boolean) {
    await this.findByIdOrThrow(hospitalId, id);
    return this.roleRepo.toggle(id, isActive);
  }

  // -------------------------
  // Set Permissions (replace all)
  // -------------------------
  async setPermissions(
    hospitalId: string,
    roleId: string,
    dto: SetRolePermissionsDto,
  ) {
    await this.findByIdOrThrow(hospitalId, roleId);

    // Get entitled moduleIds for this hospital
    const entitledModuleIds =
      await this.entitlementRepo.getEntitledModuleIds(hospitalId);

    if (entitledModuleIds.length === 0) {
      throw new BadRequestException(
        'No active package found for this hospital',
      );
    }

    // Validate each (moduleId, featureId) pair
    const invalidModules: string[] = [];

    for (const mf of dto.moduleFeatures) {
      // Entitlement check (Option A - strict)
      if (!entitledModuleIds.includes(mf.moduleId)) {
        invalidModules.push(mf.moduleId);
      }
    }

    if (invalidModules.length > 0) {
      throw new BadRequestException(
        `Modules not available in hospital package: ${invalidModules.join(', ')}`,
      );
    }

    return this.roleRepo.setPermissions(roleId, dto.moduleFeatures);
  }

  // -------------------------
  // Get Permissions
  // -------------------------
  async getPermissions(hospitalId: string, roleId: string) {
    await this.findByIdOrThrow(hospitalId, roleId);
    return this.roleRepo.getPermissions(roleId);
  }

  // -------------------------
  // Get Entitlements (for UI dropdown)
  // -------------------------
  getEntitledModules(hospitalId: string) {
    return this.entitlementRepo.getEntitledModulesWithFeatures(hospitalId);
  }
}