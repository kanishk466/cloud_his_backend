import { Injectable } from '@nestjs/common';
import { ThresholdRepository } from './threshold.repository';

export type ThresholdStatus = 'OK' | 'ALERT' | 'WARNING' | 'BLOCKED';

export interface ThresholdCheckResult {
  status: ThresholdStatus;
  message?: string;
  usagePercent?: number;
  maxAmount?: number;
  currentBillTotal?: number;
  thresholdId?: string;
  actionOnBreach?: 'SOFT' | 'HARD';
}

/**
 * Phase 1.4 — Threshold enforcement engine.
 *
 * Consumed by IPD billing (charge entry) and admission:
 *   < alertAtPercent           → OK
 *   ≥ alertAtPercent, < 100    → ALERT
 *   ≥ 100 with SOFT breach     → WARNING (charges proceed, flag raised)
 *   ≥ 100 with HARD breach     → BLOCKED (charges must not proceed)
 */
@Injectable()
export class ThresholdCheckService {
  constructor(private readonly repo: ThresholdRepository) {}

  async checkThreshold(
    tenantId: string,
    panelId: string | null | undefined,
    roomTypeId: string | null | undefined,
    currentBillTotal: number,
  ): Promise<ThresholdCheckResult> {
    if (!panelId) {
      return { status: 'OK', message: 'Self-pay patient, no threshold' };
    }

    const threshold = await this.repo.findMatching(
      tenantId,
      panelId,
      roomTypeId,
    );

    if (!threshold) {
      return { status: 'OK', message: 'No threshold configured' };
    }

    const maxAmount = Number(threshold.maxAmount);
    if (maxAmount <= 0) {
      return { status: 'OK', message: 'No threshold configured' };
    }

    const usagePercent =
      Math.round((currentBillTotal / maxAmount) * 10000) / 100;

    const base = {
      usagePercent,
      maxAmount,
      currentBillTotal,
      thresholdId: threshold.id,
      actionOnBreach: threshold.actionOnBreach as 'SOFT' | 'HARD',
    };

    if (usagePercent >= 100) {
      return threshold.actionOnBreach === 'HARD'
        ? {
            ...base,
            status: 'BLOCKED',
            message: `Threshold exceeded (${usagePercent}% of ₹${maxAmount}). Charges are blocked for this panel.`,
          }
        : {
            ...base,
            status: 'WARNING',
            message: `Threshold exceeded (${usagePercent}% of ₹${maxAmount}). Proceed with caution.`,
          };
    }

    if (usagePercent >= Number(threshold.alertAtPercent)) {
      return {
        ...base,
        status: 'ALERT',
        message: `Approaching threshold (${usagePercent}% of ₹${maxAmount}).`,
      };
    }

    return { ...base, status: 'OK' };
  }

  /**
   * Room-rate cap lookup — integration point with the ward-room module.
   * Returns the room type's per-day base rate plus the applicable
   * panel threshold (if any) for cap-aware billing.
   */
  async getRoomRateCap(
    tenantId: string,
    panelId: string | null | undefined,
    roomTypeId: string,
  ) {
    const roomType = await this.repo.findRoomType(tenantId, roomTypeId);
    if (!roomType) return null;

    const threshold = panelId
      ? await this.repo.findMatching(tenantId, panelId, roomTypeId)
      : null;

    return {
      roomTypeId,
      roomTypeName: roomType.name,
      dailyRate: Number(roomType.defaultRate),
      maxAmount: threshold ? Number(threshold.maxAmount) : null,
      alertAtPercent: threshold ? Number(threshold.alertAtPercent) : null,
    };
  }
}
