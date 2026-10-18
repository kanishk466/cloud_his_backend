import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateInterpretationDto } from '../dto/interpretation/create-interpretation.dto';
import { InterpretationItemDto } from '../dto/interpretation/bulk-create-interpretations.dto';

@Injectable()
export class InterpretationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateInterpretationDto) {
    return this.prisma.investigationInterpretation.create({
      data: { ...dto, tenantId },
    });
  }

  /** Replace ALL rules of an observation atomically. */
  async replaceForObservation(
    tenantId: string,
    observationId: string,
    items: InterpretationItemDto[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.investigationInterpretation.deleteMany({
        where: { tenantId, observationId },
      });

      if (items.length > 0) {
        await tx.investigationInterpretation.createMany({
          data: items.map((item, index) => ({
            ...item,
            sortOrder: item.sortOrder ?? index,
            tenantId,
            observationId,
          })),
        });
      }

      return tx.investigationInterpretation.findMany({
        where: { tenantId, observationId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  findForObservation(
    tenantId: string,
    observationId: string,
    activeOnly = true,
  ) {
    return this.prisma.investigationInterpretation.findMany({
      where: {
        tenantId,
        observationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.investigationInterpretation.findFirst({
      where: { id, tenantId },
    });
  }

  update(tenantId: string, id: string, dto: Partial<CreateInterpretationDto>) {
    return this.prisma.investigationInterpretation.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  remove(tenantId: string, id: string) {
    return this.prisma.investigationInterpretation.delete({
      where: { id, tenantId },
    });
  }

  findObservation(tenantId: string, observationId: string) {
    return this.prisma.observation.findFirst({
      where: { id: observationId, tenantId, deletedAt: null },
      select: { id: true, name: true, code: true, dataType: true },
    });
  }
}
