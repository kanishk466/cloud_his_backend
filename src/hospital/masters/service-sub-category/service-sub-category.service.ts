import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateServiceSubCategoryDto } from './dto/create-service-sub-category.dto';
import { UpdateServiceSubCategoryDto } from './dto/update-service-sub-category.dto';
import { QueryServiceSubCategoryDto } from './dto/query-service-sub-category.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Service Sub-Category Master. Tenant-scoped, under a ServiceCategory. */
@Injectable()
export class ServiceSubCategoryService {
  private readonly logger = new Logger(ServiceSubCategoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertCategoryVisible(tenantId: string, categoryId: string) {
    const cat = await this.prisma.serviceCategoryMaster.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!cat) {
      throw new BadRequestException('Invalid categoryId: category not found.');
    }
  }

  async create(tenantId: string, dto: CreateServiceSubCategoryDto, actor?: AuditActor) {
    await this.assertCategoryVisible(tenantId, dto.categoryId);

    const existing = await this.prisma.serviceSubCategory.findFirst({
      where: {
        categoryId: dto.categoryId,
        subCategoryName: { equals: dto.subCategoryName, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Sub-category '${dto.subCategoryName}' already exists in this category.`,
      );
    }

    try {
      const created = await this.prisma.serviceSubCategory.create({
        data: {
          tenantId,
          categoryId: dto.categoryId,
          subCategoryName: dto.subCategoryName,
          displayName: dto.displayName,
          printOrder: dto.printOrder ?? 0,
          abbreviation: dto.abbreviation,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'SERVICE_SUB_CATEGORY_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'ServiceSubCategory',
          targetId: created.id,
          targetName: created.subCategoryName,
          detail: `Service sub-category '${created.subCategoryName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          `Sub-category '${dto.subCategoryName}' already exists in this category.`,
        );
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryServiceSubCategoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ServiceSubCategoryWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { subCategoryName: { contains: query.search, mode: 'insensitive' } },
          { displayName: { contains: query.search, mode: 'insensitive' } },
          { abbreviation: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceSubCategory.findMany({
        where,
        orderBy: [{ printOrder: 'asc' }, { subCategoryName: 'asc' }],
        include: { category: { select: { id: true, categoryName: true, configType: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceSubCategory.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, categoryId?: string) {
    return this.prisma.serviceSubCategory.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      orderBy: [{ printOrder: 'asc' }, { subCategoryName: 'asc' }],
      select: {
        id: true,
        categoryId: true,
        subCategoryName: true,
        displayName: true,
        printOrder: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const sub = await this.prisma.serviceSubCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException('Service sub-category not found.');
    return sub;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateServiceSubCategoryDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.serviceSubCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Service sub-category not found.');

    if (dto.categoryId) await this.assertCategoryVisible(tenantId, dto.categoryId);

    const targetCategoryId = dto.categoryId ?? existing.categoryId;
    const targetName = dto.subCategoryName ?? existing.subCategoryName;
    if (
      targetCategoryId !== existing.categoryId ||
      targetName.toLowerCase() !== existing.subCategoryName.toLowerCase()
    ) {
      const dup = await this.prisma.serviceSubCategory.findFirst({
        where: {
          categoryId: targetCategoryId,
          subCategoryName: { equals: targetName, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) {
        throw new ConflictException(
          `Sub-category '${targetName}' already exists in this category.`,
        );
      }
    }

    const updated = await this.prisma.serviceSubCategory.update({
      where: { id },
      data: { ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_SUB_CATEGORY_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ServiceSubCategory',
        targetId: updated.id,
        targetName: updated.subCategoryName,
        detail: `Service sub-category '${updated.subCategoryName}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.serviceSubCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Service sub-category not found.');

    const svcCount = await this.prisma.serviceMaster.count({
      where: { subCategoryId: id, deletedAt: null },
    });
    if (svcCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${svcCount} service(s) reference this sub-category.`,
      );
    }

    await this.prisma.serviceSubCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_SUB_CATEGORY_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ServiceSubCategory',
        targetId: existing.id,
        targetName: existing.subCategoryName,
        detail: `Service sub-category '${existing.subCategoryName}' deleted`,
      });
    }

    return { message: `Service sub-category '${existing.subCategoryName}' deleted.` };
  }
}
