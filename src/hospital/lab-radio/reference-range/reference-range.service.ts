import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateReferenceRangeDto } from './dto/create-reference-range.dto';
import { UpdateReferenceRangeDto } from './dto/update-reference-range.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Observation Reference Ranges (min/max per gender+age). Tenant-scoped. */
@Injectable()
export class ReferenceRangeService {
  private readonly logger = new Logger(ReferenceRangeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertObservation(tenantId: string, observationId: string) {
    const obs = await this.prisma.observation.findFirst({
      where: { id: observationId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!obs) throw new BadRequestException('Invalid observationId.');
    return obs;
  }

  async list(tenantId: string, observationId: string) {
    await this.assertObservation(tenantId, observationId);
    return this.prisma.observationReferenceRange.findMany({
      where: { tenantId, observationId, deletedAt: null },
      orderBy: [{ gender: 'asc' }, { minAge: 'asc' }],
    });
  }

  async create(
    tenantId: string,
    observationId: string,
    dto: CreateReferenceRangeDto,
    actor?: AuditActor,
  ) {
    const obs = await this.assertObservation(tenantId, observationId);

    const created = await this.prisma.observationReferenceRange.create({
      data: {
        tenantId,
        observationId,
        gender: dto.gender ?? 'ANY',
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        ageUnit: dto.ageUnit ?? 'YEARS',
        minValue: dto.minValue,
        maxValue: dto.maxValue,
        panicLow: dto.panicLow,
        panicHigh: dto.panicHigh,
        description: dto.description,
        isActive: dto.isActive ?? true,
        createdBy: actor?.actorId,
        updatedBy: actor?.actorId,
      },
    });

    if (actor) {
      await this.auditService.log({
        action: 'REFERENCE_RANGE_CREATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ObservationReferenceRange',
        targetId: created.id,
        targetName: obs.name,
        detail: `Reference range added for '${obs.name}'`,
      });
    }

    return created;
  }

  async update(
    tenantId: string,
    observationId: string,
    id: string,
    dto: UpdateReferenceRangeDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.observationReferenceRange.findFirst({
      where: { id, tenantId, observationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Reference range not found.');

    const updated = await this.prisma.observationReferenceRange.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'REFERENCE_RANGE_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ObservationReferenceRange',
        targetId: updated.id,
        targetName: observationId,
        detail: `Reference range updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, observationId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.observationReferenceRange.findFirst({
      where: { id, tenantId, observationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Reference range not found.');

    await this.prisma.observationReferenceRange.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'REFERENCE_RANGE_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ObservationReferenceRange',
        targetId: existing.id,
        targetName: observationId,
        detail: `Reference range deleted`,
      });
    }

    return { message: 'Reference range deleted.' };
  }
}
