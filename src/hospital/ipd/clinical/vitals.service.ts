import { Injectable, Logger } from '@nestjs/common';
import { VitalsRepository } from './vitals.repository';
import { ClinicalContextService } from './clinical-context.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { ClinicalFilterDto } from './dto/clinical-filter.dto';

/**
 * IPD vitals — the nursing-station observation chart of a stay.
 *
 *   POST /api/ipd/vitals   record one observation set
 *   GET  /api/ipd/vitals   newest first (?admissionId=&limit=)
 *
 * Writable only while the admission is open (ADMITTED / DISCHARGE_ORDERED);
 * a discharged chart is history.
 */
@Injectable()
export class VitalsService {
  private readonly logger = new Logger(VitalsService.name);

  constructor(
    private readonly repo: VitalsRepository,
    private readonly context: ClinicalContextService,
  ) {}

  async record(tenantId: string, userId: string, dto: CreateVitalsDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      dto.admissionId,
    );
    this.context.assertOpen(admission, 'chart vitals');

    const vital = await this.repo.create(tenantId, admission.id, userId, dto);

    this.logger.log(
      `Vitals charted on ${admission.admissionNo} (${admission.bedIdentifier ?? 'no bed'}) by ${userId}`,
    );
    return vital;
  }

  async list(tenantId: string, filters: ClinicalFilterDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      filters.admissionId,
    );
    return this.repo.list(tenantId, admission.id, filters.limit ?? 50);
  }
}
