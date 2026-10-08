import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OutsourceLabsRepository } from '../repositories/outsource-labs.repository';
import { CreateOutsourceLabDto } from '../dto/outsource-lab/create-outsource-lab.dto';
import { UpdateOutsourceLabDto } from '../dto/outsource-lab/update-outsource-lab.dto';

@Injectable()
export class OutsourceLabsService {
  constructor(private readonly repo: OutsourceLabsRepository) {}

  async create(tenantId: string, dto: CreateOutsourceLabDto) {
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
    const lab = await this.repo.findById(tenantId, id);
    if (!lab) throw new NotFoundException('Outsource lab not found');
    return lab;
  }

  /** All tests routed to this reference lab. */
  async getInvestigations(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.repo.findInvestigations(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateOutsourceLabDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const count = await this.repo.countInvestigations(id);
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete outsource lab: ${count} investigation(s) are routed to it. Reassign them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Outsource lab deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Outsource lab code already exists');
    }
    throw e;
  }
}
