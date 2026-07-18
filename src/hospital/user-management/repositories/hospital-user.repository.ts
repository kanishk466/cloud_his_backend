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

  // ---- Employee ID generation ----
  async generateEmployeeId(hospitalId: string): Promise<string> {
    const last = await this.prisma.staffProfile.findFirst({
      where: { hospitalId },
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });

    if (!last) return 'EMP-0001';

    const num = parseInt(last.employeeId.replace('EMP-', ''), 10);
    const next = num + 1;
    return `EMP-${String(next).padStart(4, '0')}`;
  }

  // ---- Find ----
  // findByEmailWithHospital(hospitalId: string, email: string) {
  //   return this.prisma.hospitalUser.findUnique({
  //     where: { hospitalId_email: { hospitalId, email } },
  //   });
  // }


  findByEmailWithHospital(email: string) {
  return this.prisma.hospitalUser.findUnique({
    where: { email } as any , // ✅ Just email — it's globally unique now
    include: {
      hospital: {
        select: { id: true, code: true, name: true, status: true },
      },
    },
  });
}

  findByUsername(hospitalId: string, username: string) {
    return this.prisma.hospitalUser.findUnique({
      where: { hospitalId_username: { hospitalId, username } },
    });
  }

  findById(id: string) {
    return this.prisma.hospitalUser.findUnique({
      where: { id },
      include: {
        staffProfile: true,
        roles: {
          include: { hospitalRole: { include: { roleName: true } } },
        },
        departments: {
          include: { department: true },
        },
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

  findAll(
    hospitalId: string,
    filters: {
      departmentId?: string;
      roleId?: string;
      status?: HospitalUserStatus;
      search?: string;
    },
  ) {
    return this.prisma.hospitalUser.findMany({
      where: {
        hospitalId,
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
          ? {
              departments: {
                some: { departmentId: filters.departmentId },
              },
            }
          : {}),
        ...(filters.roleId
          ? {
              roles: {
                some: { hospitalRoleId: filters.roleId },
              },
            }
          : {}),
      },
      include: {
        staffProfile: {
          select: {
            employeeId: true,
            designation: true,
            title: true,
          },
        },
        roles: {
          include: {
            hospitalRole: { include: { roleName: true } },
          },
        },
        departments: {
          include: { department: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- Create (full transaction) ----
  async createFull(data: {
    hospitalId: string;
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
      shiftId?: string;
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
    primaryRoleId: string;
    additionalRoleIds: string[];
    departmentIds: string[];
    permissions: { moduleId: string; featureId: string }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create HospitalUser
      const user = await tx.hospitalUser.create({
        data: {
          hospitalId: data.hospitalId,
          firstName: data.userInfo.firstName,
          lastName: data.userInfo.lastName,
          email: data.userInfo.email,
          username: data.userInfo.email, // username = email
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

      // 2. Create StaffProfile
      await tx.staffProfile.create({
        data: {
          userId: user.id,
          hospitalId: data.hospitalId,
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

      // 3. Assign primary role
      await tx.userRoleAssignment.create({
        data: {
          userId: user.id,
          hospitalRoleId: data.primaryRoleId,
          isPrimary: true,
        },
      });

      // 4. Assign additional roles
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

      // 5. Map departments
      if (data.departmentIds.length > 0) {
        await tx.userDepartmentMapping.createMany({
          data: data.departmentIds.map((deptId) => ({
            userId: user.id,
            departmentId: deptId,
          })),
          skipDuplicates: true,
        });
      }

      // 6. Save final permissions
      if (data.permissions.length > 0) {
        await tx.userModuleFeaturePermission.createMany({
          data: data.permissions.map((p) => ({
            userId: user.id,
            moduleId: p.moduleId,
            featureId: p.featureId,
          })),
          skipDuplicates: true,
        });
      }

      return user;
    });
  }

  // ---- Update profile ----
  async updateProfile(
    id: string,
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
      shiftId: string;
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
        where: { id },
        data: {
          ...(userInfo.firstName && { firstName: userInfo.firstName }),
          ...(userInfo.lastName !== undefined && { lastName: userInfo.lastName }),
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

  // ---- Set permissions (replace) ----
  async setPermissions(
    userId: string,
    permissions: { moduleId: string; featureId: string }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userModuleFeaturePermission.deleteMany({
        where: { userId },
      });

      if (permissions.length > 0) {
        await tx.userModuleFeaturePermission.createMany({
          data: permissions.map((p) => ({
            userId,
            moduleId: p.moduleId,
            featureId: p.featureId,
          })),
        });
      }
    });
  }

  // ---- Status ----
  updateStatus(id: string, status: HospitalUserStatus) {
    return this.prisma.hospitalUser.update({
      where: { id },
      data: { status },
    });
  }

  // ---- Reset password ----
  resetPassword(id: string, passwordHash: string) {
    return this.prisma.hospitalUser.update({
      where: { id },
      data: {
        passwordHash,
        isTemporaryPassword: true,
        forcePasswordChange: true,
      },
    });
  }
}