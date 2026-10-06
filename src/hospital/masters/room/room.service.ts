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
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Room Master. Tenant-scoped, under a RoomType. */
@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertRoomTypeVisible(tenantId: string, roomTypeId: string) {
    const rt = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!rt) throw new BadRequestException('Invalid roomTypeId: room type not found.');
  }

  async create(tenantId: string, dto: CreateRoomDto, actor?: AuditActor) {
    await this.assertRoomTypeVisible(tenantId, dto.roomTypeId);

    const existing = await this.prisma.room.findFirst({
      where: {
        tenantId,
        floorName: dto.floorName ?? null,
        roomNo: dto.roomNo,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`Room '${dto.roomNo}' already exists on this floor.`);
    }

    try {
      const created = await this.prisma.room.create({
        data: {
          tenantId,
          roomTypeId: dto.roomTypeId,
          floorName: dto.floorName,
          roomName: dto.roomName,
          roomNo: dto.roomNo,
          description: dto.description,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'ROOM_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'Room',
          targetId: created.id,
          targetName: created.roomName,
          detail: `Room '${created.roomName}' (${created.roomNo}) created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Room '${dto.roomNo}' already exists on this floor.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryRoomDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.RoomWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.roomTypeId && { roomTypeId: query.roomTypeId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { roomName: { contains: query.search, mode: 'insensitive' } },
          { roomNo: { contains: query.search, mode: 'insensitive' } },
          { floorName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        orderBy: [{ floorName: 'asc' }, { roomNo: 'asc' }],
        include: {
          roomType: { select: { id: true, name: true } },
          _count: { select: { beds: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.room.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        roomType: { select: { id: true, name: true } },
        beds: {
          where: { deletedAt: null },
          orderBy: { bedNo: 'asc' },
          include: { status: true },
        },
      },
    });
    if (!room) throw new NotFoundException('Room not found.');
    return room;
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto, actor?: AuditActor) {
    const existing = await this.prisma.room.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Room not found.');

    if (dto.roomTypeId) await this.assertRoomTypeVisible(tenantId, dto.roomTypeId);

    const targetFloor = dto.floorName !== undefined ? (dto.floorName ?? null) : existing.floorName;
    const targetNo = dto.roomNo ?? existing.roomNo;
    if (targetFloor !== existing.floorName || targetNo !== existing.roomNo) {
      const dup = await this.prisma.room.findFirst({
        where: {
          tenantId,
          floorName: targetFloor,
          roomNo: targetNo,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Room '${targetNo}' already exists on this floor.`);
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'ROOM_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Room',
        targetId: updated.id,
        targetName: updated.roomName,
        detail: `Room '${updated.roomName}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.room.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Room not found.');

    const bedCount = await this.prisma.bed.count({
      where: { roomId: id, deletedAt: null },
    });
    if (bedCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${bedCount} bed(s) exist in this room. Remove them first.`,
      );
    }

    await this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'ROOM_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Room',
        targetId: existing.id,
        targetName: existing.roomName,
        detail: `Room '${existing.roomName}' deleted`,
      });
    }

    return { message: `Room '${existing.roomName}' deleted.` };
  }
}
