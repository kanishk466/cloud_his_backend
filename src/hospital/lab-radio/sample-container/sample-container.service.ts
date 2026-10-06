import {
  Injectable, ConflictException, NotFoundException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateSampleContainerDto } from './dto/create-sample-container.dto';
import { UpdateSampleContainerDto } from './dto/update-sample-container.dto';
import { QuerySampleContainerDto } from './dto/query-sample-container.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Sample Container Master (tube types). Tenant-scoped. */
@Injectable()
export class SampleContainerService {
  private readonly logger = new Logger(SampleContainerService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  async create(tenantId: string, dto: CreateSampleContainerDto, actor?: AuditActor) {
    const existing = await this.prisma.sampleContainer.findFirst({
      where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Container '${dto.name}' already exists.`);
    try {
      const created = await this.prisma.sampleContainer.create({
        data: {
          tenantId, name: dto.name, color: dto.color, sampleQuantityMl: dto.sampleQuantityMl,
          isActive: dto.isActive ?? true, createdBy: actor?.actorId, updatedBy: actor?.actorId,
        },
      });
      if (actor) {
        await this.auditService.log({
          action: 'SAMPLE_CONTAINER_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
          tenantId, targetType: 'SampleContainer', targetId: created.id, targetName: created.name,
          detail: `Sample container '${created.name}' created`,
        });
      }
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Container '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QuerySampleContainerDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SampleContainerWhereInput = {
      tenantId, deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.sampleContainer.findMany({
        where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.sampleContainer.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.sampleContainer.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true, sampleQuantityMl: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.sampleContainer.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Sample container not found.');
    return c;
  }

  async update(tenantId: string, id: string, dto: UpdateSampleContainerDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.prisma.sampleContainer.findFirst({
        where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Container '${dto.name}' already exists.`);
    }
    const updated = await this.prisma.sampleContainer.update({ where: { id }, data: { ...dto, updatedBy: actor?.actorId } });
    if (actor) {
      await this.auditService.log({
        action: 'SAMPLE_CONTAINER_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'SampleContainer', targetId: updated.id, targetName: updated.name,
        detail: `Sample container '${updated.name}' updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    const childCount = await this.prisma.sampleType.count({ where: { containerId: id, deletedAt: null } });
    if (childCount > 0) {
      throw new ConflictException(`Cannot delete: ${childCount} sample type(s) use this container.`);
    }
    await this.prisma.sampleContainer.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'SAMPLE_CONTAINER_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'SampleContainer', targetId: existing.id, targetName: existing.name,
        detail: `Sample container '${existing.name}' deleted`,
      });
    }
    return { message: `Sample container '${existing.name}' deleted.` };
  }
}
