import {
  Injectable, ConflictException, NotFoundException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateOutsourceLabDto } from './dto/create-outsource-lab.dto';
import { UpdateOutsourceLabDto } from './dto/update-outsource-lab.dto';
import { QueryOutsourceLabDto } from './dto/query-outsource-lab.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Outsource Lab Master (3rd-party labs). Tenant-scoped. */
@Injectable()
export class OutsourceLabService {
  private readonly logger = new Logger(OutsourceLabService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  async create(tenantId: string, dto: CreateOutsourceLabDto, actor?: AuditActor) {
    const existing = await this.prisma.outsourceLab.findFirst({
      where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Outsource lab '${dto.name}' already exists.`);
    try {
      const created = await this.prisma.outsourceLab.create({
        data: {
          tenantId, name: dto.name, address: dto.address, contactPerson: dto.contactPerson,
          mobile: dto.mobile, email: dto.email, defaultTat: dto.defaultTat,
          isActive: dto.isActive ?? true, createdBy: actor?.actorId, updatedBy: actor?.actorId,
        },
      });
      if (actor) {
        await this.auditService.log({
          action: 'OUTSOURCE_LAB_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
          tenantId, targetType: 'OutsourceLab', targetId: created.id, targetName: created.name,
          detail: `Outsource lab '${created.name}' created`,
        });
      }
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Outsource lab '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryOutsourceLabDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.OutsourceLabWhereInput = {
      tenantId, deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.outsourceLab.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.outsourceLab.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.outsourceLab.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, defaultTat: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const o = await this.prisma.outsourceLab.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!o) throw new NotFoundException('Outsource lab not found.');
    return o;
  }

  async update(tenantId: string, id: string, dto: UpdateOutsourceLabDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.prisma.outsourceLab.findFirst({
        where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Outsource lab '${dto.name}' already exists.`);
    }
    const updated = await this.prisma.outsourceLab.update({ where: { id }, data: { ...dto, updatedBy: actor?.actorId } });
    if (actor) {
      await this.auditService.log({
        action: 'OUTSOURCE_LAB_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'OutsourceLab', targetId: updated.id, targetName: updated.name,
        detail: `Outsource lab '${updated.name}' updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    const invCount = await this.prisma.investigation.count({ where: { outsourceLabId: id, deletedAt: null } });
    if (invCount > 0) {
      throw new ConflictException(`Cannot delete: ${invCount} investigation(s) outsource to this lab.`);
    }
    await this.prisma.outsourceLab.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'OUTSOURCE_LAB_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'OutsourceLab', targetId: existing.id, targetName: existing.name,
        detail: `Outsource lab '${existing.name}' deleted`,
      });
    }
    return { message: `Outsource lab '${existing.name}' deleted.` };
  }
}
