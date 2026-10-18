import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateLabDepartmentDto } from '../dto/lab-department/create-lab-department.dto';
import { UpdateLabDepartmentDto } from '../dto/lab-department/update-lab-department.dto';

@Injectable()
export class LabDepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateLabDepartmentDto) {
    return this.prisma.labDepartment.create({ data: { ...dto, tenantId } });
  }

  async findAll(tenantId: string, isActive?: boolean) {
    const departments = await this.prisma.labDepartment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        _count: { select: { investigations: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });

    // headUser is a plain String? (no FK) — hydrate names in one query
    const headUserIds = [
      ...new Set(
        departments.map((d) => d.headUserId).filter((id): id is string => !!id),
      ),
    ];
    const headUsers = headUserIds.length
      ? await this.prisma.hospitalUser.findMany({
          where: { id: { in: headUserIds }, tenantId },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const headById = new Map(headUsers.map((u) => [u.id, u]));

    return departments.map((d) => ({
      ...d,
      headUser: d.headUserId ? (headById.get(d.headUserId) ?? null) : null,
    }));
  }

  findById(tenantId: string, id: string) {
    return this.prisma.labDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  update(tenantId: string, id: string, dto: UpdateLabDepartmentDto) {
    return this.prisma.labDepartment.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.labDepartment.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  countActiveInvestigations(tenantId: string, labDepartmentId: string) {
    return this.prisma.investigation.count({
      where: { tenantId, labDepartmentId, deletedAt: null },
    });
  }

  findHeadUser(tenantId: string, headUserId: string) {
    return this.prisma.hospitalUser.findFirst({
      where: { id: headUserId, tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
    });
  }
}
