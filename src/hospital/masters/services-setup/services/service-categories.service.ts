import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceCategoriesRepository } from '../repositories/service-categories.repository';
import { CreateServiceCategoryDto } from '../dto/category/create-service-category.dto';
import { UpdateServiceCategoryDto } from '../dto/category/update-service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly repo: ServiceCategoriesRepository) {}

  async create(tenantId: string, dto: CreateServiceCategoryDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.repo.findById(tenantId, id);
    if (!category) throw new NotFoundException('Service category not found');
    return category;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceCategoryDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    // Structural master: block delete while children still reference it,
    // so invoice grouping / print order never breaks silently.
    const [subCategoryCount, serviceCount] = await Promise.all([
      this.repo.countActiveSubCategories(tenantId, id),
      this.repo.countActiveServices(tenantId, id),
    ]);

    if (subCategoryCount > 0 || serviceCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${subCategoryCount} sub-categorie(s) and ${serviceCount} service(s) are still linked to it. Reassign or delete them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Service category deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Service category code already exists');
    }
    throw e;
  }
}
