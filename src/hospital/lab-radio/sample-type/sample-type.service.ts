import {
  Injectable, ConflictException, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateSampleTypeDto } from './dto/create-sample-type.dto';
import { UpdateSampleTypeDto } from './dto/update-sample-type.dto';
import { QuerySampleTypeDto } from './dto/query-sample-type.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Sample Type Master. Tenant-scoped, under a SampleContainer. */
@Injectable()
export class SampleTypeService {
  private readonly logger = new Logger(SampleTypeService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async assertContainer(tenantId: string, containerId: string) {
    const c = await this.prisma.sampleContainer.findFirst({
      where: { id: containerId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!c) throw new BadRequestException('Invalid containerId.');
  }

  async create(tenantId: string, dto: CreateSampleTypeDto, actor?: AuditActor) {
    await this.assertContainer(tenantId, dto.containerId);
    const existing = await this.prisma.sampleType.findFirst({
      where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Sample type '${dto.name}' already exists.`);
    try {
      const created = await this.prisma.sampleType.create({
        data: {
          tenantId, name: dto.name, containerId: dto.containerId, archiveDays: dto.archiveDays,
          isActive: dto.isActive ?? true, createdBy: actor?.actorId, updatedBy: actor?.actorId,
        },
      });
      if (actor) {
        await this.auditService.log({
          action: 'SAMPLE_TYPE_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
          tenantId, targetType: 'SampleType', targetId: created.id, targetName: created.name,
          detail: `Sample type '${created.name}' created`,
        });
      }
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Sample type '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QuerySampleTypeDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SampleTypeWhereInput = {
      tenantId, deletedAt: null,
      ...(query.containerId && { containerId: query.containerId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.sampleType.findMany({
        where, orderBy: { name: 'asc' },
        include: { container: { select: { id: true, name: true, color: true } } },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.sampleType.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, containerId?: string) {
    return this.prisma.sampleType.findMany({
      where: { tenantId, deletedAt: null, isActive: true, ...(containerId && { containerId }) },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, containerId: true, archiveDays: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const st = await this.prisma.sampleType.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { container: true },
    });
    if (!st) throw new NotFoundException('Sample type not found.');
    return st;
  }

  async update(tenantId: string, id: string, dto: UpdateSampleTypeDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    if (dto.containerId) await this.assertContainer(tenantId, dto.containerId);
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.prisma.sampleType.findFirst({
        where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Sample type '${dto.name}' already exists.`);
    }
    const updated = await this.prisma.sampleType.update({ where: { id }, data: { ...dto, updatedBy: actor?.actorId } });
    if (actor) {
      await this.auditService.log({
        action: 'SAMPLE_TYPE_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'SampleType', targetId: updated.id, targetName: updated.name,
        detail: `Sample type '${updated.name}' updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    const invCount = await this.prisma.investigation.count({ where: { sampleTypeId: id, deletedAt: null } });
    if (invCount > 0) {
      throw new ConflictException(`Cannot delete: ${invCount} investigation(s) use this sample type.`);
    }
    await this.prisma.sampleType.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'SAMPLE_TYPE_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'SampleType', targetId: existing.id, targetName: existing.name,
        detail: `Sample type '${existing.name}' deleted`,
      });
    }
    return { message: `Sample type '${existing.name}' deleted.` };
  }
}
