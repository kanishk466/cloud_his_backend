import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RateSchedulesRepository } from '../repositories/rate-schedules.repository';
import { CreateRateScheduleDto } from '../dto/rate-schedule/create-rate-schedule.dto';
import { UpdateRateScheduleDto } from '../dto/rate-schedule/update-rate-schedule.dto';

@Injectable()
export class RateSchedulesService {
  constructor(private readonly repo: RateSchedulesRepository) {}

  async create(tenantId: string, dto: CreateRateScheduleDto) {
    const panel = await this.repo.findPanel(tenantId, dto.panelId);
    if (!panel) throw new NotFoundException('Panel not found in this hospital');

    const tariff = await this.repo.findTariff(tenantId, dto.tariffId);
    if (!tariff) {
      throw new NotFoundException('Tariff master not found in this hospital');
    }

    await this.assertNoOverlap(
      tenantId,
      dto.panelId,
      dto.effectiveFrom,
      dto.effectiveTo,
    );

    return this.repo.create(tenantId, dto);
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findByPanel(tenantId: string, panelId: string) {
    const panel = await this.repo.findPanel(tenantId, panelId);
    if (!panel) throw new NotFoundException('Panel not found in this hospital');
    return this.repo.findByPanel(tenantId, panelId);
  }

  async findOne(tenantId: string, id: string) {
    const schedule = await this.repo.findById(tenantId, id);
    if (!schedule) throw new NotFoundException('Rate schedule not found');
    return schedule;
  }

  async update(tenantId: string, id: string, dto: UpdateRateScheduleDto) {
    const existing = await this.findOne(tenantId, id);

    const newFrom = dto.effectiveFrom ?? existing.effectiveFrom;
    const newTo =
      dto.effectiveTo !== undefined ? dto.effectiveTo : existing.effectiveTo;

    if (newTo && newTo < newFrom) {
      throw new BadRequestException(
        'effectiveTo cannot be earlier than effectiveFrom',
      );
    }

    await this.assertNoOverlap(tenantId, existing.panelId, newFrom, newTo, id);

    return this.repo.update(tenantId, id, dto);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Rate schedule deleted successfully' };
  }

  // ─── Overlap guard ──────────────────────────────────────────────────────────
  //
  // Two schedules of the same panel must never cover the same day —
  // otherwise resolution becomes ambiguous (and audit pricing random).

  private async assertNoOverlap(
    tenantId: string,
    panelId: string,
    effectiveFrom: Date,
    effectiveTo: Date | undefined | null,
    excludeId?: string,
  ) {
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException(
        'effectiveTo cannot be earlier than effectiveFrom',
      );
    }

    const overlapping = await this.repo.findOverlapping(
      tenantId,
      panelId,
      effectiveFrom,
      effectiveTo,
      excludeId,
    );

    if (overlapping.length > 0) {
      const first = overlapping[0];
      const format = (d: Date | null) =>
        d ? d.toISOString().split('T')[0] : 'open';
      throw new BadRequestException(
        `Overlaps with existing schedule '${first.scheduleName}' (${format(first.effectiveFrom)} → ${format(first.effectiveTo)}). Adjust the date range first.`,
      );
    }
  }
}
