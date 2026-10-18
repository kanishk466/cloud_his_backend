import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { HospitalUserRepository } from '../repositories/hospital-user.repository';
import { CreateHospitalUserDto } from '../dto/create-hospital-user.dto';
import { UpdateHospitalUserProfileDto } from '../dto/update-hospital-user-profile.dto';
import { ListUsersDto } from '../dto/list-users.dto';
import { SetUserDepartmentsDto } from '../dto/set-user-departments.dto';
import { SetUserRolesDto } from '../dto/set-user-roles.dto';
import { HospitalUserStatus, HospitalUserType } from '@prisma/client';
import { TenantValidationService } from './tenant-validation.service';
import { isPrismaError } from '../../../shared/prisma/prisma-error.util';

@Injectable()
export class HospitalUserService {
  constructor(
    private readonly userRepo: HospitalUserRepository,
    private readonly tenantValidationService: TenantValidationService,
    // ❌ REMOVED: EntitlementRepository
    // Ab user level pe entitlement check nahi hota.
    // Entitlement check sirf Role level pe hota hai (HospitalRoleService me).
  ) {}

  // ─── Create User ────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    dto: CreateHospitalUserDto,
    performedBy?: string,
  ) {
    if (dto.userInfo.userType === HospitalUserType.SUPER_ADMIN) {
      throw new ForbiddenException(
        'SUPER_ADMIN cannot be created via this endpoint',
      );
    }

    const existingEmail = await this.userRepo.findByEmailWithHospital(
      tenantId,
      dto.userInfo.email,
    );
    if (existingEmail) {
      throw new ConflictException('Email already exists in this hospital');
    }

    const existingUsername = await this.userRepo.findByUsername(
      tenantId,
      dto.userInfo.email,
    );
    if (existingUsername) {
      throw new ConflictException('Username already exists in this hospital');
    }

    const additionalRoleIds = dto.roles.additionalRoleIds ?? [];

    await this.tenantValidationService.validateReferences(tenantId, {
      primaryRoleId: dto.roles.primaryRoleId,
      additionalRoleIds,
      departmentIds: dto.departmentIds ?? [],
      shiftId: dto.staffProfile.shiftId,
      reportingManagerId: dto.staffProfile.reportingManagerId,
    });

    // ❌ REMOVED: Entitlement check for direct module permissions
    // Ab user ko direct permissions nahi de rahe, to check ki zarurat nahi.
    // Entitlement check tab hota hai jab admin ROLE ko permissions deta hai
    // (HospitalRoleService.setPermissions me).

    const employeeId = await this.userRepo.generateEmployeeId(tenantId);
    const passwordHash = await bcrypt.hash(dto.credentials.password, 10);

    const user = await this.userRepo.createFull({
      tenantId,
      userInfo: {
        firstName: dto.userInfo.firstName,
        lastName: dto.userInfo.lastName,
        email: dto.userInfo.email,
        mobile: dto.userInfo.mobile,
        alternateMobile: dto.userInfo.alternateMobile,
        userType: dto.userInfo.userType,
      },
      credentials: {
        passwordHash,
        loginType: dto.credentials.loginType,
        accountValidTill: dto.credentials.accountValidTill
          ? new Date(dto.credentials.accountValidTill)
          : undefined,
        forcePasswordChange: dto.credentials.forcePasswordChange,
        twoFactorEnabled: dto.credentials.twoFactorEnabled,
        sendCredentialsViaSms: dto.credentials.sendCredentialsViaSms,
        sendCredentialsViaEmail: dto.credentials.sendCredentialsViaEmail,
      },
      staffProfile: {
        employeeId,
        title: dto.staffProfile.title,
        dateOfBirth: dto.staffProfile.dateOfBirth
          ? new Date(dto.staffProfile.dateOfBirth)
          : undefined,
        gender: dto.staffProfile.gender,
        bloodGroup: dto.staffProfile.bloodGroup,
        designation: dto.staffProfile.designation,
        dateOfJoining: dto.staffProfile.dateOfJoining
          ? new Date(dto.staffProfile.dateOfJoining)
          : undefined,
        shiftId: dto.staffProfile.shiftId,
        reportingManagerId: dto.staffProfile.reportingManagerId,
        aadhaarNumber: dto.staffProfile.aadhaarNumber,
        panNumber: dto.staffProfile.panNumber,
        medicalRegNo: dto.staffProfile.medicalRegNo,
        qualification: dto.staffProfile.qualification,
        specialization: dto.staffProfile.specialization,
        address: dto.staffProfile.address,
        city: dto.staffProfile.city,
        state: dto.staffProfile.state,
        pincode: dto.staffProfile.pincode,
        emergencyContact: dto.staffProfile.emergencyContact,
      },
      primaryRoleId: dto.roles.primaryRoleId,
      additionalRoleIds,
      departmentIds: dto.departmentIds ?? [],
      performedBy,
    });

    return {
      message: 'User created successfully',
      userId: user.id,
      email: user.email,
      employeeId,
    };
  }

  // ─── List Users ─────────────────────────────────────────────────────────────

  findAll(tenantId: string, filters: ListUsersDto) {
    return this.userRepo.findAll(tenantId, filters);
  }

  // ─── Get User By Id ─────────────────────────────────────────────────────────

  async findByIdOrThrow(tenantId: string, id: string) {
    const user = await this.userRepo.findById(id, tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // ─── NEW: Effective Permissions (Role-based) ────────────────────────────────
  //
  // Returns the UNION of all permissions from all active roles assigned to user.
  // No direct user-level permissions involved.

  async getEffectivePermissions(tenantId: string, userId: string) {
    // Verify user exists and belongs to this tenant
    await this.findByIdOrThrow(tenantId, userId);

    return this.userRepo.getEffectivePermissions(userId, tenantId);
  }

  // ❌ REMOVED: setPermissions()
  // Permissions ab user pe directly set nahi hongi.
  // Use HospitalRoleService.setPermissions() to manage role-level permissions.

  // ─── Update Profile ─────────────────────────────────────────────────────────

  async updateProfile(
    tenantId: string,
    id: string,
    dto: UpdateHospitalUserProfileDto,
    performedBy?: string,
  ) {
    if (dto.userInfo?.email) {
      const existing = await this.userRepo.findByEmailWithHospital(
        tenantId,
        dto.userInfo.email,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists in this hospital');
      }
    }

    if (dto.staffProfile?.shiftId || dto.staffProfile?.reportingManagerId) {
      await this.tenantValidationService.validateReferences(tenantId, {
        shiftId: dto.staffProfile?.shiftId,
        reportingManagerId: dto.staffProfile?.reportingManagerId,
      });
    }

    const staffProfileData = dto.staffProfile
      ? {
          ...dto.staffProfile,
          dateOfBirth: dto.staffProfile.dateOfBirth
            ? new Date(dto.staffProfile.dateOfBirth)
            : undefined,
          dateOfJoining: dto.staffProfile.dateOfJoining
            ? new Date(dto.staffProfile.dateOfJoining)
            : undefined,
        }
      : {};

    try {
      return await this.userRepo.updateProfile(
        id,
        tenantId,
        dto.userInfo ?? {},
        staffProfileData,
        performedBy,
      );
    } catch (err: unknown) {
      if (isPrismaError(err, 'P2025')) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  // ─── Status Toggle (PATCH /:id/status) ─────────────────────────────────────
  //
  // Deactivation is security-sensitive: when a user goes INACTIVE, all their
  // active AuthSessions are revoked and refreshTokenHash is cleared inside the
  // same transaction (repo handles it), so they are logged out everywhere.

  async updateStatus(
    tenantId: string,
    userId: string,
    status: HospitalUserStatus,
    performedBy?: string,
  ) {
    const user = await this.userRepo.findById(userId, tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (status === HospitalUserStatus.INACTIVE) {
      await this.assertNotLastActiveSuperAdmin(tenantId, user.userType);
    }

    try {
      await this.userRepo.setStatusWithSessionRevoke(
        userId,
        tenantId,
        status,
        performedBy,
      );
      return {
        message: `User ${status === HospitalUserStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
        userId,
        status,
      };
    } catch (err: unknown) {
      if (isPrismaError(err, 'P2025')) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  // ─── Deactivate / Activate (legacy wrappers) ────────────────────────────────

  deactivate(tenantId: string, userId: string, performedBy?: string) {
    return this.updateStatus(
      tenantId,
      userId,
      HospitalUserStatus.INACTIVE,
      performedBy,
    );
  }

  activate(tenantId: string, userId: string, performedBy?: string) {
    return this.updateStatus(
      tenantId,
      userId,
      HospitalUserStatus.ACTIVE,
      performedBy,
    );
  }

  // ─── Soft Delete ────────────────────────────────────────────────────────────
  //
  // Sets deletedAt + INACTIVE, clears refreshTokenHash and revokes all active
  // sessions atomically. Soft-deleted users are hidden from list/get queries.

  async softDelete(tenantId: string, userId: string, performedBy?: string) {
    const user = await this.userRepo.findById(userId, tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.assertNotLastActiveSuperAdmin(tenantId, user.userType);

    try {
      await this.userRepo.softDelete(userId, tenantId, performedBy);
      return { message: 'User deleted successfully', userId };
    } catch (err: unknown) {
      if (isPrismaError(err, 'P2025')) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  // ─── Bulk Department Mapping (PUT /:id/departments) ────────────────────────

  async setDepartments(
    tenantId: string,
    userId: string,
    dto: SetUserDepartmentsDto,
    performedBy?: string,
  ) {
    await this.findByIdOrThrow(tenantId, userId);

    await this.tenantValidationService.validateReferences(tenantId, {
      departmentIds: dto.departmentIds,
    });

    try {
      const mappings = await this.userRepo.syncDepartments(
        userId,
        tenantId,
        dto.departmentIds,
        performedBy,
      );
      return {
        message: 'User departments updated successfully',
        departments: mappings.map((m) => m.department),
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  // ─── Bulk Role Assignment (PUT /:id/roles) ─────────────────────────────────
  //
  // Atomically replaces the user's role assignments.
  // Rules:
  //   - At least one role (enforced by DTO)
  //   - Exactly one role must be flagged isPrimary: true
  //   - No duplicate hospitalRoleIds
  //   - Every role must belong to this tenant

  async setRoles(
    tenantId: string,
    userId: string,
    dto: SetUserRolesDto,
    performedBy?: string,
  ) {
    await this.findByIdOrThrow(tenantId, userId);

    const primaryRoles = dto.roles.filter((r) => r.isPrimary);
    if (primaryRoles.length !== 1) {
      throw new BadRequestException(
        'Exactly one role must be marked as primary (isPrimary: true)',
      );
    }

    const roleIds = dto.roles.map((r) => r.hospitalRoleId);
    if (new Set(roleIds).size !== roleIds.length) {
      throw new BadRequestException(
        'Duplicate hospitalRoleId values are not allowed',
      );
    }

    await this.tenantValidationService.validateReferences(tenantId, {
      primaryRoleId: primaryRoles[0].hospitalRoleId,
      additionalRoleIds: dto.roles
        .filter((r) => !r.isPrimary)
        .map((r) => r.hospitalRoleId),
    });

    try {
      const assignments = await this.userRepo.syncRoles(
        userId,
        tenantId,
        dto.roles,
        performedBy,
      );
      return {
        message: 'User roles updated successfully',
        roles: assignments.map((a) => ({
          hospitalRoleId: a.hospitalRoleId,
          isPrimary: a.isPrimary,
          name: a.hospitalRole.roleName.name,
        })),
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  // ─── Reset Password ─────────────────────────────────────────────────────────

  async resetPassword(tenantId: string, userId: string, performedBy?: string) {
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    try {
      await this.userRepo.resetPassword(
        userId,
        tenantId,
        passwordHash,
        performedBy,
      );
      return {
        message: 'Password reset successfully',
        temporaryPassword: tempPassword,
      };
    } catch (err: unknown) {
      if (isPrismaError(err, 'P2025')) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  // ─── Guards ─────────────────────────────────────────────────────────────────

  private async assertNotLastActiveSuperAdmin(
    tenantId: string,
    userType: HospitalUserType,
  ) {
    if (userType !== HospitalUserType.SUPER_ADMIN) return;

    const activeSuperAdmins =
      await this.userRepo.countActiveSuperAdmins(tenantId);
    if (activeSuperAdmins <= 1) {
      throw new BadRequestException(
        'Cannot deactivate the last active admin of this hospital',
      );
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private generateTempPassword(length = 12): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
    const charsLength = chars.length;
    const randomBytes = crypto.randomBytes(length);

    let password = '';
    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % charsLength;
      password += chars[index];
    }
    return password;
  }
}
