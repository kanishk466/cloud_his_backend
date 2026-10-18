import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gender, ReferenceRange } from '@prisma/client';
import { ReferenceRangesRepository } from '../repositories/reference-ranges.repository';
import { CreateReferenceRangeDto } from '../dto/reference-range/create-reference-range.dto';
import { BulkCreateReferenceRangesDto } from '../dto/reference-range/bulk-create-reference-ranges.dto';

@Injectable()
export class ReferenceRangesService {
  constructor(private readonly repo: ReferenceRangesRepository) {}

  async create(tenantId: string, dto: CreateReferenceRangeDto) {
    await this.assertObservationExists(tenantId, dto.observationId);
    this.assertRangeSanity(dto);
    return this.repo.create(tenantId, dto);
  }

  /** Atomic replace of ALL ranges for an observation. */
  async bulkCreate(tenantId: string, dto: BulkCreateReferenceRangesDto) {
    await this.assertObservationExists(tenantId, dto.observationId);
    for (const range of dto.ranges) {
      this.assertRangeSanity(range);
    }
    return this.repo.replaceForObservation(
      tenantId,
      dto.observationId,
      dto.ranges,
    );
  }

  async findForObservation(tenantId: string, observationId: string) {
    await this.assertObservationExists(tenantId, observationId);
    return this.repo.findForObservation(tenantId, observationId);
  }

  async remove(tenantId: string, id: string) {
    const range = await this.repo.findById(tenantId, id);
    if (!range) throw new NotFoundException('Reference range not found');
    await this.repo.remove(tenantId, id);
    return { message: 'Reference range deleted successfully' };
  }

  // ─── Range Lookup (consumed by Lab Result Entry in Session 3/4) ────────────
  //
  // Specificity: exact-gender+age > gender-only > age-only > universal.
  // Age bounds are open-ended (null = unbounded).

  async getApplicableRange(
    tenantId: string,
    observationId: string,
    gender: Gender | null | undefined,
    ageYears: number | null | undefined,
  ): Promise<ReferenceRange | null> {
    const ranges = await this.repo.findForObservation(
      tenantId,
      observationId,
      true,
    );

    let best: { range: ReferenceRange; score: number; ageSpan: number } | null =
      null;

    for (const range of ranges) {
      // Gender gate: exact match (+2), wildcard null (+1), else disqualified
      let score: number;
      if (range.gender === null) {
        score = 1;
      } else if (gender && range.gender === gender) {
        score = 2;
      } else {
        continue;
      }

      // Age gate (when age is known)
      const hasAgeBounds =
        range.minAgeYears != null || range.maxAgeYears != null;
      let ageSpan = Number.MAX_SAFE_INTEGER;

      if (ageYears != null) {
        if (range.minAgeYears != null && ageYears < range.minAgeYears) continue;
        if (range.maxAgeYears != null && ageYears > range.maxAgeYears) continue;
        if (hasAgeBounds) {
          score += 1;
          ageSpan = (range.maxAgeYears ?? 150) - (range.minAgeYears ?? 0);
        }
      }

      if (
        !best ||
        score > best.score ||
        (score === best.score && ageSpan < best.ageSpan)
      ) {
        best = { range, score, ageSpan };
      }
    }

    return best?.range ?? null;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async assertObservationExists(
    tenantId: string,
    observationId: string,
  ) {
    const observation = await this.repo.findObservation(
      tenantId,
      observationId,
    );
    if (!observation) {
      throw new NotFoundException('Observation not found in this hospital');
    }
  }

  private assertRangeSanity(dto: {
    minAgeYears?: number;
    maxAgeYears?: number;
    minValue?: number;
    maxValue?: number;
    criticalLow?: number;
    criticalHigh?: number;
  }) {
    if (
      dto.minAgeYears != null &&
      dto.maxAgeYears != null &&
      dto.minAgeYears > dto.maxAgeYears
    ) {
      throw new BadRequestException('minAgeYears cannot exceed maxAgeYears');
    }
    if (
      dto.minValue != null &&
      dto.maxValue != null &&
      dto.minValue > dto.maxValue
    ) {
      throw new BadRequestException('minValue cannot exceed maxValue');
    }
    if (
      dto.criticalLow != null &&
      dto.criticalHigh != null &&
      dto.criticalLow > dto.criticalHigh
    ) {
      throw new BadRequestException('criticalLow cannot exceed criticalHigh');
    }
  }
}
