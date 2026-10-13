import { Injectable, Logger } from '@nestjs/common';
import { RoundsRepository } from './rounds.repository';
import { ClinicalContextService } from './clinical-context.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { ClinicalFilterDto } from './dto/clinical-filter.dto';

/**
 * IPD rounds — doctor round notes of a stay (SOAP), newest first.
 *
 *   POST /api/ipd/rounds   add one round
 *   GET  /api/ipd/rounds   timeline (?admissionId=&limit=)
 */
@Injectable()
export class RoundsService {
  private readonly logger = new Logger(RoundsService.name);

  constructor(
    private readonly repo: RoundsRepository,
    private readonly context: ClinicalContextService,
  ) {}

  async record(tenantId: string, userId: string, dto: CreateRoundDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      dto.admissionId,
    );
    this.context.assertOpen(admission, 'record a round');

    const round = await this.repo.create(tenantId, admission.id, userId, dto);

    this.logger.log(
      `Round recorded on ${admission.admissionNo} by ${userId}`,
    );
    return round;
  }

  async list(tenantId: string, filters: ClinicalFilterDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      filters.admissionId,
    );
    return this.repo.list(tenantId, admission.id, filters.limit ?? 50);
  }
}
