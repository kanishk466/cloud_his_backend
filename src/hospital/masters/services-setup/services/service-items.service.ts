import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceItemsRepository } from '../repositories/service-items.repository';
import { ServiceCategoriesRepository } from '../repositories/service-categories.repository';
import { ServiceSubCategoriesRepository } from '../repositories/service-sub-categories.repository';
import { CreateServiceItemDto } from '../dto/service-item/create-service-item.dto';
import { UpdateServiceItemDto } from '../dto/service-item/update-service-item.dto';
import { FilterServiceItemDto } from '../dto/service-item/filter-service-item.dto';

@Injectable()
export class ServiceItemsService {
  constructor(
    private readonly repo: ServiceItemsRepository,
    private readonly categoriesRepo: ServiceCategoriesRepository,
    private readonly subCategoriesRepo: ServiceSubCategoriesRepository,
  ) {}

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateServiceItemDto) {
    // 1. serviceCode: use provided (must be unique) or auto-generate
    let serviceCode = dto.serviceCode;
    if (serviceCode) {
      const exists = await this.repo.findByCode(tenantId, serviceCode);
      if (exists) {
        throw new ConflictException(
          `Service code '${serviceCode}' already exists`,
        );
      }
    } else {
      serviceCode = await this.repo.generateServiceCode(tenantId);
    }

    // 2. Category / sub-category tenant validation + hierarchy consistency
    const resolved = await this.resolveHierarchy(
      tenantId,
      dto.categoryId,
      dto.subCategoryId,
    );

    // 3. Age range sanity
    this.assertAgeRange(dto.minAgeYears, dto.maxAgeYears);

    try {
      return await this.repo.create(tenantId, {
        ...dto,
        serviceCode,
        categoryId: resolved.categoryId,
        subCategoryId: resolved.subCategoryId,
      });
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  // ─── List / Get ─────────────────────────────────────────────────────────────

  findAll(tenantId: string, filters: FilterServiceItemDto) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.repo.findById(tenantId, id);
    if (!item) throw new NotFoundException('Service not found');
    return item;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(tenantId: string, id: string, dto: UpdateServiceItemDto) {
    const existing = await this.findOne(tenantId, id);

    // serviceCode change → uniqueness check
    if (dto.serviceCode && dto.serviceCode !== existing.serviceCode) {
      const dupe = await this.repo.findByCode(tenantId, dto.serviceCode);
      if (dupe) {
        throw new ConflictException(
          `Service code '${dto.serviceCode}' already exists`,
        );
      }
    }

    // Hierarchy re-validation on effective (merged) values
    const categoryId =
      dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
    const subCategoryId =
      dto.subCategoryId !== undefined
        ? dto.subCategoryId
        : existing.subCategoryId;

    let resolved: { categoryId?: string; subCategoryId?: string } = {};
    if (dto.categoryId !== undefined || dto.subCategoryId !== undefined) {
      resolved = await this.resolveHierarchy(
        tenantId,
        categoryId,
        subCategoryId,
      );
    }

    // Age range on effective values
    const minAge =
      dto.minAgeYears !== undefined ? dto.minAgeYears : existing.minAgeYears;
    const maxAge =
      dto.maxAgeYears !== undefined ? dto.maxAgeYears : existing.maxAgeYears;
    this.assertAgeRange(minAge ?? undefined, maxAge ?? undefined);

    try {
      return await this.repo.update(tenantId, id, { ...dto, ...resolved });
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  // ─── Soft Delete ────────────────────────────────────────────────────────────

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Service deleted successfully' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Validates that category / sub-category belong to this tenant and are
   * consistent with each other. When only a sub-category is given, the
   * parent category is auto-filled from it.
   */
  private async resolveHierarchy(
    tenantId: string,
    categoryId?: string,
    subCategoryId?: string,
  ): Promise<{ categoryId?: string; subCategoryId?: string }> {
    if (categoryId) {
      const category = await this.categoriesRepo.findById(tenantId, categoryId);
      if (!category) {
        throw new NotFoundException(
          'Service category not found in this hospital',
        );
      }
    }

    if (!subCategoryId) return { categoryId, subCategoryId };

    const subCategory = await this.subCategoriesRepo.findById(
      tenantId,
      subCategoryId,
    );
    if (!subCategory) {
      throw new NotFoundException(
        'Service sub-category not found in this hospital',
      );
    }

    if (categoryId && subCategory.categoryId !== categoryId) {
      throw new BadRequestException(
        'Sub-category does not belong to the given category',
      );
    }

    // Auto-fill parent when only the sub-category was supplied
    return { categoryId: categoryId ?? subCategory.categoryId, subCategoryId };
  }

  private assertAgeRange(minAgeYears?: number, maxAgeYears?: number) {
    if (
      typeof minAgeYears === 'number' &&
      typeof maxAgeYears === 'number' &&
      minAgeYears > maxAgeYears
    ) {
      throw new BadRequestException(
        'minAgeYears cannot be greater than maxAgeYears',
      );
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Service code already exists');
    }
    throw e;
  }
}
