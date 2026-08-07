import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShiftsRepository } from '../repositories/shifts.repository';

@Injectable()
export class ShiftsService {
  constructor(private readonly repo: ShiftsRepository) {}

  async create(tenantId: string, data: { name: string; startTime?: string; endTime?: string }) {
    try {
      return await this.repo.create(tenantId, data);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Shift name already exists');
      }
      throw e;
    }
  }

  findAll(tenantId: string, active?: boolean) {
    return this.repo.findAll(tenantId, active);
  }

  async findByIdOrThrow(tenantId: string, id: number) {
    const shift = await this.repo.findById(id);
    if (!shift || shift.tenantId !== tenantId) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  async update(tenantId: string, id: number, data: { name?: string; startTime?: string; endTime?: string }) {
    await this.findByIdOrThrow(tenantId, id);
    try {
      return await this.repo.update(id, data);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Shift name already exists');
      }
      throw e;
    }
  }

  async toggle(tenantId: string, id: number, isActive: boolean) {
    await this.findByIdOrThrow(tenantId, id);
    return this.repo.update(id, { isActive });
  }
}