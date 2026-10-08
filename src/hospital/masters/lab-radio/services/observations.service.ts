import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ObservationDataType, Prisma } from '@prisma/client';
import { ObservationsRepository } from '../repositories/observations.repository';
import { CreateObservationDto } from '../dto/observation/create-observation.dto';
import { UpdateObservationDto } from '../dto/observation/update-observation.dto';

@Injectable()
export class ObservationsService {
  constructor(private readonly repo: ObservationsRepository) {}

  async create(tenantId: string, dto: CreateObservationDto) {
    this.assertDataTypeRequirements(dto.dataType, dto);
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(
    tenantId: string,
    filters: {
      dataType?: ObservationDataType;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const observation = await this.repo.findById(tenantId, id);
    if (!observation) throw new NotFoundException('Observation not found');
    return observation;
  }

  /** Reverse lookup: which investigations use this observation. */
  async getUsedIn(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const mappings = await this.repo.findUsedIn(tenantId, id);
    return mappings.map((m) => ({
      sortOrder: m.sortOrder,
      isMandatory: m.isMandatory,
      isReportable: m.isReportable,
      investigation: m.investigation,
    }));
  }

  async update(tenantId: string, id: string, dto: UpdateObservationDto) {
    const existing = await this.findOne(tenantId, id);

    // Validate against the EFFECTIVE dataType after merge
    const effectiveType = dto.dataType ?? existing.dataType;
    this.assertDataTypeRequirements(effectiveType, {
      selectOptions: dto.selectOptions ?? existing.selectOptions,
      formulaExpression: dto.formulaExpression ?? existing.formulaExpression,
    });

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
        `Cannot delete observation: it is used in ${usages} investigation mapping(s). Remove it from those investigations first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Observation deleted successfully' };
  }

  private assertDataTypeRequirements(
    dataType: ObservationDataType | undefined,
    dto: { selectOptions?: string[]; formulaExpression?: string | null },
  ) {
    if (
      dataType === 'SELECT' &&
      (!dto.selectOptions || dto.selectOptions.length === 0)
    ) {
      throw new BadRequestException(
        'selectOptions is required for SELECT dataType',
      );
    }
    if (dataType === 'CALCULATED' && !dto.formulaExpression?.trim()) {
      throw new BadRequestException(
        'formulaExpression is required for CALCULATED dataType',
      );
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Observation code already exists');
    }
    throw e;
  }
}
