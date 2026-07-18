import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DepartmentsRepository } from '../repositories/departments.repository';

@Injectable()
export class DepartmentsService {
  constructor(private readonly repo: DepartmentsRepository) {}

  async create(hospitalId: string, data: { name: string; code?: string }) {
    try {
      return await this.repo.create(hospitalId, data);
    } catch (e) {
      // Unique constraint: @@unique([hospitalId, name])
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Department name already exists');
      }
      throw e;
    }
  }

  findAll(hospitalId: string, active?: boolean) {
    return this.repo.findAll(hospitalId, active);
  }

  async findByIdOrThrow(hospitalId: string, id: string) {
    const dept = await this.repo.findById(id);
    if (!dept || dept.hospitalId !== hospitalId) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  async update(hospitalId: string, id: string, data: { name?: string; code?: string }) {
    await this.findByIdOrThrow(hospitalId, id);

    try {
      return await this.repo.update(id, data);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Department name already exists');
      }
      throw e;
    }
  }

  async toggle(hospitalId: string, id: string, isActive: boolean) {
    await this.findByIdOrThrow(hospitalId, id);
    return this.repo.update(id, { isActive });
  }
}