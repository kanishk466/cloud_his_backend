import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvestigationsRepository } from '../repositories/investigations.repository';
import { ObservationsRepository } from '../repositories/observations.repository';
import { CreateInvestigationDto } from '../dto/investigation/create-investigation.dto';
import { UpdateInvestigationDto } from '../dto/investigation/update-investigation.dto';
import { FilterInvestigationDto } from '../dto/investigation/filter-investigation.dto';
import { AssignObservationsDto } from '../dto/observation/assign-observation.dto';

// Category codes whose services may back an investigation (billing link).
// Covers the default seed tree (DIAG, RAD, RAD_*) and common custom setups.
const LAB_CATEGORY_CODES = ['DIAG', 'RAD', 'LAB', 'RADIOLOGY', 'PATHOLOGY'];

@Injectable()
export class InvestigationsService {
  constructor(
    private readonly repo: InvestigationsRepository,
    private readonly observationsRepo: ObservationsRepository,
  ) {}

  async create(tenantId: string, dto: CreateInvestigationDto) {
    await this.validateServiceAndDepartment(tenantId, dto);
    await this.validatePreAnalyticalLinks(tenantId, dto);

    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, filters: FilterInvestigationDto) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const investigation = await this.repo.findById(tenantId, id);
    if (!investigation) throw new NotFoundException('Investigation not found');
    return investigation;
  }

  /** Full detail: dept + service (rate/category) + ordered observations + ranges. */
  async getDetails(tenantId: string, id: string) {
    const investigation = await this.repo.findDetails(tenantId, id);
    if (!investigation) throw new NotFoundException('Investigation not found');
    return investigation;
  }

  async update(tenantId: string, id: string, dto: UpdateInvestigationDto) {
    await this.findOne(tenantId, id);

    if (dto.serviceId || dto.labDepartmentId) {
      const current = await this.repo.findById(tenantId, id);
      await this.validateServiceAndDepartment(tenantId, {
        serviceId: dto.serviceId ?? current!.serviceId,
        labDepartmentId: dto.labDepartmentId ?? current!.labDepartmentId,
      });
    }

    if (dto.sampleTypeId || dto.sampleContainerId) {
      await this.validatePreAnalyticalLinks(tenantId, dto);
    }

    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Investigation deleted successfully' };
  }

  // ─── Assign / reorder observations (atomic replace) ─────────────────────────

  async assignObservations(
    tenantId: string,
    id: string,
    dto: AssignObservationsDto,
  ) {
    await this.findOne(tenantId, id);

    const ids = dto.observations.map((o) => o.observationId);
    const valid = await this.observationsRepo.findByIds(tenantId, ids);
    const validIds = new Set(valid.map((o) => o.id));
    const invalid = ids.filter((oid) => !validIds.has(oid));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown or inactive observations: ${invalid.join(', ')}`,
      );
    }

    const mappings = await this.repo.replaceObservations(id, dto.observations);

    return {
      message: 'Investigation observations updated successfully',
      observations: mappings,
    };
  }

  // ─── Validation helpers ─────────────────────────────────────────────────────

  private async validateServiceAndDepartment(
    tenantId: string,
    dto: { serviceId: string; labDepartmentId: string },
  ) {
    const service = await this.repo.findService(tenantId, dto.serviceId);
    if (!service || !service.isActive) {
      throw new NotFoundException(
        'Service not found (or inactive) in this hospital — the billing link requires an active ServiceMaster',
      );
    }

    // Category sanity: investigations must be backed by lab/radiology services
    const categoryCode = service.categoryRel?.code;
    if (
      categoryCode &&
      !LAB_CATEGORY_CODES.includes(categoryCode) &&
      !categoryCode.startsWith('RAD_')
    ) {
      throw new BadRequestException(
        `Service '${service.serviceName}' belongs to category '${categoryCode}' — investigations can only link to lab/radiology (DIAG/RAD) services`,
      );
    }

    const dept = await this.repo.findLabDepartment(
      tenantId,
      dto.labDepartmentId,
    );
    if (!dept) {
      throw new NotFoundException(
        'Lab department not found (or inactive) in this hospital',
      );
    }
  }

  private async validatePreAnalyticalLinks(
    tenantId: string,
    dto: { sampleTypeId?: string; sampleContainerId?: string },
  ) {
    if (dto.sampleTypeId) {
      const st = await this.repo.findSampleType(tenantId, dto.sampleTypeId);
      if (!st) {
        throw new NotFoundException(
          'Sample type not found (or inactive) in this hospital',
        );
      }
    }
    if (dto.sampleContainerId) {
      const sc = await this.repo.findSampleContainer(
        tenantId,
        dto.sampleContainerId,
      );
      if (!sc) {
        throw new NotFoundException(
          'Sample container not found (or inactive) in this hospital',
        );
      }
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Investigation code already exists');
    }
    throw e;
  }
}
