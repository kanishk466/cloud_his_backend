import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateRateScheduleDto } from '../dto/rate-schedule/create-rate-schedule.dto';
import { UpdateRateScheduleDto } from '../dto/rate-schedule/update-rate-schedule.dto';

const RELATION_SELECT = {
  panel: { select: { id: true, panelCode: true, panelName: true } },
  tariff: { select: { id: true, tariffCode: true, tariffName: true } },
} as const;

@Injectable()
export class RateSchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateRateScheduleDto) {
    return this.prisma.rateSchedule.create({
      data: { ...dto, tenantId },
      include: RELATION_SELECT,
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.rateSchedule.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: RELATION_SELECT,
      orderBy: [{ panelId: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  /** All schedules for a panel, newest revision first. */
  findByPanel(tenantId: string, panelId: string) {
    return this.prisma.rateSchedule.findMany({
      where: { tenantId, panelId, deletedAt: null },
      include: RELATION_SELECT,
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.rateSchedule.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: RELATION_SELECT,
    });
  }

  update(tenantId: string, id: string, dto: UpdateRateScheduleDto) {
    return this.prisma.rateSchedule.update({
      where: { id, tenantId },
      data: dto,
      include: RELATION_SELECT,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.rateSchedule.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Overlap + resolution queries ───────────────────────────────────────────

  /** Active schedules overlapping the given range (null end = open-ended). */
  findOverlapping(
    tenantId: string,
    panelId: string,
    effectiveFrom: Date,
    effectiveTo: Date | undefined | null,
    excludeId?: string,
  ) {
    return this.prisma.rateSchedule.findMany({
      where: {
        tenantId,
        panelId,
        deletedAt: null,
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
    });
  }

  /** Active schedule covering targetDate with the LATEST effectiveFrom. */
  findActiveForDate(tenantId: string, panelId: string, targetDate: Date) {
    return this.prisma.rateSchedule.findFirst({
      where: {
        tenantId,
        panelId,
        deletedAt: null,
        isActive: true,
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      include: RELATION_SELECT,
    });
  }

  findDefault(tenantId: string, panelId: string) {
    return this.prisma.rateSchedule.findFirst({
      where: {
        tenantId,
        panelId,
        deletedAt: null,
        isActive: true,
        isDefault: true,
      },
      orderBy: { updatedAt: 'desc' },
      include: RELATION_SELECT,
    });
  }

  // ─── Validation helpers ─────────────────────────────────────────────────────

  findPanel(tenantId: string, panelId: string) {
    return this.prisma.panel.findFirst({
      where: { id: panelId, tenantId, deletedAt: null },
      select: {
        id: true,
        panelName: true,
        opdTariffId: true,
        ipdTariffId: true,
      },
    });
  }

  findTariff(tenantId: string, tariffId: string) {
    return this.prisma.tariffMaster.findFirst({
      where: { id: tariffId, tenantId, deletedAt: null },
      select: { id: true, tariffName: true },
    });
  }
}
