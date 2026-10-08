import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateClinicalDepartmentDto } from '../dto/clinical-department/create-clinical-department.dto';
import { UpdateClinicalDepartmentDto } from '../dto/clinical-department/update-clinical-department.dto';

@Injectable()
export class ClinicalDepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateClinicalDepartmentDto) {
    return this.prisma.clinicalDepartment.create({
      data: { ...dto, tenantId },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.clinicalDepartment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        _count: {
          select: {
            specializations: { where: { deletedAt: null } },
            doctorProfiles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.clinicalDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        specializations: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  update(tenantId: string, id: string, dto: UpdateClinicalDepartmentDto) {
    return this.prisma.clinicalDepartment.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.clinicalDepartment.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Delete guards ──────────────────────────────────────────────────────────

  countActiveSpecializations(tenantId: string, departmentId: string) {
    return this.prisma.specialization.count({
      where: { tenantId, clinicalDepartmentId: departmentId, deletedAt: null },
    });
  }

  countLinkedDoctors(tenantId: string, departmentId: string) {
    return this.prisma.doctorProfile.count({
      where: { tenantId, clinicalDepartmentId: departmentId },
    });
  }
}
