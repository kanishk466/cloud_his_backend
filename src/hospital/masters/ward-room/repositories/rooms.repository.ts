import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { WardGender } from '@prisma/client';
import { CreateRoomDto } from '../dto/room/create-room.dto';
import { UpdateRoomDto } from '../dto/room/update-room.dto';
import { FilterRoomDto } from '../dto/room/filter-room.dto';

const ROOM_TYPE_SELECT = {
  select: {
    id: true,
    name: true,
    code: true,
    defaultRate: true,
    nursingCharge: true,
    isCount: true,
    isEmergency: true,
    isDaycare: true,
    isDialysis: true,
  },
} as const;

const AMENITIES_INCLUDE = {
  amenities: { include: { amenity: true } },
} as const;

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: { ...dto, tenantId },
      include: { roomType: ROOM_TYPE_SELECT, ...AMENITIES_INCLUDE },
    });
  }

  findAll(tenantId: string, filters: FilterRoomDto) {
    return this.prisma.room.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.roomTypeId ? { roomTypeId: filters.roomTypeId } : {}),
        ...(filters.gender ? { gender: filters.gender } : {}),
        ...(filters.floor
          ? { floor: { equals: filters.floor, mode: 'insensitive' as const } }
          : {}),
        ...(filters.wing
          ? { wing: { equals: filters.wing, mode: 'insensitive' as const } }
          : {}),
        ...(filters.search
          ? {
              roomNumber: {
                contains: filters.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      include: {
        roomType: ROOM_TYPE_SELECT,
        _count: { select: { beds: { where: { deletedAt: null } } } },
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.room.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { roomType: ROOM_TYPE_SELECT, ...AMENITIES_INCLUDE },
    });
  }

  update(tenantId: string, id: string, dto: UpdateRoomDto) {
    return this.prisma.room.update({
      where: { id, tenantId },
      data: dto,
      include: { roomType: ROOM_TYPE_SELECT, ...AMENITIES_INCLUDE },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.room.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Amenity mapping (atomic replace) ──────────────────────────────────────

  async replaceAmenities(
    tenantId: string,
    roomId: string,
    amenityIds: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.roomBedAmenity.deleteMany({ where: { roomId } });

      if (amenityIds.length > 0) {
        await tx.roomBedAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ roomId, amenityId })),
          skipDuplicates: true,
        });
      }

      return tx.roomBedAmenity.findMany({
        where: { roomId },
        include: { amenity: true },
      });
    });
  }

  /** Rooms having ALL of the given amenity codes. */
  findByAmenities(tenantId: string, amenityCodes: string[]) {
    return this.prisma.room.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        AND: amenityCodes.map((code) => ({
          amenities: {
            some: { amenity: { code, isActive: true } },
          },
        })),
      },
      include: {
        roomType: ROOM_TYPE_SELECT,
        ...AMENITIES_INCLUDE,
        _count: { select: { beds: { where: { deletedAt: null } } } },
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  countActiveBeds(tenantId: string, roomId: string) {
    return this.prisma.bed.count({
      where: { tenantId, roomId, deletedAt: null },
    });
  }

  // ─── Gender filter passthrough helper for IPD admission (future) ──────────
  findByGender(tenantId: string, gender: WardGender) {
    return this.prisma.room.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        OR: [{ gender: gender }, { gender: 'ANY' }],
      },
      include: { roomType: ROOM_TYPE_SELECT },
      orderBy: { roomNumber: 'asc' },
    });
  }
}
