import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateClinicalDepartmentDto } from './dto/create-clinical-department.dto';
import { UpdateClinicalDepartmentDto } from './dto/update-clinical-department.dto';
import { QueryClinicalDepartmentDto } from './dto/query-clinical-department.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Clinical Department Master. Tenant-scoped (ENT, Cardiology, Paediatrics...). */
@Injectable()
export class ClinicalDepartmentService {
  private readonly logger = new Logger(ClinicalDepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateClinicalDepartmentDto, actor?: AuditActor) {
    const existing = await this.prisma.clinicalDepartment.findFirst({
      where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Clinical department '${dto.name}' already exists.`);
    }

    try {
      const created = await this.prisma.clinicalDepartment.create({
        data: { tenantId, name: dto.name, code: dto.code, isActive: dto.isActive ?? true },
      });

      if (actor) {
        await this.auditService.log({
          action: 'CLINICAL_DEPARTMENT_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'ClinicalDepartment',
          targetId: created.id,
          targetName: created.name,
          detail: `Clinical department '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Clinical department '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryClinicalDepartmentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ClinicalDepartmentWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.clinicalDepartment.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { specializations: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.clinicalDepartment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.clinicalDepartment.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const dept = await this.prisma.clinicalDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!dept) throw new NotFoundException('Clinical department not found.');
    return dept;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateClinicalDepartmentDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.clinicalDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Clinical department not found.');

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.prisma.clinicalDepartment.findFirst({
        where: {
          tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Clinical department '${dto.name}' already exists.`);
    }

    const updated = await this.prisma.clinicalDepartment.update({
      where: { id },
      data: { ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'CLINICAL_DEPARTMENT_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ClinicalDepartment',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Clinical department '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.clinicalDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Clinical department not found.');

    const childCount = await this.prisma.doctorSpecialization.count({
      where: { clinicalDepartmentId: id, deletedAt: null },
    });
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${childCount} specialization(s) reference this department.`,
      );
    }

    await this.prisma.clinicalDepartment.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'CLINICAL_DEPARTMENT_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ClinicalDepartment',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Clinical department '${existing.name}' deleted`,
      });
    }

    return { message: `Clinical department '${existing.name}' deleted.` };
  }
}
