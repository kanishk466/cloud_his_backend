import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateServiceCategoryDto } from '../dto/category/create-service-category.dto';
import { UpdateServiceCategoryDto } from '../dto/category/update-service-category.dto';

@Injectable()
export class ServiceCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategoryMaster.create({
      data: { ...dto, tenantId },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.serviceCategoryMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        _count: {
          select: {
            subCategories: { where: { deletedAt: null } },
            services: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.serviceCategoryMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        subCategories: {
          where: { deletedAt: null },
          orderBy: [{ printOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
  }

  update(tenantId: string, id: string, dto: UpdateServiceCategoryDto) {
    return this.prisma.serviceCategoryMaster.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.serviceCategoryMaster.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Delete guards ──────────────────────────────────────────────────────────

  countActiveSubCategories(tenantId: string, categoryId: string) {
    return this.prisma.serviceSubCategory.count({
      where: { tenantId, categoryId, deletedAt: null },
    });
  }

  countActiveServices(tenantId: string, categoryId: string) {
    return this.prisma.serviceMaster.count({
      where: { tenantId, categoryId, deletedAt: null },
    });
  }
}
