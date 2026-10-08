import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { OrganismType } from '@prisma/client';
import { CreateOrganismDto } from '../dto/organism/create-organism.dto';
import { UpdateOrganismDto } from '../dto/organism/update-organism.dto';
import { OrganismAntibioticItemDto } from '../dto/organism-antibiotic-mapping/sync-organism-antibiotics.dto';

@Injectable()
export class OrganismsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateOrganismDto) {
    return this.prisma.organismMaster.create({ data: { ...dto, tenantId } });
  }

  findAll(
    tenantId: string,
    filters: {
      organismType?: OrganismType;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.organismMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.organismType ? { organismType: filters.organismType } : {}),
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
      include: { _count: { select: { standardPanels: true } } },
      orderBy: [{ isCommon: 'desc' }, { name: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.organismMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  update(tenantId: string, id: string, dto: UpdateOrganismDto) {
    return this.prisma.organismMaster.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.organismMaster.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── AST panel (atomic replace) + battery retrieval ─────────────────────────

  async replacePanel(organismId: string, panel: OrganismAntibioticItemDto[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.organismAntibioticMapping.deleteMany({ where: { organismId } });

      await tx.organismAntibioticMapping.createMany({
        data: panel.map((item, index) => ({
          organismId,
          antibioticId: item.antibioticId,
          sortOrder: item.sortOrder ?? index,
          isFirstLine: item.isFirstLine ?? true,
        })),
      });

      return tx.organismAntibioticMapping.findMany({
        where: { organismId },
        orderBy: [{ isFirstLine: 'desc' }, { sortOrder: 'asc' }],
        include: { antibiotic: true },
      });
    });
  }

  /** Ordered AST battery: first-line drugs first, then by sortOrder. */
  getAstBattery(organismId: string) {
    return this.prisma.organismAntibioticMapping.findMany({
      where: { organismId, antibiotic: { isActive: true } },
      orderBy: [{ isFirstLine: 'desc' }, { sortOrder: 'asc' }],
      include: { antibiotic: true },
    });
  }

  findAntibioticsByIds(tenantId: string, ids: string[]) {
    return this.prisma.antibioticMaster.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  }
}
