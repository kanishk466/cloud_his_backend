import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceSubCategoriesRepository } from '../repositories/service-sub-categories.repository';
import { ServiceCategoriesRepository } from '../repositories/service-categories.repository';
import { CreateServiceSubCategoryDto } from '../dto/sub-category/create-service-sub-category.dto';
import { UpdateServiceSubCategoryDto } from '../dto/sub-category/update-service-sub-category.dto';

@Injectable()
export class ServiceSubCategoriesService {
  constructor(
    private readonly repo: ServiceSubCategoriesRepository,
    private readonly categoriesRepo: ServiceCategoriesRepository,
  ) {}

  async create(tenantId: string, dto: CreateServiceSubCategoryDto) {
    await this.assertCategoryExists(tenantId, dto.categoryId);
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  /** Dropdown source for a category (validates the category first). */
  async findByCategory(
    tenantId: string,
    categoryId: string,
    isActive?: boolean,
  ) {
    await this.assertCategoryExists(tenantId, categoryId);
    return this.repo.findByCategory(tenantId, categoryId, isActive);
  }

  async findOne(tenantId: string, id: string) {
    const subCategory = await this.repo.findById(tenantId, id);
    if (!subCategory)
      throw new NotFoundException('Service sub-category not found');
    return subCategory;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceSubCategoryDto) {
    await this.findOne(tenantId, id);
    if (dto.categoryId) {
      await this.assertCategoryExists(tenantId, dto.categoryId);
    }
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const serviceCount = await this.repo.countActiveServices(tenantId, id);
    if (serviceCount > 0) {
      throw new BadRequestException(
        `Cannot delete sub-category: ${serviceCount} service(s) are still linked to it. Reassign or delete them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Service sub-category deleted successfully' };
  }

  private async assertCategoryExists(tenantId: string, categoryId: string) {
    const category = await this.categoriesRepo.findById(tenantId, categoryId);
    if (!category)
      throw new NotFoundException(
        'Service category not found in this hospital',
      );
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Service sub-category code already exists');
    }
    throw e;
  }
}
