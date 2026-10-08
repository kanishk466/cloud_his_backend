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

  findById(id: string, tenantId: string) {
    return this.prisma.hospitalUser.findUnique({
      where: { id, tenantId, deletedAt: null },
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
      userType?: HospitalUserType;
    },
  ) {
    return this.prisma.hospitalUser.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  firstName: { contains: filters.search, mode: 'insensitive' },
                },
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
        ...(filters.userType ? { userType: filters.userType } : {}),
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

  // ─── Effective Permissions (Direct + Role-based Resolution) ────────────
  //
  // UNION of:
  //   1. Direct grants  → UserModuleFeaturePermission
  //   2. Role-based     → HospitalRolePermission of every ACTIVE role assigned
  // Deduplicated on (moduleId, featureId).

  async getEffectivePermissions(userId: string, tenantId: string) {
    const [assignments, directPermissions] = await Promise.all([
      this.prisma.userRoleAssignment.findMany({
        where: {
          userId,
          hospitalRole: {
            tenantId,
            isActive: true,
            deletedAt: null,
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
      }),
      this.prisma.userModuleFeaturePermission.findMany({
        where: {
          userId,
          user: { tenantId },
        },
        include: {
          moduleFeature: {
            include: {
              module: { select: { id: true, code: true, name: true } },
              feature: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
    ]);

    const uniqueMap = new Map<
      string,
      {
        moduleId: number;
        featureId: number;
        moduleCode: string;
        moduleName: string;
        featureCode: string;
        featureName: string;
        isDirect: boolean;
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
            isDirect: false,
            inheritedFromRoles: [roleName],
          });
        } else {
          uniqueMap.get(key)!.inheritedFromRoles.push(roleName);
        }
      }
    }

    for (const perm of directPermissions) {
      const key = `${perm.moduleId}:${perm.featureId}`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          moduleId: perm.moduleId,
          featureId: perm.featureId,
          moduleCode: perm.moduleFeature.module.code,
          moduleName: perm.moduleFeature.module.name,
          featureCode: perm.moduleFeature.feature.code,
          featureName: perm.moduleFeature.feature.name,
          isDirect: true,
          inheritedFromRoles: [],
        });
      } else {
        uniqueMap.get(key)!.isDirect = true;
      }
    }

    return Array.from(uniqueMap.values());
  }

  // ─── Create Full ─────────────────────────────────────────────────────────────

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
    performedBy?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Create user
      const user = await tx.hospitalUser.create({
        data: {
          tenantId: data.tenantId,
          createdBy: data.performedBy,
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

      // Step 2: Staff profile (Medical credentials moved to DoctorProfile)
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
          // 🛠️ REMOVED: medicalRegNo, qualification, specialization (Now on DoctorProfile)
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
    performedBy?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.hospitalUser.update({
        where: { id, tenantId, deletedAt: null },
        data: {
          updatedBy: performedBy,
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

      // 🛠️ Filter out doctor-specific fields from staff profile update payload
      const {
        medicalRegNo,
        qualification,
        specialization,
        ...cleanStaffProfile
      } = profileInfo;

      await tx.staffProfile.update({
        where: { userId: id },
        data: cleanStaffProfile,
      });

      return user;
    });
  }

  // ─── Update Status (with session revocation on deactivation) ───────────────
  //
  // Status changes are security-sensitive:
  //   INACTIVE → revoke all active AuthSessions + clear refreshTokenHash
  //   ACTIVE   → plain reactivation (fresh login required)
  // Runs in one transaction so user is never left in a half-revoked state.

  async setStatusWithSessionRevoke(
    id: string,
    tenantId: string,
    status: HospitalUserStatus,
    performedBy?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.hospitalUser.update({
        where: { id, tenantId, deletedAt: null },
        data: {
          status,
          updatedBy: performedBy,
          ...(status === HospitalUserStatus.INACTIVE
            ? { refreshTokenHash: null }
            : {}),
        },
      });

      if (status === HospitalUserStatus.INACTIVE) {
        await tx.authSession.updateMany({
          where: { hospitalUserId: id, isActive: true },
          data: { isActive: false },
        });
      }

      return user;
    });
  }

  // ─── Soft Delete (with session revocation) ──────────────────────────────────

  async softDelete(id: string, tenantId: string, performedBy?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.hospitalUser.update({
        where: { id, tenantId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          status: HospitalUserStatus.INACTIVE,
          refreshTokenHash: null,
          updatedBy: performedBy,
        },
      });

      await tx.authSession.updateMany({
        where: { hospitalUserId: id, isActive: true },
        data: { isActive: false },
      });

      return user;
    });
  }

  // ─── Sync Departments (atomic replace) ─────────────────────────────────────

  async syncDepartments(
    id: string,
    tenantId: string,
    departmentIds: number[],
    performedBy?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.hospitalUser.findUnique({
        where: { id, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!user) throw new Error('USER_NOT_FOUND');

      await tx.userDepartmentMapping.deleteMany({ where: { userId: id } });

      if (departmentIds.length > 0) {
        await tx.userDepartmentMapping.createMany({
          data: departmentIds.map((departmentId) => ({
            userId: id,
            departmentId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.hospitalUser.update({
        where: { id },
        data: { updatedBy: performedBy },
      });

      return tx.userDepartmentMapping.findMany({
        where: { userId: id },
        include: {
          department: { select: { id: true, name: true, code: true } },
        },
      });
    });
  }

  // ─── Sync Roles (atomic replace) ───────────────────────────────────────────

  async syncRoles(
    id: string,
    tenantId: string,
    roles: { hospitalRoleId: number; isPrimary: boolean }[],
    performedBy?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.hospitalUser.findUnique({
        where: { id, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!user) throw new Error('USER_NOT_FOUND');

      await tx.userRoleAssignment.deleteMany({ where: { userId: id } });

      await tx.userRoleAssignment.createMany({
        data: roles.map((role) => ({
          userId: id,
          hospitalRoleId: role.hospitalRoleId,
          isPrimary: role.isPrimary,
        })),
      });

      await tx.hospitalUser.update({
        where: { id },
        data: { updatedBy: performedBy },
      });

      return tx.userRoleAssignment.findMany({
        where: { userId: id },
        include: {
          hospitalRole: { include: { roleName: true } },
        },
      });
    });
  }

  // ─── Reset Password ─────────────────────────────────────────────────────────

  resetPassword(
    id: string,
    tenantId: string,
    passwordHash: string,
    performedBy?: string,
  ) {
    return this.prisma.hospitalUser.update({
      where: { id, tenantId, deletedAt: null },
      data: {
        passwordHash,
        isTemporaryPassword: true,
        forcePasswordChange: true,
        refreshTokenHash: null, // 🔒 Force re-login after admin reset
        updatedBy: performedBy,
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
        deletedAt: null,
      },
    });
  }
}
