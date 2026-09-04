import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  HospitalUserStatus,
  HospitalUserType,
  LoginType,
} from '@prisma/client';

@Injectable()
export class HospitalUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Employee ID Generation ─────────────────────────────────────────────────

  async generateEmployeeId(tenantId: string): Promise<string> {
    const last = await this.prisma.staffProfile.findFirst({
      where: { tenantId },
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });

    if (!last) return 'EMP-0001';
    const num = parseInt(last.employeeId.replace('EMP-', ''), 10);
    return `EMP-${String(num + 1).padStart(4, '0')}`;
  }

  // ─── Find By Email (tenant-scoped) ──────────────────────────────────────────

  findByEmailWithHospital(tenantId: string, email: string) {
    return this.prisma.hospitalUser.findUnique({
      where: {
        tenantId_email: { tenantId, email },
      },
      include: {
        hospital: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
    });
  }

  // ─── Find By Username ───────────────────────────────────────────────────────

  findByUsername(tenantId: string, username: string) {
    return this.prisma.hospitalUser.findUnique({
      where: { tenantId_username: { tenantId, username } },
    });
  }

  // ─── Find By Id ─────────────────────────────────────────────────────────────
  //
  // ❌ REMOVED: permissions include
  // Ab user pe direct permissions nahi hain, to include ki zarurat nahi.
  // Permissions role ke through aati hain (getEffectivePermissions use karo).

  findById(id: string, tenantId: string) {
    return this.prisma.hospitalUser.findUnique({
      where: { id, tenantId },
      include: {
        staffProfile: true,
        roles: {
          include: { hospitalRole: { include: { roleName: true } } },
        },
        departments: {
          include: { department: true },
        },
      },
    });
  }

  // ─── Find All ───────────────────────────────────────────────────────────────

  findAll(
    tenantId: string,
    filters: {
      departmentId?: number;
      roleId?: number;
      status?: HospitalUserStatus;
      search?: string;
    },
  ) {
    return this.prisma.hospitalUser.findMany({
      where: {
        tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search
          ? {
              OR: [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(filters.departmentId
          ? { departments: { some: { departmentId: filters.departmentId } } }
          : {}),
        ...(filters.roleId
          ? { roles: { some: { hospitalRoleId: filters.roleId } } }
          : {}),
      },
      include: {
        staffProfile: {
          select: { employeeId: true, designation: true, title: true },
        },
        roles: {
          include: { hospitalRole: { include: { roleName: true } } },
        },
        departments: {
          include: { department: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── NEW: Effective Permissions (Role-based Resolution) ─────────────────────
  //
  // Queries all ACTIVE roles assigned to this user, collects their permissions,
  // and returns the deduplicated UNION.
  // This is the single source of truth for "what can this user do?"

  async getEffectivePermissions(userId: string, tenantId: string) {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        userId,
        hospitalRole: {
          tenantId,
          isActive: true,
        },
      },
      include: {
        hospitalRole: {
          include: {
            roleName: { select: { id: true, name: true, code: true } },
            permissions: {
              include: {
                moduleFeature: {
                  include: {
                    module: { select: { id: true, code: true, name: true } },
                    feature: { select: { id: true, code: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Deduplicate across roles (same permission from 2 roles = 1 entry)
    const uniqueMap = new Map<
      string,
      {
        moduleId: number;
        featureId: number;
        moduleCode: string;
        moduleName: string;
        featureCode: string;
        featureName: string;
        inheritedFromRoles: string[];
      }
    >();

    for (const assignment of assignments) {
      const roleName = assignment.hospitalRole.roleName.name;

      for (const perm of assignment.hospitalRole.permissions) {
        const key = `${perm.moduleId}:${perm.featureId}`;

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            moduleId: perm.moduleId,
            featureId: perm.featureId,
            moduleCode: perm.moduleFeature.module.code,
            moduleName: perm.moduleFeature.module.name,
            featureCode: perm.moduleFeature.feature.code,
            featureName: perm.moduleFeature.feature.name,
            inheritedFromRoles: [roleName],
          });
        } else {
          // Same permission from another role — track it
          uniqueMap.get(key)!.inheritedFromRoles.push(roleName);
        }
      }
    }

    return Array.from(uniqueMap.values());
  }

  // ─── Create Full (5-step transaction) ───────────────────────────────────────
  //
  // ❌ REMOVED: Step 6 (UserModuleFeaturePermission.createMany)
  // Permissions ab role ke through aati hain, user pe direct nahi.

  async createFull(data: {
    tenantId: string;
    userInfo: {
      firstName: string;
      lastName?: string;
      email: string;
      mobile?: string;
      alternateMobile?: string;
      userType: HospitalUserType;
    };
    credentials: {
      passwordHash: string;
      loginType: LoginType;
      accountValidTill?: Date;
      forcePasswordChange: boolean;
      twoFactorEnabled: boolean;
      sendCredentialsViaSms: boolean;
      sendCredentialsViaEmail: boolean;
    };
    staffProfile: {
      employeeId: string;
      title?: string;
      dateOfBirth?: Date;
      gender?: any;
      bloodGroup?: string;
      designation?: string;
      dateOfJoining?: Date;
      shiftId?: number;
      reportingManagerId?: string;
      aadhaarNumber?: string;
      panNumber?: string;
      medicalRegNo?: string;
      qualification?: string;
      specialization?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      emergencyContact?: string;
    };
    primaryRoleId: number;
    additionalRoleIds: number[];
    departmentIds: number[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Create user
      const user = await tx.hospitalUser.create({
        data: {
          tenantId: data.tenantId,
          firstName: data.userInfo.firstName,
          lastName: data.userInfo.lastName,
          email: data.userInfo.email,
          username: data.userInfo.email,
          mobile: data.userInfo.mobile,
          alternateMobile: data.userInfo.alternateMobile,
          userType: data.userInfo.userType,
          passwordHash: data.credentials.passwordHash,
          loginType: data.credentials.loginType,
          accountValidTill: data.credentials.accountValidTill,
          forcePasswordChange: data.credentials.forcePasswordChange,
          isTemporaryPassword: data.credentials.forcePasswordChange,
          twoFactorEnabled: data.credentials.twoFactorEnabled,
          sendCredentialsViaSms: data.credentials.sendCredentialsViaSms,
          sendCredentialsViaEmail: data.credentials.sendCredentialsViaEmail,
          status: 'ACTIVE',
        },
      });

      // Step 2: Staff profile
      await tx.staffProfile.create({
        data: {
          userId: user.id,
          tenantId: data.tenantId,
          employeeId: data.staffProfile.employeeId,
          title: data.staffProfile.title,
          dateOfBirth: data.staffProfile.dateOfBirth,
          gender: data.staffProfile.gender,
          bloodGroup: data.staffProfile.bloodGroup,
          designation: data.staffProfile.designation,
          dateOfJoining: data.staffProfile.dateOfJoining,
          shiftId: data.staffProfile.shiftId,
          reportingManagerId: data.staffProfile.reportingManagerId,
          aadhaarNumber: data.staffProfile.aadhaarNumber,
          panNumber: data.staffProfile.panNumber,
          medicalRegNo: data.staffProfile.medicalRegNo,
          qualification: data.staffProfile.qualification,
          specialization: data.staffProfile.specialization,
          address: data.staffProfile.address,
          city: data.staffProfile.city,
          state: data.staffProfile.state,
          pincode: data.staffProfile.pincode,
          emergencyContact: data.staffProfile.emergencyContact,
        },
      });

      // Step 3: Primary role
      await tx.userRoleAssignment.create({
        data: {
          userId: user.id,
          hospitalRoleId: data.primaryRoleId,
          isPrimary: true,
        },
      });

      // Step 4: Additional roles
      if (data.additionalRoleIds.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: data.additionalRoleIds.map((roleId) => ({
            userId: user.id,
            hospitalRoleId: roleId,
            isPrimary: false,
          })),
          skipDuplicates: true,
        });
      }

      // Step 5: Departments
      if (data.departmentIds.length > 0) {
        await tx.userDepartmentMapping.createMany({
          data: data.departmentIds.map((deptId) => ({
            userId: user.id,
            departmentId: deptId,
          })),
          skipDuplicates: true,
        });
      }

      // ❌ REMOVED: Step 6 — UserModuleFeaturePermission.createMany
      // Permissions ab ROLE ke through aayengi.

      return user;
    });
  }

  // ─── Update Profile ─────────────────────────────────────────────────────────

  async updateProfile(
    id: string,
    tenantId: string,
    userInfo: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      mobile: string;
      alternateMobile: string;
    }>,
    profileInfo: Partial<{
      title: string;
      dateOfBirth: Date;
      gender: any;
      bloodGroup: string;
      designation: string;
      dateOfJoining: Date;
      shiftId: number;
      reportingManagerId: string;
      aadhaarNumber: string;
      panNumber: string;
      medicalRegNo: string;
      qualification: string;
      specialization: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      emergencyContact: string;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.hospitalUser.update({
        where: { id, tenantId },
        data: {
          ...(userInfo.firstName && { firstName: userInfo.firstName }),
          ...(userInfo.lastName !== undefined && {
            lastName: userInfo.lastName,
          }),
          ...(userInfo.email && {
            email: userInfo.email,
            username: userInfo.email,
          }),
          ...(userInfo.mobile !== undefined && { mobile: userInfo.mobile }),
          ...(userInfo.alternateMobile !== undefined && {
            alternateMobile: userInfo.alternateMobile,
          }),
        },
      });

      await tx.staffProfile.update({
        where: { userId: id },
        data: profileInfo,
      });

      return user;
    });
  }

  // ❌ REMOVED: setPermissions()
  // User-level direct permissions ab nahi hain.
  // Use HospitalRoleRepository.setPermissions() instead.

  // ─── Update Status ──────────────────────────────────────────────────────────

  updateStatus(id: string, tenantId: string, status: HospitalUserStatus) {
    return this.prisma.hospitalUser.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  // ─── Reset Password ─────────────────────────────────────────────────────────

  resetPassword(id: string, tenantId: string, passwordHash: string) {
    return this.prisma.hospitalUser.update({
      where: { id, tenantId },
      data: {
        passwordHash,
        isTemporaryPassword: true,
        forcePasswordChange: true,
      },
    });
  }

  // ─── Count Active SUPER_ADMINs ──────────────────────────────────────────────

  countActiveSuperAdmins(tenantId: string): Promise<number> {
    return this.prisma.hospitalUser.count({
      where: {
        tenantId,
        userType: HospitalUserType.SUPER_ADMIN,
        status: HospitalUserStatus.ACTIVE,
      },
    });
  }
}