import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateHelpObservationDto } from './dto/create-help-observation.dto';
import { UpdateHelpObservationDto } from './dto/update-help-observation.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Help Observation Master (predefined response/help text). Tenant-scoped. */
@Injectable()
export class HelpObservationService {
  private readonly logger = new Logger(HelpObservationService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async assertObservation(tenantId: string, observationId: string) {
    const obs = await this.prisma.observation.findFirst({
      where: { id: observationId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!obs) throw new BadRequestException('Invalid observationId.');
    return obs;
  }

  async list(tenantId: string, observationId?: string) {
    return this.prisma.helpObservation.findMany({
      where: {
        tenantId, deletedAt: null,
        ...(observationId && { observationId }),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: { observation: { select: { id: true, name: true } } },
    });
  }

  async create(tenantId: string, dto: CreateHelpObservationDto, actor?: AuditActor) {
    const obs = await this.assertObservation(tenantId, dto.observationId);
    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.helpObservation.updateMany({
          where: { tenantId, observationId: dto.observationId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.helpObservation.create({
        data: {
          tenantId, observationId: dto.observationId, helpText: dto.helpText,
          isDefault: dto.isDefault ?? false, isActive: dto.isActive ?? true,
          createdBy: actor?.actorId, updatedBy: actor?.actorId,
        },
      });
    });
    if (actor) {
      await this.auditService.log({
        action: 'HELP_OBSERVATION_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'HelpObservation', targetId: created.id, targetName: obs.name,
        detail: `Help text added for '${obs.name}'`,
      });
    }
    return created;
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.helpObservation.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!item) throw new NotFoundException('Help observation not found.');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateHelpObservationDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    if (dto.observationId) await this.assertObservation(tenantId, dto.observationId);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.helpObservation.updateMany({
          where: { tenantId, observationId: dto.observationId ?? existing.observationId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.helpObservation.update({ where: { id }, data: { ...dto, updatedBy: actor?.actorId } });
    });
    if (actor) {
      await this.auditService.log({
        action: 'HELP_OBSERVATION_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'HelpObservation', targetId: updated.id, targetName: updated.observationId,
        detail: `Help text updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    await this.prisma.helpObservation.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'HELP_OBSERVATION_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'HelpObservation', targetId: existing.id, targetName: existing.observationId,
        detail: `Help text deleted`,
      });
    }
    return { message: 'Help text deleted.' };
  }
}
