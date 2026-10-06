import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { QueryServiceCategoryDto } from './dto/query-service-category.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Service Category Master. Tenant-scoped. */
@Injectable()
export class ServiceCategoryService {
  private readonly logger = new Logger(ServiceCategoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateServiceCategoryDto, actor?: AuditActor) {
    const existing = await this.prisma.serviceCategoryMaster.findFirst({
      where: {
        tenantId,
        configType: dto.configType,
        categoryName: { equals: dto.categoryName, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Category '${dto.categoryName}' already exists for ${dto.configType}.`,
      );
    }

    try {
      const created = await this.prisma.serviceCategoryMaster.create({
        data: {
          tenantId,
          configType: dto.configType,
          categoryName: dto.categoryName,
          storeType: dto.storeType ?? 'NONE',
          abbreviation: dto.abbreviation,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'SERVICE_CATEGORY_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'ServiceCategory',
          targetId: created.id,
          targetName: created.categoryName,
          detail: `Service category '${created.categoryName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          `Category '${dto.categoryName}' already exists for ${dto.configType}.`,
        );
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryServiceCategoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ServiceCategoryMasterWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.configType && { configType: query.configType }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { categoryName: { contains: query.search, mode: 'insensitive' } },
          { abbreviation: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceCategoryMaster.findMany({
        where,
        orderBy: { categoryName: 'asc' },
        include: { _count: { select: { subCategories: true, services: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceCategoryMaster.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, configType?: string) {
    return this.prisma.serviceCategoryMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(configType && { configType: configType as any }),
      },
      orderBy: { categoryName: 'asc' },
      select: {
        id: true,
        configType: true,
        categoryName: true,
        storeType: true,
        abbreviation: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const cat = await this.prisma.serviceCategoryMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!cat) throw new NotFoundException('Service category not found.');
    return cat;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateServiceCategoryDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.serviceCategoryMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Service category not found.');

    const targetConfig = dto.configType ?? existing.configType;
    const targetName = dto.categoryName ?? existing.categoryName;
    if (
      targetConfig !== existing.configType ||
      targetName.toLowerCase() !== existing.categoryName.toLowerCase()
    ) {
      const dup = await this.prisma.serviceCategoryMaster.findFirst({
        where: {
          tenantId,
          configType: targetConfig,
          categoryName: { equals: targetName, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) {
        throw new ConflictException(
          `Category '${targetName}' already exists for ${targetConfig}.`,
        );
      }
    }

    const updated = await this.prisma.serviceCategoryMaster.update({
      where: { id },
      data: { ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_CATEGORY_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ServiceCategory',
        targetId: updated.id,
        targetName: updated.categoryName,
        detail: `Service category '${updated.categoryName}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.serviceCategoryMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Service category not found.');

    const [subCount, svcCount] = await Promise.all([
      this.prisma.serviceSubCategory.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.serviceMaster.count({ where: { categoryId: id, deletedAt: null } }),
    ]);
    if (subCount > 0 || svcCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${subCount} sub-category(ies) and ${svcCount} service(s) reference this category.`,
      );
    }

    await this.prisma.serviceCategoryMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_CATEGORY_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ServiceCategory',
        targetId: existing.id,
        targetName: existing.categoryName,
        detail: `Service category '${existing.categoryName}' deleted`,
      });
    }

    return { message: `Service category '${existing.categoryName}' deleted.` };
  }
}
