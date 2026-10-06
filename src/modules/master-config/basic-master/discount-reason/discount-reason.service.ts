import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateDiscountReasonDto } from './dto/create-discount-reason.dto';
import { UpdateDiscountReasonDto } from './dto/update-discount-reason.dto';
import { QueryDiscountReasonDto } from './dto/query-discount-reason.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Discount Reason Master. Tenant-scoped. */
@Injectable()
export class DiscountReasonService {
  private readonly logger = new Logger(DiscountReasonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateDiscountReasonDto, actor?: AuditActor) {
    const existing = await this.prisma.discountReason.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Discount reason code '${dto.code}' already exists.`);
    }

    try {
      const created = await this.prisma.discountReason.create({
        data: {
          tenantId,
          code: dto.code,
          reason: dto.reason,
          applicableType: dto.applicableType ?? 'BOTH',
          defaultDiscountPct: dto.defaultDiscountPct,
          approvalThresholdPct: dto.approvalThresholdPct,
          requiresApproval: dto.requiresApproval ?? false,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_DISCOUNT_REASON_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'DiscountReason',
          targetId: created.id,
          targetName: created.reason,
          detail: `Discount reason '${created.reason}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Discount reason code '${dto.code}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryDiscountReasonDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DiscountReasonWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.applicableType && {
        applicableType: { in: [query.applicableType, 'BOTH'] },
      }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { reason: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.discountReason.findMany({
        where,
        orderBy: { reason: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.discountReason.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, applicableType?: string) {
    return this.prisma.discountReason.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(applicableType && { applicableType: { in: [applicableType as any, 'BOTH'] } }),
      },
      orderBy: { reason: 'asc' },
      select: {
        id: true,
        code: true,
        reason: true,
        applicableType: true,
        defaultDiscountPct: true,
        approvalThresholdPct: true,
        requiresApproval: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const reason = await this.prisma.discountReason.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!reason) throw new NotFoundException('Discount reason not found.');
    return reason;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDiscountReasonDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.discountReason.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Discount reason not found.');

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.discountReason.findFirst({
        where: { tenantId, code: dto.code, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Discount reason code '${dto.code}' already exists.`);
    }

    const updated = await this.prisma.discountReason.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_DISCOUNT_REASON_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'DiscountReason',
        targetId: updated.id,
        targetName: updated.reason,
        detail: `Discount reason '${updated.reason}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.discountReason.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Discount reason not found.');

    await this.prisma.discountReason.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_DISCOUNT_REASON_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'DiscountReason',
        targetId: existing.id,
        targetName: existing.reason,
        detail: `Discount reason '${existing.reason}' deleted`,
      });
    }

    return { message: `Discount reason '${existing.reason}' deleted successfully.` };
  }
}
