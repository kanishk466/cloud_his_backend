import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MedicationsRepository } from './medications.repository';
import { ClinicalContextService } from './clinical-context.service';
import { CreateMedicationDto, StopMedicationDto } from './dto/create-medication.dto';

/**
 * IPD medication orders — the stay's drug chart.
 *
 *   POST /api/ipd/medications          order a drug
 *   GET  /api/ipd/medications          ACTIVE first, then newest (?admissionId=&status=)
 *   POST /api/ipd/medications/:id/stop stop a drug (keeps the row as history)
 */
@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(
    private readonly repo: MedicationsRepository,
    private readonly context: ClinicalContextService,
  ) {}

  async order(tenantId: string, userId: string, dto: CreateMedicationDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      dto.admissionId,
    );
    this.context.assertOpen(admission, 'order a medication');

    const order = await this.repo.create(tenantId, admission.id, userId, dto);

    this.logger.log(
      `Medication ordered on ${admission.admissionNo}: ${dto.drugName} ${dto.dose}`,
    );
    return order;
  }

  async list(tenantId: string, admissionId: string, status?: string) {
    const admission = await this.context.requireAdmission(tenantId, admissionId);
    return this.repo.list(tenantId, admission.id, status);
  }

  async stop(
    tenantId: string,
    userId: string,
    id: string,
    dto: StopMedicationDto,
  ) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing)
      throw new NotFoundException({
        code: 'MEDICATION_NOT_FOUND',
        message: 'Medication order not found in this hospital',
      });

    if (existing.status === 'STOPPED') {
      throw new BadRequestException({
        code: 'MEDICATION_ALREADY_STOPPED',
        message: 'This medication order is already stopped',
        details: { stoppedAt: existing.stoppedAt },
      });
    }

    const admission = await this.context.requireAdmission(
      tenantId,
      existing.admissionId,
    );
    this.context.assertOpen(admission, 'stop a medication');

    const stopped = await this.repo.stop(tenantId, id, userId, dto.reason);

    this.logger.log(
      `Medication stopped on ${admission.admissionNo}: ${existing.drugName} by ${userId}`,
    );
    return stopped;
  }
}
