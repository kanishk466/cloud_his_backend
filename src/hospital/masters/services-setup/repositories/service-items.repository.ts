import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { ServiceItemType } from '@prisma/client';
import { CreateServiceItemDto } from '../dto/service-item/create-service-item.dto';
import { UpdateServiceItemDto } from '../dto/service-item/update-service-item.dto';

const RELATION_SELECT = {
  categoryRel: { select: { id: true, name: true, code: true } },
  subCategoryRel: {
    select: {
      id: true,
      name: true,
      code: true,
      displayName: true,
      printOrder: true,
    },
  },
} as const;

export interface ServiceItemFilters {
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  itemType?: ServiceItemType;
  isActive?: boolean;
}

@Injectable()
export class ServiceItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Service Code Generation (SVC-0001, SVC-0002, …) ───────────────────────

  async generateServiceCode(tenantId: string): Promise<string> {
    const existing = await this.prisma.serviceMaster.findMany({
      where: { tenantId, serviceCode: { startsWith: 'SVC-' } },
      select: { serviceCode: true },
    });

    let max = 0;
    for (const { serviceCode } of existing) {
      const num = parseInt(serviceCode.replace('SVC-', ''), 10);
      if (!Number.isNaN(num) && num > max) max = num;
    }
    return `SVC-${String(max + 1).padStart(4, '0')}`;
  }

  findByCode(tenantId: string, serviceCode: string) {
    return this.prisma.serviceMaster.findFirst({
      where: { tenantId, serviceCode, deletedAt: null },
    });
  }

  create(
    tenantId: string,
    data: CreateServiceItemDto & { serviceCode: string },
  ) {
    return this.prisma.serviceMaster.create({
      data: { ...data, tenantId },
      include: RELATION_SELECT,
    });
  }

  findAll(tenantId: string, filters: ServiceItemFilters) {
    return this.prisma.serviceMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.subCategoryId
          ? { subCategoryId: filters.subCategoryId }
          : {}),
        ...(filters.itemType ? { itemType: filters.itemType } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  serviceName: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  serviceCode: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: RELATION_SELECT,
      orderBy: { serviceName: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.serviceMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: RELATION_SELECT,
    });
  }

  update(tenantId: string, id: string, dto: UpdateServiceItemDto) {
    return this.prisma.serviceMaster.update({
      where: { id, tenantId },
      data: dto,
      include: RELATION_SELECT,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.serviceMaster.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
