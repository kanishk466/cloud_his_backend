import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AntibioticClass } from '@prisma/client';
import { CreateAntibioticDto } from '../dto/antibiotic/create-antibiotic.dto';
import { UpdateAntibioticDto } from '../dto/antibiotic/update-antibiotic.dto';

@Injectable()
export class AntibioticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateAntibioticDto) {
    return this.prisma.antibioticMaster.create({ data: { ...dto, tenantId } });
  }

  findAll(
    tenantId: string,
    filters: {
      antibioticClass?: AntibioticClass;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.antibioticMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.antibioticClass
          ? { antibioticClass: filters.antibioticClass }
          : {}),
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
      include: { _count: { select: { organismPanels: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.antibioticMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  update(tenantId: string, id: string, dto: UpdateAntibioticDto) {
    return this.prisma.antibioticMaster.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.antibioticMaster.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  countUsages(antibioticId: string) {
    return this.prisma.organismAntibioticMapping.count({
      where: { antibioticId },
    });
  }
}
