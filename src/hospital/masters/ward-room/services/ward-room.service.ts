import { Injectable } from '@nestjs/common';
import { BedsRepository } from '../repositories/beds.repository';
import { BedStatusRepository } from '../repositories/bed-status.repository';

/**
 * BOR (Bed Occupancy Rate) — hospital management's #1 KPI.
 * BOR = occupied beds / COUNTABLE beds × 100.
 * Beds under room types with isCount = false (recovery stretchers, etc.)
 * are excluded from both sides of the ratio.
 */
@Injectable()
export class WardRoomService {
  constructor(
    private readonly bedsRepo: BedsRepository,
    private readonly bedStatusRepo: BedStatusRepository,
  ) {}

  async getBorDashboard(tenantId: string) {
    const beds = await this.bedsRepo.findAllForBor(tenantId);

    const totalBeds = beds.length;
    const countable = beds.filter((b) => b.room.roomType.isCount);
    const countableBeds = countable.length;

    const statusOf = (b: (typeof countable)[number]) =>
      b.statusHistory[0]?.status ?? 'AVAILABLE';

    const occupiedBeds = countable.filter(
      (b) => statusOf(b) === 'OCCUPIED',
    ).length;
    const availableBeds = countable.filter(
      (b) => statusOf(b) === 'AVAILABLE',
    ).length;
    const reservedBeds = countable.filter(
      (b) => statusOf(b) === 'RESERVED',
    ).length;

    const borPercent =
      countableBeds > 0 ? round1((occupiedBeds / countableBeds) * 100) : 0;

    // ─── Per room type (countable only) ────────────────────────────────────
    const byTypeMap = new Map<
      string,
      { roomType: string; sortOrder: number; total: number; occupied: number }
    >();
    for (const bed of countable) {
      const type = bed.room.roomType;
      const bucket = byTypeMap.get(type.id) ?? {
        roomType: type.name,
        sortOrder: type.sortOrder,
        total: 0,
        occupied: 0,
      };
      bucket.total += 1;
      if (statusOf(bed) === 'OCCUPIED') bucket.occupied += 1;
      byTypeMap.set(type.id, bucket);
    }

    const byRoomType = Array.from(byTypeMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...t }) => ({
        ...t,
        bor: t.total > 0 ? round1((t.occupied / t.total) * 100) : 0,
      }));

    // ─── Per gender ward (countable only) ──────────────────────────────────
    const byGenderMap = new Map<string, { total: number; occupied: number }>();
    for (const bed of countable) {
      const gender = bed.room.gender;
      const bucket = byGenderMap.get(gender) ?? { total: 0, occupied: 0 };
      bucket.total += 1;
      if (statusOf(bed) === 'OCCUPIED') bucket.occupied += 1;
      byGenderMap.set(gender, bucket);
    }

    const byGender = Array.from(byGenderMap.entries()).map(
      ([gender, bucket]) => ({ gender, ...bucket }),
    );

    return {
      totalBeds,
      countableBeds,
      occupiedBeds,
      availableBeds,
      reservedBeds,
      borPercent,
      byRoomType,
      byGender,
    };
  }

  // ─── Housekeeping task queue (Phase 2.3 follow-up) ─────────────────────────
  //
  // Auto-worklist for the housekeeping team: every bed whose CURRENT status
  // is HOUSEKEEPING, oldest pending first. Completing a task =
  // POST /beds/:bedId/status { status: 'AVAILABLE' } (state machine).

  async getHousekeepingQueue(tenantId: string) {
    const rows = await this.bedStatusRepo.findCurrentByStatus(
      tenantId,
      'HOUSEKEEPING',
    );

    return {
      total: rows.length,
      items: rows.map((row) => ({
        bedId: row.bedId,
        bedIdentifier: row.bed.bedIdentifier,
        roomNumber: row.bed.room.roomNumber,
        floor: row.bed.room.floor,
        wing: row.bed.room.wing,
        gender: row.bed.room.gender,
        roomType: row.bed.room.roomType,
        pendingSince: row.effectiveFrom,
        reason: row.reason,
        reportedBy: row.changedBy,
      })),
    };
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
