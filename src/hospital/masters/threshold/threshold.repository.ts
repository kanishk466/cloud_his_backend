import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

const RELATION_SELECT = {
  panel: { select: { id: true, panelCode: true, panelName: true } },
  roomType: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class ThresholdRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateThresholdDto) {
    return this.prisma.thresholdLimit.create({
      data: { ...dto, roomTypeId: dto.roomTypeId ?? null, tenantId },
      include: RELATION_SELECT,
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.thresholdLimit.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: RELATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** All thresholds for one panel (general + room-specific). */
  findByPanel(tenantId: string, panelId: string) {
    return this.prisma.thresholdLimit.findMany({
      where: { tenantId, panelId, deletedAt: null },
      include: RELATION_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Resolution for checks: room-specific override first, then the panel's
   * general (roomTypeId = NULL) limit. NOTE: the (panelId, roomTypeId)
   * unique index can't dedupe NULLs — find-then-write is the real guard.
   */
  findMatching(tenantId: string, panelId: string, roomTypeId?: string | null) {
    return this.prisma.thresholdLimit.findFirst({
      where: {
        tenantId,
        panelId,
        deletedAt: null,
        isActive: true,
        OR: [...(roomTypeId ? [{ roomTypeId }] : []), { roomTypeId: null }],
      },
      orderBy: { roomTypeId: 'desc' }, // room-specific (non-null) first
      include: RELATION_SELECT,
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.thresholdLimit.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: RELATION_SELECT,
    });
  }

  update(tenantId: string, id: string, dto: UpdateThresholdDto) {
    return this.prisma.thresholdLimit.update({
      where: { id, tenantId },
      data: dto,
      include: RELATION_SELECT,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.thresholdLimit.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Tenant validation helpers ──────────────────────────────────────────────

  findPanel(tenantId: string, panelId: string) {
    return this.prisma.panel.findFirst({
      where: { id: panelId, tenantId, deletedAt: null },
      select: { id: true, panelName: true },
    });
  }

  findRoomType(tenantId: string, roomTypeId: string) {
    return this.prisma.roomType.findFirst({
      where: { id: roomTypeId, tenantId, deletedAt: null },
      select: { id: true, name: true, defaultRate: true },
    });
  }
}
