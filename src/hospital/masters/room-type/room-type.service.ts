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
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { QueryRoomTypeDto } from './dto/query-room-type.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Room Type Master (tariff classification). Tenant-scoped. */
@Injectable()
export class RoomTypeService {
  private readonly logger = new Logger(RoomTypeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertServiceVisible(tenantId: string, serviceId?: string) {
    if (!serviceId) return;
    const svc = await this.prisma.serviceMaster.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!svc) throw new BadRequestException('Invalid dailyChargeItemId: service not found.');
  }

  async create(tenantId: string, dto: CreateRoomTypeDto, actor?: AuditActor) {
    await this.assertServiceVisible(tenantId, dto.dailyChargeItemId);

    const existing = await this.prisma.roomType.findFirst({
      where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Room type '${dto.name}' already exists.`);
    }

    try {
      const created = await this.prisma.roomType.create({
        data: {
          tenantId,
          name: dto.name,
          abbreviation: dto.abbreviation,
          description: dto.description,
          selfBillingCategory: dto.selfBillingCategory ?? false,
          billingCategory: dto.billingCategory,
          isEmergency: dto.isEmergency ?? false,
          isDialysis: dto.isDialysis ?? false,
          isDaycare: dto.isDaycare ?? false,
          isDiscountable: dto.isDiscountable ?? true,
          genderRestriction: dto.genderRestriction ?? 'ANY',
          dailyChargeItemId: dto.dailyChargeItemId,
          thresholdLimitAmount: dto.thresholdLimitAmount,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'ROOM_TYPE_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'RoomType',
          targetId: created.id,
          targetName: created.name,
          detail: `Room type '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Room type '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryRoomTypeDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.RoomTypeWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.genderRestriction && { genderRestriction: query.genderRestriction }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { abbreviation: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.roomType.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { rooms: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.roomType.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.roomType.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        isEmergency: true,
        isDaycare: true,
        isDialysis: true,
        genderRestriction: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const rt = await this.prisma.roomType.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        dailyChargeItem: { select: { id: true, serviceName: true, serviceCode: true } },
      },
    });
    if (!rt) throw new NotFoundException('Room type not found.');
    return rt;
  }

  async update(tenantId: string, id: string, dto: UpdateRoomTypeDto, actor?: AuditActor) {
    const existing = await this.prisma.roomType.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Room type not found.');

    await this.assertServiceVisible(tenantId, dto.dailyChargeItemId);

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.prisma.roomType.findFirst({
        where: {
          tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Room type '${dto.name}' already exists.`);
    }

    const updated = await this.prisma.roomType.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'ROOM_TYPE_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'RoomType',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Room type '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.roomType.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Room type not found.');

    const roomCount = await this.prisma.room.count({
      where: { roomTypeId: id, deletedAt: null },
    });
    if (roomCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${roomCount} room(s) reference this room type.`,
      );
    }

    await this.prisma.roomType.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'ROOM_TYPE_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'RoomType',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Room type '${existing.name}' deleted`,
      });
    }

    return { message: `Room type '${existing.name}' deleted.` };
  }
}
