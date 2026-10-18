import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DietOrdersRepository } from './diet-orders.repository';
import { ClinicalContextService } from './clinical-context.service';
import { CreateDietOrderDto } from './dto/create-diet-order.dto';
import { ClinicalFilterDto } from './dto/clinical-filter.dto';

/**
 * IPD diet orders — one live diet per stay.
 *
 *   POST /api/ipd/diet-orders        set/replace the diet
 *   GET  /api/ipd/diet-orders        history, newest first (?admissionId=)
 *   POST /api/ipd/diet-orders/:id/stop  stop the diet without a replacement
 */
@Injectable()
export class DietOrdersService {
  private readonly logger = new Logger(DietOrdersService.name);

  constructor(
    private readonly repo: DietOrdersRepository,
    private readonly context: ClinicalContextService,
  ) {}

  async order(tenantId: string, userId: string, dto: CreateDietOrderDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      dto.admissionId,
    );
    this.context.assertOpen(admission, 'change the diet');

    const order = await this.repo.create(tenantId, admission.id, userId, dto);

    this.logger.log(
      `Diet set on ${admission.admissionNo}: ${dto.dietType}`,
    );
    return order;
  }

  async list(tenantId: string, filters: ClinicalFilterDto) {
    const admission = await this.context.requireAdmission(
      tenantId,
      filters.admissionId,
    );
    return this.repo.list(tenantId, admission.id, filters.limit ?? 50);
  }

  /** The order the kitchen is working from — null when no diet is set. */
  async active(tenantId: string, admissionId: string) {
    const admission = await this.context.requireAdmission(tenantId, admissionId);
    return this.repo.findActive(tenantId, admission.id);
  }

  async stop(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing)
      throw new NotFoundException({
        code: 'DIET_ORDER_NOT_FOUND',
        message: 'Diet order not found in this hospital',
      });

    if (!existing.isActive) {
      throw new BadRequestException({
        code: 'DIET_ORDER_ALREADY_INACTIVE',
        message: 'This diet order is already inactive',
      });
    }

    const admission = await this.context.requireAdmission(
      tenantId,
      existing.admissionId,
    );
    this.context.assertOpen(admission, 'stop the diet');

    return this.repo.stop(tenantId, id);
  }
}
