import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SampleTypesRepository } from '../repositories/sample-types.repository';
import { CreateSampleTypeDto } from '../dto/sample-type/create-sample-type.dto';
import { UpdateSampleTypeDto } from '../dto/sample-type/update-sample-type.dto';

interface TubeRequirement {
  container: string | null;
  containerName: string;
  color: string | null;
  hexColorCode: string | null;
  additive: string | null;
  tubeCount: number;
  totalVolumeMl: number | null;
  tests: string[];
}

@Injectable()
export class SampleTypesService {
  constructor(private readonly repo: SampleTypesRepository) {}

  async create(tenantId: string, dto: CreateSampleTypeDto) {
    await this.assertContainer(tenantId, dto.defaultContainerId);
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
    const sampleType = await this.repo.findById(tenantId, id);
    if (!sampleType) throw new NotFoundException('Sample type not found');
    return sampleType;
  }

  /** Formatted stability + retention summary for technician review. */
  async getStabilityCard(tenantId: string, id: string) {
    const s = await this.findOne(tenantId, id);

    const parts: string[] = [];
    if (s.stabilityRoomTempHours != null)
      parts.push(`${s.stabilityRoomTempHours}h at room temp`);
    if (s.stabilityFridgeHours != null)
      parts.push(`${s.stabilityFridgeHours}h refrigerated (2-8°C)`);
    if (s.stabilityFrozenDays != null && s.stabilityFrozenDays > 0)
      parts.push(`${s.stabilityFrozenDays} days frozen (-20°C)`);

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      defaultContainer: s.defaultContainer,
      storageTemp: s.storageTemp,
      minVolumeMl: s.minVolumeMl != null ? Number(s.minVolumeMl) : null,
      stability: {
        roomTempHours: s.stabilityRoomTempHours,
        fridgeHours: s.stabilityFridgeHours,
        frozenDays: s.stabilityFrozenDays,
      },
      archiveDays: s.archiveDays,
      collectionInstructions: s.collectionInstructions,
      summary: `Stable ${parts.join(', ') || 'as per protocol'}. Retain ${s.archiveDays} day(s) post-report for re-testing.`,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateSampleTypeDto) {
    await this.findOne(tenantId, id);
    if (dto.defaultContainerId) {
      await this.assertContainer(tenantId, dto.defaultContainerId);
    }
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
        `Cannot delete sample type: ${usages} investigation(s) are linked to it. Reassign them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Sample type deleted successfully' };
  }

  // ─── Collection Worklist (phlebotomy / barcoding workflow) ─────────────────
  //
  // Given the investigation IDs on an order, dedupe the required vacutainers:
  // one tube per container color (single puncture), tests grouped per tube.
  // Container resolution per test: direct link → sample type's default tube.

  async getCollectionWorklistRequirements(
    tenantId: string,
    investigationIds: string[],
  ) {
    const investigations = await this.repo.findForWorklist(
      tenantId,
      investigationIds,
    );

    const tubesByKey = new Map<string, TubeRequirement>();
    const unassignedTests: string[] = [];
    let fastingRequired = false;
    const instructions = new Set<string>();

    for (const inv of investigations) {
      if (inv.fastingRequired) fastingRequired = true;
      if (inv.sampleTypeRel?.collectionInstructions) {
        instructions.add(inv.sampleTypeRel.collectionInstructions);
      }

      const container =
        inv.sampleContainerRel ?? inv.sampleTypeRel?.defaultContainer ?? null;

      if (!container) {
        unassignedTests.push(inv.name);
        continue;
      }

      const key = container.id;
      const bucket = tubesByKey.get(key) ?? {
        container: container.code,
        containerName: container.name,
        color: container.capColor,
        hexColorCode: container.hexColorCode,
        additive: container.additive,
        tubeCount: 1, // one tube per color — single puncture draw
        totalVolumeMl:
          container.defaultVolumeMl != null
            ? Number(container.defaultVolumeMl)
            : null,
        tests: [],
      };
      bucket.tests.push(inv.name);
      tubesByKey.set(key, bucket);
    }

    const specialInstructions = [
      ...(fastingRequired ? ['Ensure 8-12 hours overnight fasting'] : []),
      ...Array.from(instructions),
    ];

    return {
      requiredTubes: Array.from(tubesByKey.values()),
      ...(unassignedTests.length > 0 ? { unassignedTests } : {}),
      fastingRequired,
      specialInstructions,
    };
  }

  private async assertContainer(tenantId: string, containerId?: string) {
    if (!containerId) return;
    const container = await this.repo.findContainer(tenantId, containerId);
    if (!container) {
      throw new NotFoundException(
        'Sample container not found (or inactive) in this hospital',
      );
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Sample type code already exists');
    }
    throw e;
  }
}
