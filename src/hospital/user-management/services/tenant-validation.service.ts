import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface TenantRefs {
  primaryRoleId?: number;
  additionalRoleIds?: number[];
  departmentIds?: number[];
  shiftId?: number;
  // HospitalUser.id is still a uuid string — only the Int-migrated
  // masters (roles, departments, shifts) take numeric ids.
  reportingManagerId?: string;
}

@Injectable()
export class TenantValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateReferences(hospitalId: number, refs: TenantRefs): Promise<void> {
    const errors: Array<{ field: string; ids: Array<string | number> }> = [];

    const additionalRoleIds = refs.additionalRoleIds?.filter((id): id is number => Boolean(id)) ?? [];
    const roleIds = [refs.primaryRoleId, ...additionalRoleIds].filter(
      (id): id is number => Boolean(id),
    );
    const departmentIds = refs.departmentIds?.filter((id): id is number => Boolean(id)) ?? [];
    const shiftId = refs.shiftId ? [refs.shiftId] : [];
    const reportingManagerId = refs.reportingManagerId ? [refs.reportingManagerId] : [];

    if (roleIds.length > 0) {
      const roles = await this.prisma.hospitalRole.findMany({
        where: { id: { in: roleIds }, hospitalId },
        select: { id: true },
      });
      const validRoleIds = new Set(roles.map((role) => role.id));

      if (refs.primaryRoleId && !validRoleIds.has(refs.primaryRoleId)) {
        errors.push({ field: 'primaryRoleId', ids: [refs.primaryRoleId] });
      }

      const invalidAdditionalRoleIds = additionalRoleIds.filter((id) => !validRoleIds.has(id));
      if (invalidAdditionalRoleIds.length > 0) {
        errors.push({ field: 'additionalRoleIds', ids: invalidAdditionalRoleIds });
      }
    }

    if (departmentIds.length > 0) {
      const departments = await this.prisma.department.findMany({
        where: { id: { in: departmentIds }, hospitalId },
        select: { id: true },
      });
      const validDepartmentIds = new Set(departments.map((department) => department.id));
      const invalidDepartmentIds = departmentIds.filter((id) => !validDepartmentIds.has(id));
      if (invalidDepartmentIds.length > 0) {
        errors.push({ field: 'departmentIds', ids: invalidDepartmentIds });
      }
    }

    if (shiftId.length > 0) {
      const shifts = await this.prisma.shiftMaster.findMany({
        where: { id: { in: shiftId }, hospitalId },
        select: { id: true },
      });
      const validShiftIds = new Set(shifts.map((shift) => shift.id));
      const invalidShiftIds = shiftId.filter((id) => !validShiftIds.has(id));
      if (invalidShiftIds.length > 0) {
        errors.push({ field: 'shiftId', ids: invalidShiftIds });
      }
    }

    if (reportingManagerId.length > 0) {
      const managers = await this.prisma.hospitalUser.findMany({
        where: { id: { in: reportingManagerId }, hospitalId },
        select: { id: true },
      });
      const validManagerIds = new Set(managers.map((manager) => manager.id));
      const invalidManagerIds = reportingManagerId.filter((id) => !validManagerIds.has(id));
      if (invalidManagerIds.length > 0) {
        errors.push({ field: 'reportingManagerId', ids: invalidManagerIds });
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid tenant references provided',
        errors,
      });
    }
  }
}
