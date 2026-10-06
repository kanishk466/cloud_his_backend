import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { ChangeBedStatusDto } from './dto/change-bed-status.dto';
import { QueryBedStatusDto } from './dto/query-bed-status.dto';
import { BED_STATUS_TRANSITIONS, BED_STATUS_ERRORS } from './constants/bed-status.constants';
import { BedCurrentStatus } from '@prisma/client';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/**
 * Bed Status state machine (IPD runtime).
 *
 * Every bed gets a BedStatus row lazily on first read/change (default VACANT).
 * Transitions are validated against BED_STATUS_TRANSITIONS.
 */
@Injectable()
export class BedStatusService {
  private readonly logger = new Logger(BedStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Ensure a BedStatus row exists for the bed (default VACANT). */
  private async ensureStatus(tenantId: string, bedId: string) {
    const existing = await this.prisma.bedStatus.findFirst({
      where: { tenantId, bedId },
    });
    if (existing) return existing;
    return this.prisma.bedStatus.create({
      data: { tenantId, bedId, currentStatus: 'VACANT' },
    });
  }

  private async getBedOrThrow(tenantId: string, bedId: string) {
    const bed = await this.prisma.bed.findFirst({
      where: { id: bedId, tenantId, deletedAt: null },
      select: { id: true, bedNo: true, roomId: true },
    });
    if (!bed) throw new NotFoundException('Bed not found.');
    return bed;
  }

  /** Change a bed's status with state-machine validation. */
  async changeStatus(
    tenantId: string,
    bedId: string,
    dto: ChangeBedStatusDto,
    actor?: AuditActor,
  ) {
    const bed = await this.getBedOrThrow(tenantId, bedId);
    const current = await this.ensureStatus(tenantId, bedId);

    const from = current.currentStatus;
    const to = dto.status;

    if (from === to) {
      throw new ConflictException({
        ...BED_STATUS_ERRORS.INVALID_TRANSITION,
        message: `Bed is already ${to}.`,
      });
    }

    const allowed = BED_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        ...BED_STATUS_ERRORS.INVALID_TRANSITION,
        message: `Cannot change bed from ${from} to ${to}.`,
        details: { from, to, allowed },
      });
    }

    if (to === 'OCCUPIED' && !dto.patientId) {
      throw new BadRequestException(BED_STATUS_ERRORS.PATIENT_REQUIRED);
    }

    // Occupancy requires a valid patient in this tenant.
    if (to === 'OCCUPIED' && dto.patientId) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!patient) throw new BadRequestException('Invalid patientId.');
    }

    const updated = await this.prisma.bedStatus.update({
      where: { id: current.id },
      data: {
        currentStatus: to,
        patientId: to === 'OCCUPIED' ? dto.patientId : null,
        admissionId: to === 'OCCUPIED' ? (dto.admissionId ?? null) : null,
        statusChangedAt: new Date(),
        statusChangedBy: actor?.actorId,
      },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BED_STATUS_CHANGED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'BedStatus',
        targetId: bed.id,
        targetName: bed.bedNo,
        detail: `Bed '${bed.bedNo}' status ${from} → ${to}`,
        metadata: { from, to, patientId: dto.patientId, admissionId: dto.admissionId, remarks: dto.remarks },
      });
    }

    return updated;
  }

  /** Read a bed's current status (creates VACANT row if absent). */
  async getStatus(tenantId: string, bedId: string) {
    await this.getBedOrThrow(tenantId, bedId);
    return this.ensureStatus(tenantId, bedId);
  }

  /** List bed statuses (for the BOR board). */
  async list(tenantId: string, query: QueryBedStatusDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: any = {
      tenantId,
      ...(query.currentStatus && { currentStatus: query.currentStatus }),
      ...(query.roomTypeId && { bed: { room: { roomTypeId: query.roomTypeId } } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.bedStatus.findMany({
        where,
        orderBy: { statusChangedAt: 'desc' },
        include: {
          bed: {
            select: {
              id: true,
              bedNo: true,
              isCount: true,
              room: {
                select: {
                  id: true,
                  roomName: true,
                  roomNo: true,
                  floorName: true,
                  roomType: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bedStatus.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /** Occupancy summary for a tenant (or room type). */
  async summary(tenantId: string, roomTypeId?: string) {
    const where: any = {
      tenantId,
      ...(roomTypeId && { bed: { room: { roomTypeId } } }),
    };
    const grouped = await this.prisma.bedStatus.groupBy({
      by: ['currentStatus'],
      where,
      _count: { _all: true },
    });

    const counts: Record<string, number> = {
      VACANT: 0,
      OCCUPIED: 0,
      CLEANING: 0,
      RESERVED: 0,
      MAINTENANCE: 0,
    };
    for (const g of grouped) {
      counts[g.currentStatus] = g._count._all;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      total,
      ...counts,
      occupancyRate: total > 0 ? Math.round((counts.OCCUPIED / total) * 1000) / 10 : 0,
    };
  }
}
