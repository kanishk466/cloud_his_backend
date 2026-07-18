import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HospitalUserRepository } from '../repositories/hospital-user.repository';
import { EntitlementRepository } from '../repositories/entitlement.repository';
import { HospitalRoleRepository } from '../repositories/hospital-role.repository';
import { CreateHospitalUserDto } from '../dto/create-hospital-user.dto';
import { UpdateHospitalUserProfileDto } from '../dto/update-hospital-user-profile.dto';
import { SetUserPermissionsDto } from '../dto/set-user-permissions.dto';
import { ListUsersDto } from '../dto/list-users.dto';
import { HospitalUserType } from '@prisma/client';

@Injectable()
export class HospitalUserService {
  constructor(
    private readonly userRepo: HospitalUserRepository,
    private readonly entitlementRepo: EntitlementRepository,
    private readonly roleRepo: HospitalRoleRepository,
  ) {}

  // ----------------------------------------
  // Create User (full wizard submit)
  // ----------------------------------------
  async create(hospitalId: string, dto: CreateHospitalUserDto) {
    // Block SUPER_ADMIN creation via this endpoint
    if (dto.userInfo.userType === HospitalUserType.SUPER_ADMIN) {
      throw new ForbiddenException(
        'SUPER_ADMIN cannot be created via this endpoint',
      );
    }

    // Email uniqueness check
    const existingEmail = await this.userRepo.findByEmailWithHospital(
      dto.userInfo.email
    );
    if (existingEmail) {
      throw new ConflictException('Email already exists in this hospital');
    }

    // Username uniqueness check (username = email)
    const existingUsername = await this.userRepo.findByUsername(
      hospitalId,
      dto.userInfo.email,
    );
    if (existingUsername) {
      throw new ConflictException('Username already exists in this hospital');
    }

    // Primary role must belong to this hospital
    const primaryRole = await this.roleRepo.findById(dto.roles.primaryRoleId);
    if (!primaryRole || primaryRole.hospitalId !== hospitalId) {
      throw new NotFoundException('Primary role not found');
    }

    // Additional roles must belong to this hospital
    const additionalRoleIds = dto.roles.additionalRoleIds ?? [];
    for (const roleId of additionalRoleIds) {
      const role = await this.roleRepo.findById(roleId);
      if (!role || role.hospitalId !== hospitalId) {
        throw new NotFoundException(`Additional role not found: ${roleId}`);
      }
    }

    // Entitlement validation for permissions
    const entitledModuleIds =
      await this.entitlementRepo.getEntitledModuleIds(hospitalId);

    const invalidModules = dto.permissions.filter(
      (p) => !entitledModuleIds.includes(p.moduleId),
    );

    if (invalidModules.length > 0) {
      throw new BadRequestException(
        `Modules not available in hospital package: ${invalidModules.map((m) => m.moduleId).join(', ')}`,
      );
    }

    // Generate employee ID
    const employeeId = await this.userRepo.generateEmployeeId(hospitalId);

    // Hash password
    const passwordHash = await bcrypt.hash(dto.credentials.password, 10);

    // Create user (full transaction)
    const user = await this.userRepo.createFull({
      hospitalId,
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
      permissions: dto.permissions,
    });

    return { message: 'User created successfully', userId: user.id, employeeId };
  }

  // ----------------------------------------
  // List Users
  // ----------------------------------------
  findAll(hospitalId: string, filters: ListUsersDto) {
    return this.userRepo.findAll(hospitalId, filters);
  }

  // ----------------------------------------
  // Get User by Id
  // ----------------------------------------
  async findByIdOrThrow(hospitalId: string, id: string) {
    const user = await this.userRepo.findById(id);

    if (!user || user.hospitalId !== hospitalId) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ----------------------------------------
  // Update Profile
  // ----------------------------------------
async updateProfile(
  hospitalId: string,
  id: string,
  dto: UpdateHospitalUserProfileDto,
) {
  const user = await this.findByIdOrThrow(hospitalId, id);

  // Email uniqueness if changing email
  if (dto.userInfo?.email && dto.userInfo.email !== user.email) {
    const existing = await this.userRepo.findByEmailWithHospital(
      dto.userInfo.email,
    );
    if (existing) {
      throw new ConflictException('Email already exists in this hospital');
    }
  }

  // Convert date strings to Date objects for staffProfile
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

  return this.userRepo.updateProfile(
    id,
    dto.userInfo ?? {},
    staffProfileData,
  );
}

  // ----------------------------------------
  // Set Permissions
  // ----------------------------------------
  async setPermissions(
    hospitalId: string,
    userId: string,
    dto: SetUserPermissionsDto,
  ) {
    await this.findByIdOrThrow(hospitalId, userId);

    // Entitlement check
    const entitledModuleIds =
      await this.entitlementRepo.getEntitledModuleIds(hospitalId);

    const invalid = dto.permissions.filter(
      (p) => !entitledModuleIds.includes(p.moduleId),
    );

    if (invalid.length > 0) {
      throw new BadRequestException(
        `Modules not available in hospital package: ${invalid.map((m) => m.moduleId).join(', ')}`,
      );
    }

    await this.userRepo.setPermissions(userId, dto.permissions);
    return { message: 'Permissions updated successfully' };
  }

  // ----------------------------------------
  // Deactivate
  // ----------------------------------------
  async deactivate(hospitalId: string, userId: string) {
    const user = await this.findByIdOrThrow(hospitalId, userId);

    // Block deactivating SUPER_ADMIN if last active one
    if (user.userType === HospitalUserType.SUPER_ADMIN) {
      const activeSuperAdmins = await this.countActiveSuperAdmins(hospitalId);
      if (activeSuperAdmins <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the last active admin of this hospital',
        );
      }
    }

    return this.userRepo.updateStatus(userId, 'INACTIVE');
  }

  // ----------------------------------------
  // Activate
  // ----------------------------------------
  async activate(hospitalId: string, userId: string) {
    await this.findByIdOrThrow(hospitalId, userId);
    return this.userRepo.updateStatus(userId, 'ACTIVE');
  }

  // ----------------------------------------
  // Reset Password
  // ----------------------------------------
  async resetPassword(hospitalId: string, userId: string) {
    await this.findByIdOrThrow(hospitalId, userId);

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.userRepo.resetPassword(userId, passwordHash);

    return {
      message: 'Password reset successfully',
      temporaryPassword: tempPassword,
    };
  }

  // ----------------------------------------
  // Helpers
  // ----------------------------------------
  private async countActiveSuperAdmins(hospitalId: string): Promise<number> {
    // Access prisma indirectly via repo
    const users = await this.userRepo.findAll(hospitalId, {
      status: 'ACTIVE',
    });
    return users.filter(
      (u) => u.userType === HospitalUserType.SUPER_ADMIN,
    ).length;
  }

  private generateTempPassword(length = 12): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }
}