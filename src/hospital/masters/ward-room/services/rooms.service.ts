import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WardGender } from '@prisma/client';
import { RoomsRepository } from '../repositories/rooms.repository';
import { RoomTypesRepository } from '../repositories/room-types.repository';
import { AmenitiesRepository } from '../repositories/amenities.repository';
import { BedsRepository } from '../repositories/beds.repository';
import { CreateRoomDto } from '../dto/room/create-room.dto';
import { UpdateRoomDto } from '../dto/room/update-room.dto';
import { FilterRoomDto } from '../dto/room/filter-room.dto';
import { AssignAmenityDto } from '../dto/amenity/assign-amenity.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly repo: RoomsRepository,
    private readonly roomTypesRepo: RoomTypesRepository,
    private readonly amenitiesRepo: AmenitiesRepository,
    private readonly bedsRepo: BedsRepository,
  ) {}

  async create(tenantId: string, dto: CreateRoomDto) {
    await this.assertRoomTypeExists(tenantId, dto.roomTypeId);
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, filters: FilterRoomDto) {
    return this.repo.findAll(tenantId, filters);
  }

  /** Rooms having ALL the requested amenity codes (e.g., ?amenities=AC,TV). */
  findByAmenities(tenantId: string, amenityCodes: string[]) {
    if (amenityCodes.length === 0) {
      throw new BadRequestException(
        'Provide at least one amenity code, e.g. ?amenities=AC,TV',
      );
    }
    return this.repo.findByAmenities(tenantId, amenityCodes);
  }

  /** Gender-safe room list for IPD admission (exact match + ANY). */
  findByGender(tenantId: string, gender: WardGender) {
    return this.repo.findByGender(tenantId, gender);
  }

  async findOne(tenantId: string, id: string) {
    const room = await this.repo.findById(tenantId, id);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto) {
    await this.findOne(tenantId, id);
    if (dto.roomTypeId) {
      await this.assertRoomTypeExists(tenantId, dto.roomTypeId);
    }
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const bedCount = await this.repo.countActiveBeds(tenantId, id);
    if (bedCount > 0) {
      throw new BadRequestException(
        `Cannot delete room: ${bedCount} bed(s) are still linked to it. Delete the beds first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Room deleted successfully' };
  }

  // ─── Amenity assignment (atomic replace) ────────────────────────────────────

  async assignAmenities(
    tenantId: string,
    roomId: string,
    dto: AssignAmenityDto,
  ) {
    await this.findOne(tenantId, roomId);

    if (dto.amenityIds.length > 0) {
      const valid = await this.amenitiesRepo.findByIds(
        tenantId,
        dto.amenityIds,
      );
      const validIds = new Set(valid.map((a) => a.id));
      const invalid = dto.amenityIds.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Unknown or inactive amenity ids: ${invalid.join(', ')}`,
        );
      }
    }

    const mappings = await this.repo.replaceAmenities(
      tenantId,
      roomId,
      dto.amenityIds,
    );

    return {
      message: 'Room amenities updated successfully',
      amenities: mappings.map((m) => m.amenity),
    };
  }

  // ─── Room occupancy snapshot (bed grid data for nursing station) ────────────

  async getOccupancy(tenantId: string, roomId: string) {
    const room = await this.findOne(tenantId, roomId);
    const beds = await this.bedsRepo.findForOccupancy(tenantId, roomId);

    let occupied = 0;
    let available = 0;
    let reserved = 0;

    const bedList = beds.map((bed) => {
      const status = bed.statusHistory[0]?.status ?? 'AVAILABLE';
      if (status === 'OCCUPIED') occupied++;
      else if (status === 'RESERVED') reserved++;
      else if (status === 'AVAILABLE') available++;

      return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        bedIdentifier: bed.bedIdentifier,
        status,
        patientId: bed.statusHistory[0]?.patientId ?? null,
      };
    });

    return {
      room,
      totalBeds: beds.length,
      occupiedBeds: occupied,
      availableBeds: available,
      reservedBeds: reserved,
      beds: bedList,
    };
  }

  private async assertRoomTypeExists(tenantId: string, roomTypeId: string) {
    const roomType = await this.roomTypesRepo.findById(tenantId, roomTypeId);
    if (!roomType) {
      throw new NotFoundException('Room type not found in this hospital');
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Room number already exists');
    }
    throw e;
  }
}
