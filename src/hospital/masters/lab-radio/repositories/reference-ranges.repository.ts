import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateReferenceRangeDto } from '../dto/reference-range/create-reference-range.dto';
import { ReferenceRangeItemDto } from '../dto/reference-range/bulk-create-reference-ranges.dto';

@Injectable()
export class ReferenceRangesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateReferenceRangeDto) {
    return this.prisma.referenceRange.create({
      data: { ...dto, gender: dto.gender ?? null, tenantId },
    });
  }

  /** Replace ALL ranges of an observation atomically. */
  async replaceForObservation(
    tenantId: string,
    observationId: string,
    ranges: ReferenceRangeItemDto[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.referenceRange.deleteMany({
        where: { tenantId, observationId },
      });

      if (ranges.length > 0) {
        await tx.referenceRange.createMany({
          data: ranges.map((r) => ({
            ...r,
            gender: r.gender ?? null,
            tenantId,
            observationId,
          })),
        });
      }

      return tx.referenceRange.findMany({
        where: { tenantId, observationId },
        orderBy: [{ gender: 'asc' }, { minAgeYears: 'asc' }],
      });
    });
  }

  findForObservation(
    tenantId: string,
    observationId: string,
    activeOnly = true,
  ) {
    return this.prisma.referenceRange.findMany({
      where: {
        tenantId,
        observationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ gender: 'asc' }, { minAgeYears: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.referenceRange.findFirst({ where: { id, tenantId } });
  }

  remove(tenantId: string, id: string) {
    return this.prisma.referenceRange.delete({ where: { id, tenantId } });
  }

  findObservation(tenantId: string, observationId: string) {
    return this.prisma.observation.findFirst({
      where: { id: observationId, tenantId, deletedAt: null },
      select: { id: true, name: true, code: true, dataType: true },
    });
  }
}
