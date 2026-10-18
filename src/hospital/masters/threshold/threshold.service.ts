import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ThresholdRepository } from './threshold.repository';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

@Injectable()
export class ThresholdService {
  constructor(private readonly repo: ThresholdRepository) {}

  async create(tenantId: string, dto: CreateThresholdDto) {
    const panel = await this.repo.findPanel(tenantId, dto.panelId);
    if (!panel) throw new NotFoundException('Panel not found in this hospital');

    if (dto.roomTypeId) {
      const roomType = await this.repo.findRoomType(tenantId, dto.roomTypeId);
      if (!roomType)
        throw new NotFoundException('Room type not found in this hospital');
    }

    // NULL-roomType duplicates aren't caught by the DB unique index — check first
    const existing = await this.repo.findMatching(
      tenantId,
      dto.panelId,
      dto.roomTypeId ?? null,
    );
    if (
      existing &&
      (existing.roomType?.id ?? null) === (dto.roomTypeId ?? null)
    ) {
      throw new ConflictException(
        dto.roomTypeId
          ? 'A threshold already exists for this panel and room type'
          : 'A general threshold already exists for this panel',
      );
    }

    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findByPanel(tenantId: string, panelId: string) {
    const panel = await this.repo.findPanel(tenantId, panelId);
    if (!panel) throw new NotFoundException('Panel not found in this hospital');
    return this.repo.findByPanel(tenantId, panelId);
  }

  async findOne(tenantId: string, id: string) {
    const threshold = await this.repo.findById(tenantId, id);
    if (!threshold) throw new NotFoundException('Threshold limit not found');
    return threshold;
  }

  async update(tenantId: string, id: string, dto: UpdateThresholdDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Threshold limit deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(
        'A threshold already exists for this panel and room type',
      );
    }
    throw e;
  }
}
