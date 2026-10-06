import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { SetInvestigationObservationsDto } from './dto/set-investigation-observations.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Maps observations to an investigation (many-to-many). Tenant-scoped. */
@Injectable()
export class InvestigationObservationService {
  private readonly logger = new Logger(InvestigationObservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(tenantId: string, investigationId: string) {
    const inv = await this.prisma.investigation.findFirst({
      where: { id: investigationId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!inv) throw new NotFoundException('Investigation not found.');

    return this.prisma.investigationObservation.findMany({
      where: { tenantId, investigationId },
      orderBy: { displayOrder: 'asc' },
      include: { observation: true },
    });
  }

  /** Replace the full set of observations for an investigation. */
  async set(
    tenantId: string,
    investigationId: string,
    dto: SetInvestigationObservationsDto,
    actor?: AuditActor,
  ) {
    const inv = await this.prisma.investigation.findFirst({
      where: { id: investigationId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!inv) throw new NotFoundException('Investigation not found.');

    const observationIds = Array.from(new Set(dto.observations.map((o) => o.observationId)));
    if (observationIds.length > 0) {
      const found = await this.prisma.observation.count({
        where: { id: { in: observationIds }, tenantId, deletedAt: null },
      });
      if (found !== observationIds.length) {
        throw new BadRequestException('One or more observationIds are invalid.');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.investigationObservation.deleteMany({ where: { tenantId, investigationId } });

      if (dto.observations.length > 0) {
        await tx.investigationObservation.createMany({
          data: dto.observations.map((o, idx) => ({
            tenantId,
            investigationId,
            observationId: o.observationId,
            displayOrder: o.displayOrder ?? idx,
            isRequired: o.isRequired ?? true,
            createdBy: actor?.actorId,
          })),
        });
      }

      return tx.investigationObservation.findMany({
        where: { tenantId, investigationId },
        orderBy: { displayOrder: 'asc' },
        include: { observation: true },
      });
    });

    if (actor) {
      await this.auditService.log({
        action: 'INVESTIGATION_OBSERVATIONS_SET',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Investigation',
        targetId: investigationId,
        targetName: inv.name,
        detail: `${result.length} observation(s) mapped to investigation '${inv.name}'`,
      });
    }

    return result;
  }

  async remove(tenantId: string, investigationId: string, observationId: string, actor?: AuditActor) {
    const mapping = await this.prisma.investigationObservation.findFirst({
      where: { tenantId, investigationId, observationId },
    });
    if (!mapping) throw new NotFoundException('Mapping not found.');

    await this.prisma.investigationObservation.delete({
      where: { tenantId_investigationId_observationId: { tenantId, investigationId, observationId } },
    });

    if (actor) {
      await this.auditService.log({
        action: 'INVESTIGATION_OBSERVATION_REMOVED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Investigation',
        targetId: investigationId,
        targetName: investigationId,
        detail: `Observation ${observationId} removed from investigation`,
      });
    }

    return { message: 'Observation removed from investigation.' };
  }
}
