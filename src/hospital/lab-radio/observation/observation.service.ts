import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';
import { QueryObservationDto } from './dto/query-observation.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Observation Master (analytes). Tenant-scoped. */
@Injectable()
export class ObservationService {
  private readonly logger = new Logger(ObservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateObservationDto, actor?: AuditActor) {
    const existing = await this.prisma.observation.findFirst({
      where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Observation '${dto.name}' already exists.`);
    }

    try {
      const created = await this.prisma.observation.create({
        data: {
          tenantId,
          name: dto.name,
          unit: dto.unit,
          resultType: dto.resultType ?? 'NUMERIC',
          formulaExpression: dto.formulaExpression,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'OBSERVATION_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'Observation',
          targetId: created.id,
          targetName: created.name,
          detail: `Observation '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Observation '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryObservationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ObservationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.resultType && { resultType: query.resultType }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.observation.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { investigations: true, referenceRanges: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.observation.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.observation.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, unit: true, resultType: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const obs = await this.prisma.observation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        referenceRanges: { where: { deletedAt: null } },
        helpObservations: { where: { deletedAt: null } },
      },
    });
    if (!obs) throw new NotFoundException('Observation not found.');
    return obs;
  }

  async update(tenantId: string, id: string, dto: UpdateObservationDto, actor?: AuditActor) {
    const existing = await this.prisma.observation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Observation not found.');

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.prisma.observation.findFirst({
        where: {
          tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Observation '${dto.name}' already exists.`);
    }

    const updated = await this.prisma.observation.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'OBSERVATION_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Observation',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Observation '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.observation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Observation not found.');

    const mapCount = await this.prisma.investigationObservation.count({
      where: { observationId: id },
    });
    if (mapCount > 0) {
      throw new ConflictException(
        `Cannot delete: this observation is used by ${mapCount} investigation(s).`,
      );
    }

    await this.prisma.observation.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'OBSERVATION_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Observation',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Observation '${existing.name}' deleted`,
      });
    }

    return { message: `Observation '${existing.name}' deleted.` };
  }
}
