import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { BedStatusType, Prisma } from '@prisma/client';
import { FilterBedDto } from '../dto/bed/filter-bed.dto';

const BED_INCLUDE = {
  room: {
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      wing: true,
      gender: true,
      roomType: { select: { id: true, name: true, code: true, isCount: true } },
    },
  },
  statusHistory: {
    where: { isCurrent: true },
    take: 1,
  },
} as const;

@Injectable()
export class BedsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRoom(tenantId: string, roomId: string) {
    return this.prisma.room.findFirst({
      where: { id: roomId, tenantId, deletedAt: null },
      select: { id: true, roomNumber: true, isActive: true },
    });
  }

  /** Creates the bed AND its initial AVAILABLE status in one transaction. */
  async create(
    tenantId: string,
    roomId: string,
    roomNumber: string,
    bedNumber: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.bed.create({
        data: {
          tenantId,
          roomId,
          bedNumber,
          bedIdentifier: `${roomNumber}/${bedNumber}`,
        },
        include: BED_INCLUDE,
      });

      await tx.bedStatus.create({
        data: { tenantId, bedId: bed.id, status: 'AVAILABLE' },
      });

      return bed;
    });
  }

  /** Bulk generator — createMany for beds + initial statuses, one transaction. */
  async bulkCreate(
    tenantId: string,
    roomId: string,
    roomNumber: string,
    bedNumbers: string[],
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const result = await tx.bed.createMany({
          data: bedNumbers.map((bedNumber) => ({
            tenantId,
            roomId,
            bedNumber,
            bedIdentifier: `${roomNumber}/${bedNumber}`,
          })),
          skipDuplicates: true,
        });

        // Initial AVAILABLE status for the beds that were actually created
        const createdBeds = await tx.bed.findMany({
          where: {
            tenantId,
            roomId,
            bedNumber: { in: bedNumbers },
            statusHistory: { none: {} },
          },
          select: { id: true },
        });

        if (createdBeds.length > 0) {
          await tx.bedStatus.createMany({
            data: createdBeds.map((bed) => ({
              tenantId,
              bedId: bed.id,
              status: 'AVAILABLE' as const,
            })),
          });
        }

        return { created: result.count };
      },
      { timeout: 60000 },
    );
  }

  findAll(tenantId: string, filters: FilterBedDto) {
    const where: Prisma.BedWhereInput = {
      tenantId,
      deletedAt: null,
      ...(typeof filters.isActive === 'boolean'
        ? { isActive: filters.isActive }
        : {}),
      ...(filters.roomId ? { roomId: filters.roomId } : {}),
      ...(filters.roomTypeId || filters.gender
        ? {
            room: {
              ...(filters.roomTypeId ? { roomTypeId: filters.roomTypeId } : {}),
              ...(filters.gender ? { gender: filters.gender } : {}),
            },
          }
        : {}),
      ...(filters.status
        ? {
            statusHistory: {
              some: { isCurrent: true, status: filters.status },
            },
          }
        : {}),
    };

    return this.prisma.bed.findMany({
      where,
      include: BED_INCLUDE,
      orderBy: [{ room: { roomNumber: 'asc' } }, { bedNumber: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.bed.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: BED_INCLUDE,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.bed.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Occupancy helpers ──────────────────────────────────────────────────────

  /** Beds of one room with their current status (for the occupancy endpoint). */
  findForOccupancy(tenantId: string, roomId: string) {
    return this.prisma.bed.findMany({
      where: { tenantId, roomId, deletedAt: null },
      include: { statusHistory: { where: { isCurrent: true }, take: 1 } },
      orderBy: { bedNumber: 'asc' },
    });
  }

  /** All active beds + current status (for BOR dashboard). */
  findAllForBor(tenantId: string) {
    return this.prisma.bed.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      include: {
        room: {
          select: {
            gender: true,
            roomType: {
              select: { id: true, name: true, isCount: true, sortOrder: true },
            },
          },
        },
        statusHistory: {
          where: { isCurrent: true },
          take: 1,
          select: { status: true },
        },
      },
    });
  }
}
