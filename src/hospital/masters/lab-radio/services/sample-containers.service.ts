import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SampleContainersRepository } from '../repositories/sample-containers.repository';
import { CreateSampleContainerDto } from '../dto/sample-container/create-sample-container.dto';
import { UpdateSampleContainerDto } from '../dto/sample-container/update-sample-container.dto';

@Injectable()
export class SampleContainersService {
  constructor(private readonly repo: SampleContainersRepository) {}

  async create(tenantId: string, dto: CreateSampleContainerDto) {
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
    const container = await this.repo.findById(tenantId, id);
    if (!container) throw new NotFoundException('Sample container not found');
    return container;
  }

  async update(tenantId: string, id: string, dto: UpdateSampleContainerDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const usages = await this.repo.countUsages(id);
    if (usages > 0) {
      throw new BadRequestException(
        `Cannot delete container: ${usages} investigation(s) are linked to it. Reassign them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Sample container deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Sample container code already exists');
    }
    throw e;
  }
}
