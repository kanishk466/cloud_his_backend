import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateSpecializationDto } from '../dto/specialization/create-specialization.dto';
import { UpdateSpecializationDto } from '../dto/specialization/update-specialization.dto';

const DEPARTMENT_SELECT = {
  select: { id: true, name: true, code: true },
} as const;

@Injectable()
export class SpecializationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateSpecializationDto) {
    return this.prisma.specialization.create({
      data: { ...dto, tenantId },
      include: { clinicalDepartment: DEPARTMENT_SELECT },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.specialization.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        clinicalDepartment: DEPARTMENT_SELECT,
        _count: { select: { doctorProfiles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Dropdown source: specializations of one clinical department. */
  findByDepartment(tenantId: string, departmentId: string, isActive?: boolean) {
    return this.prisma.specialization.findMany({
      where: {
        tenantId,
        clinicalDepartmentId: departmentId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: { clinicalDepartment: DEPARTMENT_SELECT },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.specialization.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { clinicalDepartment: DEPARTMENT_SELECT },
    });
  }

  update(tenantId: string, id: string, dto: UpdateSpecializationDto) {
    return this.prisma.specialization.update({
      where: { id, tenantId },
      data: dto,
      include: { clinicalDepartment: DEPARTMENT_SELECT },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.specialization.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Delete guard ───────────────────────────────────────────────────────────

  countLinkedDoctors(tenantId: string, specializationId: string) {
    return this.prisma.doctorProfile.count({
      where: { tenantId, specializationId },
    });
  }
}
