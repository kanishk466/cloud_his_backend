import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateBedAmenityDto } from './dto/create-bed-amenity.dto';
import { UpdateBedAmenityDto } from './dto/update-bed-amenity.dto';
import { QueryBedAmenityDto } from './dto/query-bed-amenity.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Bed Amenity Master (oxygen, ventilator, monitor, isolation...). Tenant-scoped. */
@Injectable()
export class BedAmenityService {
  private readonly logger = new Logger(BedAmenityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateBedAmenityDto, actor?: AuditActor) {
    const existing = await this.prisma.bedAmenity.findFirst({
      where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Bed amenity '${dto.name}' already exists.`);
    }

    try {
      const created = await this.prisma.bedAmenity.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BED_AMENITY_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'BedAmenity',
          targetId: created.id,
          targetName: created.name,
          detail: `Bed amenity '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Bed amenity '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryBedAmenityDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.BedAmenityWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.bedAmenity.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { mappings: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bedAmenity.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.bedAmenity.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const amenity = await this.prisma.bedAmenity.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!amenity) throw new NotFoundException('Bed amenity not found.');
    return amenity;
  }

  async update(tenantId: string, id: string, dto: UpdateBedAmenityDto, actor?: AuditActor) {
    const existing = await this.prisma.bedAmenity.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Bed amenity not found.');

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.prisma.bedAmenity.findFirst({
        where: {
          tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Bed amenity '${dto.name}' already exists.`);
    }

    const updated = await this.prisma.bedAmenity.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BED_AMENITY_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'BedAmenity',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Bed amenity '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.bedAmenity.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Bed amenity not found.');

    await this.prisma.bedAmenity.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BED_AMENITY_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'BedAmenity',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Bed amenity '${existing.name}' deleted`,
      });
    }

    return { message: `Bed amenity '${existing.name}' deleted.` };
  }
}
