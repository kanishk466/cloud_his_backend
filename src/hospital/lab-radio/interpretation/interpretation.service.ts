import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateInterpretationDto } from './dto/create-interpretation.dto';
import { UpdateInterpretationDto } from './dto/update-interpretation.dto';
import { QueryInterpretationDto } from './dto/query-interpretation.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Interpretation Master (clinical guidance). Tenant-scoped. */
@Injectable()
export class InterpretationService {
  private readonly logger = new Logger(InterpretationService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async assertObservation(tenantId: string, observationId?: string) {
    if (!observationId) return;
    const obs = await this.prisma.observation.findFirst({
      where: { id: observationId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!obs) throw new BadRequestException('Invalid observationId.');
  }

  async create(tenantId: string, dto: CreateInterpretationDto, actor?: AuditActor) {
    await this.assertObservation(tenantId, dto.observationId);
    const created = await this.prisma.interpretationMaster.create({
      data: {
        tenantId, observationId: dto.observationId, title: dto.title, bodyHtml: dto.bodyHtml,
        isActive: dto.isActive ?? true, createdBy: actor?.actorId, updatedBy: actor?.actorId,
      },
    });
    if (actor) {
      await this.auditService.log({
        action: 'INTERPRETATION_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'InterpretationMaster', targetId: created.id,
        targetName: created.title ?? 'Interpretation', detail: `Interpretation created`,
      });
    }
    return created;
  }

  async list(tenantId: string, query: QueryInterpretationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InterpretationMasterWhereInput = {
      tenantId, deletedAt: null,
      ...(query.observationId && { observationId: query.observationId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { bodyHtml: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.interpretationMaster.findMany({
        where, orderBy: { createdAt: 'desc' },
        include: { observation: { select: { id: true, name: true } } },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.interpretationMaster.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.interpretationMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Interpretation not found.');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateInterpretationDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    void existing;
    if (dto.observationId) await this.assertObservation(tenantId, dto.observationId);
    const updated = await this.prisma.interpretationMaster.update({
      where: { id }, data: { ...dto, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'INTERPRETATION_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'InterpretationMaster', targetId: updated.id,
        targetName: updated.title ?? 'Interpretation', detail: `Interpretation updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    await this.prisma.interpretationMaster.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'INTERPRETATION_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'InterpretationMaster', targetId: existing.id,
        targetName: existing.title ?? 'Interpretation', detail: `Interpretation deleted`,
      });
    }
    return { message: 'Interpretation deleted.' };
  }
}
