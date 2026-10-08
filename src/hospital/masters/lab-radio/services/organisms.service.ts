import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganismType, Prisma } from '@prisma/client';
import { OrganismsRepository } from '../repositories/organisms.repository';
import { CreateOrganismDto } from '../dto/organism/create-organism.dto';
import { UpdateOrganismDto } from '../dto/organism/update-organism.dto';
import { SyncOrganismAntibioticsDto } from '../dto/organism-antibiotic-mapping/sync-organism-antibiotics.dto';

@Injectable()
export class OrganismsService {
  constructor(private readonly repo: OrganismsRepository) {}

  async create(tenantId: string, dto: CreateOrganismDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(
    tenantId: string,
    filters: {
      organismType?: OrganismType;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const organism = await this.repo.findById(tenantId, id);
    if (!organism) throw new NotFoundException('Organism not found');
    return organism;
  }

  async update(tenantId: string, id: string, dto: UpdateOrganismDto) {
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
    return { message: 'Organism deleted successfully' };
  }

  // ─── AST panel sync + battery ────────────────────────────────────────────────

  /** Atomic replace of the organism's standard testing panel. */
  async syncAntibioticPanel(
    tenantId: string,
    id: string,
    dto: SyncOrganismAntibioticsDto,
  ) {
    await this.findOne(tenantId, id);

    const ids = dto.panel.map((p) => p.antibioticId);
    const valid = await this.repo.findAntibioticsByIds(tenantId, ids);
    const validIds = new Set(valid.map((a) => a.id));
    const invalid = ids.filter((aid) => !validIds.has(aid));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown or inactive antibiotics: ${invalid.join(', ')}`,
      );
    }

    const mappings = await this.repo.replacePanel(id, dto.panel);

    return {
      message: 'Antibiotic panel updated successfully',
      panel: mappings.map((m) => ({
        antibiotic: m.antibiotic,
        sortOrder: m.sortOrder,
        isFirstLine: m.isFirstLine,
      })),
    };
  }

  /** Ordered AST battery: first-line drugs first (for result entry screens). */
  async getAstBattery(tenantId: string, id: string) {
    const organism = await this.findOne(tenantId, id);
    const battery = await this.repo.getAstBattery(id);

    return {
      organism: { id: organism.id, name: organism.name, code: organism.code },
      firstLine: battery.filter((m) => m.isFirstLine).map((m) => m.antibiotic),
      secondLine: battery
        .filter((m) => !m.isFirstLine)
        .map((m) => m.antibiotic),
    };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Organism code already exists');
    }
    throw e;
  }
}
