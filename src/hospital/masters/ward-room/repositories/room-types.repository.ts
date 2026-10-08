import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateRoomTypeDto } from '../dto/room-type/create-room-type.dto';
import { UpdateRoomTypeDto } from '../dto/room-type/update-room-type.dto';

@Injectable()
export class RoomTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateRoomTypeDto) {
    return this.prisma.roomType.create({ data: { ...dto, tenantId } });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.roomType.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        _count: { select: { rooms: { where: { deletedAt: null } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** Only types that count towards Bed Occupancy Rate. */
  findBorEligible(tenantId: string) {
    return this.prisma.roomType.findMany({
      where: { tenantId, deletedAt: null, isActive: true, isCount: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.roomType.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        rooms: { where: { deletedAt: null }, orderBy: { roomNumber: 'asc' } },
      },
    });
  }

  update(tenantId: string, id: string, dto: UpdateRoomTypeDto) {
    return this.prisma.roomType.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.roomType.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  countActiveRooms(tenantId: string, roomTypeId: string) {
    return this.prisma.room.count({
      where: { tenantId, roomTypeId, deletedAt: null },
    });
  }
}
