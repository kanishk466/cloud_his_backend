import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateThresholdLimitDto } from './dto/create-threshold-limit.dto';
import { UpdateThresholdLimitDto } from './dto/update-threshold-limit.dto';
import { QueryThresholdLimitDto } from './dto/query-threshold-limit.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Threshold Limit Master (IPD billing alert). Tenant-scoped. */
@Injectable()
export class ThresholdLimitService {
  private readonly logger = new Logger(ThresholdLimitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertRefs(tenantId: string, panelId: string, roomTypeId: string) {
    const panel = await this.prisma.panel.findFirst({
      where: { id: panelId, tenantId },
      select: { id: true },
    });
    if (!panel) throw new BadRequestException('Invalid panelId.');

    const roomType = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!roomType) throw new BadRequestException('Invalid roomTypeId.');
  }

  async create(tenantId: string, dto: CreateThresholdLimitDto, actor?: AuditActor) {
    await this.assertRefs(tenantId, dto.panelId, dto.roomTypeId);

    const existing = await this.prisma.thresholdLimit.findFirst({
      where: { tenantId, panelId: dto.panelId, roomTypeId: dto.roomTypeId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('A threshold limit for this panel + room type already exists.');
    }

    try {
      const created = await this.prisma.thresholdLimit.create({
        data: {
          tenantId,
          panelId: dto.panelId,
          roomTypeId: dto.roomTypeId,
          thresholdAmount: dto.thresholdAmount,
          actionType: dto.actionType ?? 'SOFT_WARNING',
          alertEmails: dto.alertEmails ?? [],
          alertSmsNumbers: dto.alertSmsNumbers ?? [],
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'THRESHOLD_LIMIT_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'ThresholdLimit',
          targetId: created.id,
          targetName: `${dto.panelId}/${dto.roomTypeId}`,
          detail: `Threshold limit ${dto.thresholdAmount} (${created.actionType}) created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A threshold limit for this panel + room type already exists.');
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryThresholdLimitDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ThresholdLimitWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.panelId && { panelId: query.panelId }),
      ...(query.roomTypeId && { roomTypeId: query.roomTypeId }),
      ...(query.actionType && { actionType: query.actionType }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.thresholdLimit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          panel: { select: { id: true, panelCode: true, panelName: true } },
          roomType: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.thresholdLimit.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.thresholdLimit.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        panel: { select: { id: true, panelCode: true, panelName: true } },
        roomType: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('Threshold limit not found.');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateThresholdLimitDto, actor?: AuditActor) {
    const existing = await this.prisma.thresholdLimit.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Threshold limit not found.');

    if (dto.panelId || dto.roomTypeId) {
      await this.assertRefs(
        tenantId,
        dto.panelId ?? existing.panelId,
        dto.roomTypeId ?? existing.roomTypeId,
      );
    }

    const targetPanel = dto.panelId ?? existing.panelId;
    const targetRoom = dto.roomTypeId ?? existing.roomTypeId;
    if (targetPanel !== existing.panelId || targetRoom !== existing.roomTypeId) {
      const dup = await this.prisma.thresholdLimit.findFirst({
        where: { tenantId, panelId: targetPanel, roomTypeId: targetRoom, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException('A threshold limit for this panel + room type already exists.');
    }

    const updated = await this.prisma.thresholdLimit.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'THRESHOLD_LIMIT_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ThresholdLimit',
        targetId: updated.id,
        targetName: `${updated.panelId}/${updated.roomTypeId}`,
        detail: `Threshold limit updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.thresholdLimit.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Threshold limit not found.');

    await this.prisma.thresholdLimit.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'THRESHOLD_LIMIT_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ThresholdLimit',
        targetId: existing.id,
        targetName: `${existing.panelId}/${existing.roomTypeId}`,
        detail: `Threshold limit deleted`,
      });
    }

    return { message: 'Threshold limit deleted.' };
  }
}
