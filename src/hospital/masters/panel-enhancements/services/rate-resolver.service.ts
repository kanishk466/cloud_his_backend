import { Injectable } from '@nestjs/common';
import { RateSchedulesRepository } from '../repositories/rate-schedules.repository';

export interface ResolvedTariff {
  tariffId: string;
  scheduleName: string;
  resolvedFrom: 'DATE_MATCH' | 'DEFAULT_SCHEDULE' | 'PANEL_TARIFF';
  rateMultiplier: number; // future panel-specific rate factor (1 = as-listed)
}

/**
 * Phase 3.1 — Effective-date tariff resolution.
 *
 * Billing engines (OPD now, IPD later) call this before pricing so a bill
 * dated 2024 prices from the 2024 CGHS rate list while a 2026 bill picks
 * the revised list — audit/reprint stays historically accurate.
 *
 * Resolution: latest covering schedule → isDefault schedule → panel tariff.
 */
@Injectable()
export class RateResolverService {
  constructor(private readonly repo: RateSchedulesRepository) {}

  async resolveActiveTariff(
    tenantId: string,
    panelId: string,
    targetDate: Date = new Date(),
    context: 'OPD' | 'IPD' = 'OPD',
  ): Promise<ResolvedTariff | null> {
    // 1. Latest schedule covering the target date
    const dateMatch = await this.repo.findActiveForDate(
      tenantId,
      panelId,
      targetDate,
    );
    if (dateMatch) {
      return {
        tariffId: dateMatch.tariffId,
        scheduleName: dateMatch.scheduleName,
        resolvedFrom: 'DATE_MATCH',
        rateMultiplier: 1,
      };
    }

    // 2. The panel's designated default schedule
    const defaultSchedule = await this.repo.findDefault(tenantId, panelId);
    if (defaultSchedule) {
      return {
        tariffId: defaultSchedule.tariffId,
        scheduleName: defaultSchedule.scheduleName,
        resolvedFrom: 'DEFAULT_SCHEDULE',
        rateMultiplier: 1,
      };
    }

    // 3. Panel's own tariff (pre-schedule setup)
    const panel = await this.repo.findPanel(tenantId, panelId);
    if (!panel) return null;

    const fallbackTariffId =
      context === 'IPD' ? panel.ipdTariffId : panel.opdTariffId;
    const effectiveFallback =
      fallbackTariffId ?? panel.opdTariffId ?? panel.ipdTariffId;

    if (!effectiveFallback) return null;

    return {
      tariffId: effectiveFallback,
      scheduleName: `${panel.panelName} base tariff`,
      resolvedFrom: 'PANEL_TARIFF',
      rateMultiplier: 1,
    };
  }
}
