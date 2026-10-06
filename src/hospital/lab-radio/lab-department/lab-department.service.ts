import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateLabDepartmentDto } from './dto/create-lab-department.dto';
import { UpdateLabDepartmentDto } from './dto/update-lab-department.dto';
import { QueryLabDepartmentDto } from './dto/query-lab-department.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Lab / Radio Department Master. Tenant-scoped. */
@Injectable()
export class LabDepartmentService {
  private readonly logger = new Logger(LabDepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateLabDepartmentDto, actor?: AuditActor) {
    const existing = await this.prisma.labDepartment.findFirst({
      where: {
        tenantId,
        category: dto.category,
        name: { equals: dto.name, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`Department '${dto.name}' already exists in ${dto.category}.`);
    }

    try {
      const created = await this.prisma.labDepartment.create({
        data: {
          tenantId,
          category: dto.category,
          name: dto.name,
          description: dto.description,
          allowTemplates: dto.allowTemplates ?? false,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'LAB_DEPARTMENT_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'LabDepartment',
          targetId: created.id,
          targetName: created.name,
          detail: `Lab department '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Department '${dto.name}' already exists in ${dto.category}.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryLabDepartmentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LabDepartmentWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.category && { category: query.category }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.labDepartment.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { investigations: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.labDepartment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, category?: string) {
    return this.prisma.labDepartment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(category && { category: category as any }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, category: true, name: true, allowTemplates: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const dept = await this.prisma.labDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!dept) throw new NotFoundException('Lab department not found.');
    return dept;
  }

  async update(tenantId: string, id: string, dto: UpdateLabDepartmentDto, actor?: AuditActor) {
    const existing = await this.prisma.labDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Lab department not found.');

    const targetName = dto.name ?? existing.name;
    const targetCategory = dto.category ?? existing.category;
    if (targetName.toLowerCase() !== existing.name.toLowerCase() || targetCategory !== existing.category) {
      const dup = await this.prisma.labDepartment.findFirst({
        where: {
          tenantId,
          category: targetCategory,
          name: { equals: targetName, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Department '${targetName}' already exists in ${targetCategory}.`);
    }

    const updated = await this.prisma.labDepartment.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'LAB_DEPARTMENT_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'LabDepartment',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Lab department '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.labDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Lab department not found.');

    const invCount = await this.prisma.investigation.count({
      where: { departmentId: id, deletedAt: null },
    });
    if (invCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${invCount} investigation(s) reference this department.`,
      );
    }

    await this.prisma.labDepartment.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'LAB_DEPARTMENT_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'LabDepartment',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Lab department '${existing.name}' deleted`,
      });
    }

    return { message: `Lab department '${existing.name}' deleted.` };
  }
}
