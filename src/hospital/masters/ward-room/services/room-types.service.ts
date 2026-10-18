import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoomTypesRepository } from '../repositories/room-types.repository';
import { CreateRoomTypeDto } from '../dto/room-type/create-room-type.dto';
import { UpdateRoomTypeDto } from '../dto/room-type/update-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly repo: RoomTypesRepository) {}

  async create(tenantId: string, dto: CreateRoomTypeDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  findBorEligible(tenantId: string) {
    return this.repo.findBorEligible(tenantId);
  }

  async findOne(tenantId: string, id: string) {
    const roomType = await this.repo.findById(tenantId, id);
    if (!roomType) throw new NotFoundException('Room type not found');
    return roomType;
  }

  async update(tenantId: string, id: string, dto: UpdateRoomTypeDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const roomCount = await this.repo.countActiveRooms(tenantId, id);
    if (roomCount > 0) {
      throw new BadRequestException(
        `Cannot delete room type: ${roomCount} room(s) are still linked to it. Reassign or delete them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Room type deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Room type code already exists');
    }
    throw e;
  }
}
