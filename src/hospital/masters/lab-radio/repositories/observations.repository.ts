import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { ObservationDataType } from '@prisma/client';
import { CreateObservationDto } from '../dto/observation/create-observation.dto';
import { UpdateObservationDto } from '../dto/observation/update-observation.dto';

@Injectable()
export class ObservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateObservationDto) {
    return this.prisma.observation.create({ data: { ...dto, tenantId } });
  }

  findAll(
    tenantId: string,
    filters: {
      dataType?: ObservationDataType;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.observation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.dataType ? { dataType: filters.dataType } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  name: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  code: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { investigations: true, referenceRanges: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.observation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  findByIds(tenantId: string, ids: string[]) {
    return this.prisma.observation.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  }

  /** Reverse lookup: investigations that use this observation. */
  findUsedIn(tenantId: string, observationId: string) {
    return this.prisma.investigationObservationMapping.findMany({
      where: {
        observationId,
        investigation: { tenantId, deletedAt: null },
      },
      include: {
        investigation: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            labDepartment: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  update(tenantId: string, id: string, dto: UpdateObservationDto) {
    return this.prisma.observation.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.observation.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  countUsages(observationId: string) {
    return this.prisma.investigationObservationMapping.count({
      where: { observationId },
    });
  }
}
