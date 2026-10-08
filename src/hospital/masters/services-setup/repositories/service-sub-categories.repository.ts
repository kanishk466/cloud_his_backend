import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateServiceSubCategoryDto } from '../dto/sub-category/create-service-sub-category.dto';
import { UpdateServiceSubCategoryDto } from '../dto/sub-category/update-service-sub-category.dto';

const CATEGORY_SELECT = {
  select: { id: true, name: true, code: true },
} as const;

@Injectable()
export class ServiceSubCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateServiceSubCategoryDto) {
    return this.prisma.serviceSubCategory.create({
      data: { ...dto, tenantId },
      include: { category: CATEGORY_SELECT },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.serviceSubCategory.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        category: CATEGORY_SELECT,
        _count: { select: { services: { where: { deletedAt: null } } } },
      },
      orderBy: [{ printOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** Dropdown source: sub-categories of one category, in print order. */
  findByCategory(tenantId: string, categoryId: string, isActive?: boolean) {
    return this.prisma.serviceSubCategory.findMany({
      where: {
        tenantId,
        categoryId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: { category: CATEGORY_SELECT },
      orderBy: [{ printOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.serviceSubCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { category: CATEGORY_SELECT },
    });
  }

  update(tenantId: string, id: string, dto: UpdateServiceSubCategoryDto) {
    return this.prisma.serviceSubCategory.update({
      where: { id, tenantId },
      data: dto,
      include: { category: CATEGORY_SELECT },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.serviceSubCategory.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Delete guard ───────────────────────────────────────────────────────────

  countActiveServices(tenantId: string, subCategoryId: string) {
    return this.prisma.serviceMaster.count({
      where: { tenantId, subCategoryId, deletedAt: null },
    });
  }
}
