import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { Prisma } from '@prisma/client';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

@Injectable()
export class ServiceMasterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** All optional hierarchy refs must belong to this tenant. */
  private async validateRefs(
    tenantId: string,
    refs: { categoryId?: string; subCategoryId?: string; itemTypeId?: string },
  ) {
    if (refs.categoryId) {
      const cat = await this.prisma.serviceCategoryMaster.findFirst({
        where: { id: refs.categoryId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!cat) throw new BadRequestException('Invalid categoryId.');
    }
    if (refs.subCategoryId) {
      const sub = await this.prisma.serviceSubCategory.findFirst({
        where: { id: refs.subCategoryId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!sub) throw new BadRequestException('Invalid subCategoryId.');
    }
    if (refs.itemTypeId) {
      const it = await this.prisma.serviceItemType.findFirst({
        where: { id: refs.itemTypeId, deletedAt: null },
        select: { id: true },
      });
      if (!it) throw new BadRequestException('Invalid itemTypeId.');
    }
  }

  async create(tenantId: string, dto: CreateServiceDto, actor?: AuditActor) {
    await this.validateRefs(tenantId, dto);

    const exists = await this.prisma.serviceMaster.findFirst({
      where: { tenantId, serviceCode: dto.serviceCode, deletedAt: null },
    });
    if (exists) throw new ConflictException(`Service code '${dto.serviceCode}' already exists`);

    const created = await this.prisma.serviceMaster.create({
      data: { tenantId, ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_MASTER_CREATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ServiceMaster',
        targetId: created.id,
        targetName: created.serviceName,
        detail: `Service '${created.serviceName}' created`,
      });
    }

    return created;
  }

  async list(tenantId: string, query: QueryServiceDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ServiceMasterWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.subCategoryId && { subCategoryId: query.subCategoryId }),
      ...(query.itemTypeId && { itemTypeId: query.itemTypeId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { serviceName: { contains: query.search, mode: 'insensitive' } },
          { serviceCode: { contains: query.search, mode: 'insensitive' } },
          { displayName: { contains: query.search, mode: 'insensitive' } },
          { cptCode: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceMaster.findMany({
        where,
        orderBy: { serviceName: 'asc' },
        include: {
          categoryRef: { select: { id: true, categoryName: true, configType: true } },
          subCategoryRef: { select: { id: true, subCategoryName: true } },
          itemTypeRef: { select: { id: true, code: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceMaster.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.serviceMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        categoryRef: { select: { id: true, categoryName: true, configType: true } },
        subCategoryRef: { select: { id: true, subCategoryName: true } },
        itemTypeRef: { select: { id: true, code: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('Service not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto, actor?: AuditActor) {
    const existing = await this.prisma.serviceMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Service not found');

    if (dto.serviceCode && dto.serviceCode !== existing.serviceCode) {
      const dup = await this.prisma.serviceMaster.findFirst({
        where: { tenantId, serviceCode: dto.serviceCode, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Service code '${dto.serviceCode}' already exists`);
    }

    const updated = await this.prisma.serviceMaster.update({
      where: { id },
      data: { ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_MASTER_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ServiceMaster',
        targetId: updated.id,
        targetName: updated.serviceName,
        detail: `Service '${updated.serviceName}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.serviceMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Service not found');

    await this.prisma.serviceMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_MASTER_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ServiceMaster',
        targetId: existing.id,
        targetName: existing.serviceName,
        detail: `Service '${existing.serviceName}' deleted`,
      });
    }

    return { message: `Service '${existing.serviceName}' deleted.` };
  }
}
