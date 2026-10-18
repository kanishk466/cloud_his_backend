import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AntibioticClass, Prisma } from '@prisma/client';
import { AntibioticsRepository } from '../repositories/antibiotics.repository';
import { CreateAntibioticDto } from '../dto/antibiotic/create-antibiotic.dto';
import { UpdateAntibioticDto } from '../dto/antibiotic/update-antibiotic.dto';

@Injectable()
export class AntibioticsService {
  constructor(private readonly repo: AntibioticsRepository) {}

  async create(tenantId: string, dto: CreateAntibioticDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(
    tenantId: string,
    filters: {
      antibioticClass?: AntibioticClass;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const antibiotic = await this.repo.findById(tenantId, id);
    if (!antibiotic) throw new NotFoundException('Antibiotic not found');
    return antibiotic;
  }

  async update(tenantId: string, id: string, dto: UpdateAntibioticDto) {
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
        `Cannot delete antibiotic: it appears in ${usages} organism panel(s). Remove those mappings first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Antibiotic deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Antibiotic code already exists');
    }
    throw e;
  }
}
