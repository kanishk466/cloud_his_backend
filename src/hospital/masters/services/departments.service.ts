import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DepartmentsRepository } from '../repositories/departments.repository';

@Injectable()
export class DepartmentsService {
  constructor(private readonly repo: DepartmentsRepository) {}

  async create(tenantId: string, data: { name: string; code?: string }) {
    try {
      return await this.repo.create(tenantId, data);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Department name already exists');
      }
      throw e;
    }
  }

  findAll(tenantId: string, active?: boolean) {
    return this.repo.findAll(tenantId, active);
  }

  async findByIdOrThrow(tenantId: string, id: number) {
    const dept = await this.repo.findById(id);
    if (!dept || dept.tenantId !== tenantId) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  async update(
    tenantId: string,
    id: number,
    data: { name?: string; code?: string },
  ) {
    await this.findByIdOrThrow(tenantId, id);
    try {
      return await this.repo.update(id, data);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Department name already exists');
      }
      throw e;
    }
  }

  async toggle(tenantId: string, id: number, isActive: boolean) {
    await this.findByIdOrThrow(tenantId, id);
    return this.repo.update(id, { isActive });
  }
}
