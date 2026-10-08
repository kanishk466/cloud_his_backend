import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AmenitiesRepository } from '../repositories/amenities.repository';
import { CreateAmenityDto } from '../dto/amenity/create-amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(private readonly repo: AmenitiesRepository) {}

  async create(tenantId: string, dto: CreateAmenityDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findOne(tenantId: string, id: string) {
    const amenity = await this.repo.findById(tenantId, id);
    if (!amenity) throw new NotFoundException('Amenity not found');
    return amenity;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateAmenityDto>) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  /** Hard delete — blocked while any room maps this amenity. */
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const mappings = await this.repo.countRoomMappings(id);
    if (mappings > 0) {
      throw new BadRequestException(
        `Cannot delete amenity: it is assigned to ${mappings} room(s). Remove the mappings first (or set isActive = false).`,
      );
    }

    await this.repo.remove(tenantId, id);
    return { message: 'Amenity deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Amenity code already exists');
    }
    throw e;
  }
}
