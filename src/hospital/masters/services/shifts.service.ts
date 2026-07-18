import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShiftsRepository } from '../repositories/shifts.repository';

@Injectable()
export class ShiftsService {
  constructor(private readonly repo: ShiftsRepository) {}

  async create(hospitalId: string, data: { name: string; startTime?: string; endTime?: string }) {
    try {
      return await this.repo.create(hospitalId, data);
    } catch (e) {
      // Unique constraint: @@unique([hospitalId, name])
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Shift name already exists');
      }
      throw e;
    }
  }

  findAll(hospitalId: string, active?: boolean) {
    return this.repo.findAll(hospitalId, active);
  }

  async findByIdOrThrow(hospitalId: string, id: string) {
    const shift = await this.repo.findById(id);
    if (!shift || shift.hospitalId !== hospitalId) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  async update(hospitalId: string, id: string, data: { name?: string; startTime?: string; endTime?: string }) {
    await this.findByIdOrThrow(hospitalId, id);

    try {
      return await this.repo.update(id, data);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Shift name already exists');
      }
      throw e;
    }
  }

  async toggle(hospitalId: string, id: string, isActive: boolean) {
    await this.findByIdOrThrow(hospitalId, id);
    return this.repo.update(id, { isActive });
  }
}