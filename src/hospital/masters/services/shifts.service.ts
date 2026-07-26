import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShiftsRepository } from '../repositories/shifts.repository';

@Injectable()
export class ShiftsService {
  constructor(private readonly repo: ShiftsRepository) {}

  async create(hospitalId: number, data: { name: string; startTime?: string; endTime?: string }) {
    try {
      return await this.repo.create(hospitalId, data);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Shift name already exists');
      }
      throw e;
    }
  }

  findAll(hospitalId: number, active?: boolean) {
    return this.repo.findAll(hospitalId, active);
  }

  async findByIdOrThrow(hospitalId: number, id: number) {
    const shift = await this.repo.findById(id);
    if (!shift || shift.hospitalId !== hospitalId) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  async update(hospitalId: number, id: number, data: { name?: string; startTime?: string; endTime?: string }) {
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

  async toggle(hospitalId: number, id: number, isActive: boolean) {
    await this.findByIdOrThrow(hospitalId, id);
    return this.repo.update(id, { isActive });
  }
}