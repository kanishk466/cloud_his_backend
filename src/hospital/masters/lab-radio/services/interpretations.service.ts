import { Injectable, NotFoundException } from '@nestjs/common';
import { Gender, InvestigationInterpretation } from '@prisma/client';
import { InterpretationsRepository } from '../repositories/interpretations.repository';
import { ReferenceRangesService } from './reference-ranges.service';
import { CreateInterpretationDto } from '../dto/interpretation/create-interpretation.dto';
import { BulkCreateInterpretationsDto } from '../dto/interpretation/bulk-create-interpretations.dto';

export interface MatchedInterpretation {
  id: string;
  condition: string;
  interpretationText: string;
  severity: string;
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

@Injectable()
export class InterpretationsService {
  constructor(
    private readonly repo: InterpretationsRepository,
    private readonly referenceRangesService: ReferenceRangesService,
  ) {}

  async create(tenantId: string, dto: CreateInterpretationDto) {
    await this.assertObservationExists(tenantId, dto.observationId);
    return this.repo.create(tenantId, dto);
  }

  /** Replace ALL rules of an observation atomically. */
  async bulkCreate(tenantId: string, dto: BulkCreateInterpretationsDto) {
    await this.assertObservationExists(tenantId, dto.observationId);
    return this.repo.replaceForObservation(
      tenantId,
      dto.observationId,
      dto.interpretations,
    );
  }

  async findForObservation(tenantId: string, observationId: string) {
    await this.assertObservationExists(tenantId, observationId);
    return this.repo.findForObservation(tenantId, observationId, false);
  }

  async findOne(tenantId: string, id: string) {
    const rule = await this.repo.findById(tenantId, id);
    if (!rule) throw new NotFoundException('Interpretation rule not found');
    return rule;
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateInterpretationDto>,
  ) {
    await this.findOne(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.remove(tenantId, id);
    return { message: 'Interpretation rule deleted successfully' };
  }

  // ─── Interpretation Engine (consumed by Lab Result Entry, Session 3/4) ─────
  //
  // Evaluates a result value against the observation's rules, using the
  // applicable ReferenceRange for range-based conditions.
  // Returns matched interpretations, CRITICAL first.

  async evaluateInterpretations(
    tenantId: string,
    observationId: string,
    value: number | string,
    gender?: Gender | null,
    ageYears?: number | null,
  ): Promise<MatchedInterpretation[]> {
    const rules = await this.repo.findForObservation(
      tenantId,
      observationId,
      true,
    );
    if (rules.length === 0) return [];

    const range = await this.referenceRangesService.getApplicableRange(
      tenantId,
      observationId,
      gender,
      ageYears,
    );

    const numericValue = typeof value === 'number' ? value : Number(value);
    const isNumeric = !Number.isNaN(numericValue);
    const stringValue = String(value).toLowerCase();

    const matched: MatchedInterpretation[] = [];

    for (const rule of rules) {
      if (
        !this.matches(rule, isNumeric ? numericValue : null, stringValue, range)
      ) {
        continue;
      }
      matched.push({
        id: rule.id,
        condition: rule.condition,
        interpretationText: rule.interpretationText,
        severity: rule.severity,
      });
    }

    return matched.sort(
      (a, b) =>
        (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3),
    );
  }

  private matches(
    rule: InvestigationInterpretation,
    numericValue: number | null,
    stringValue: string,
    range: {
      minValue: any;
      maxValue: any;
      criticalLow: any;
      criticalHigh: any;
    } | null,
  ): boolean {
    switch (rule.condition) {
      case 'ABOVE_MAX':
        return (
          numericValue != null &&
          range?.maxValue != null &&
          numericValue > Number(range.maxValue)
        );
      case 'BELOW_MIN':
        return (
          numericValue != null &&
          range?.minValue != null &&
          numericValue < Number(range.minValue)
        );
      case 'ABOVE_CRITICAL_HIGH':
        return (
          numericValue != null &&
          range?.criticalHigh != null &&
          numericValue > Number(range.criticalHigh)
        );
      case 'BELOW_CRITICAL_LOW':
        return (
          numericValue != null &&
          range?.criticalLow != null &&
          numericValue < Number(range.criticalLow)
        );
      case 'IN_RANGE':
        return (
          numericValue != null &&
          range?.minValue != null &&
          range?.maxValue != null &&
          numericValue >= Number(range.minValue) &&
          numericValue <= Number(range.maxValue)
        );
      case 'EQUALS':
        if (numericValue != null && rule.thresholdValue != null) {
          return numericValue === Number(rule.thresholdValue);
        }
        return (
          rule.thresholdText != null &&
          stringValue === rule.thresholdText.toLowerCase()
        );
      case 'CONTAINS':
        return (
          rule.thresholdText != null &&
          stringValue.includes(rule.thresholdText.toLowerCase())
        );
      default:
        return false;
    }
  }

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
}
