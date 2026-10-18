import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateObservationHelpDto } from '../dto/observation-help/create-observation-help.dto';
import { UpdateObservationHelpDto } from '../dto/observation-help/update-observation-help.dto';

@Injectable()
export class ObservationHelpsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateObservationHelpDto) {
    return this.prisma.observationHelp.create({ data: { ...dto, tenantId } });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.observationHelp.findMany({
      where: {
        tenantId,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { helpTitle: 'asc' }],
    });
  }

  findForObservation(tenantId: string, observationId: string) {
    return this.prisma.observationHelp.findMany({
      where: { tenantId, observationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Aggregated help for every observation inside an investigation (entry screen). */
  async findForInvestigation(tenantId: string, investigationId: string) {
    const mappings = await this.prisma.investigationObservationMapping.findMany(
      {
        where: {
          investigationId,
          investigation: { tenantId, deletedAt: null },
        },
        orderBy: { sortOrder: 'asc' },
        include: {
          observation: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: true,
              dataType: true,
              helps: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      },
    );

    return mappings.map((m) => ({
      sortOrder: m.sortOrder,
      observation: {
        id: m.observation.id,
        name: m.observation.name,
        code: m.observation.code,
        unit: m.observation.unit,
        dataType: m.observation.dataType,
      },
      helps: m.observation.helps,
    }));
  }

  findById(tenantId: string, id: string) {
    return this.prisma.observationHelp.findFirst({ where: { id, tenantId } });
  }

  update(tenantId: string, id: string, dto: UpdateObservationHelpDto) {
    return this.prisma.observationHelp.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  remove(tenantId: string, id: string) {
    return this.prisma.observationHelp.delete({ where: { id, tenantId } });
  }

  findObservation(tenantId: string, observationId: string) {
    return this.prisma.observation.findFirst({
      where: { id: observationId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }

  findInvestigation(tenantId: string, investigationId: string) {
    return this.prisma.investigation.findFirst({
      where: { id: investigationId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }
}
