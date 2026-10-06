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
import { CreateDiscountApprovalDto } from './dto/create-discount-approval.dto';
import { UpdateDiscountApprovalDto } from './dto/update-discount-approval.dto';
import { QueryDiscountApprovalDto } from './dto/query-discount-approval.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Discount Approval Authority Master. Tenant-scoped. */
@Injectable()
export class DiscountApprovalService {
  private readonly logger = new Logger(DiscountApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertAuthorityUserVisible(tenantId: string, hospitalUserId?: string) {
    if (!hospitalUserId) return;
    const user = await this.prisma.hospitalUser.findFirst({
      where: { id: hospitalUserId, tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(
        'Invalid hospitalUserId: user not found in this hospital.',
      );
    }
  }

  async create(tenantId: string, dto: CreateDiscountApprovalDto, actor?: AuditActor) {
    await this.assertAuthorityUserVisible(tenantId, dto.hospitalUserId);

    const existing = await this.prisma.discountApproval.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Discount approval code '${dto.code}' already exists.`);
    }

    try {
      const created = await this.prisma.discountApproval.create({
        data: {
          tenantId,
          code: dto.code,
          authorityName: dto.authorityName,
          hospitalUserId: dto.hospitalUserId,
          applicableType: dto.applicableType ?? 'BOTH',
          maxDiscountPct: dto.maxDiscountPct ?? 0,
          maxDiscountAmount: dto.maxDiscountAmount,
          isUnlimited: dto.isUnlimited ?? false,
          requiresReason: dto.requiresReason ?? true,
          priority: dto.priority ?? 0,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_DISCOUNT_APPROVAL_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'DiscountApproval',
          targetId: created.id,
          targetName: created.authorityName,
          detail: `Discount approval '${created.authorityName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Discount approval code '${dto.code}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryDiscountApprovalDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DiscountApprovalWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.applicableType && {
        applicableType: { in: [query.applicableType, 'BOTH'] },
      }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { authorityName: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.discountApproval.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { maxDiscountPct: 'asc' }],
        include: {
          authorityUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.discountApproval.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, applicableType?: string) {
    return this.prisma.discountApproval.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(applicableType && { applicableType: { in: [applicableType as any, 'BOTH'] } }),
      },
      orderBy: [{ priority: 'asc' }, { maxDiscountPct: 'asc' }],
      select: {
        id: true,
        code: true,
        authorityName: true,
        applicableType: true,
        maxDiscountPct: true,
        maxDiscountAmount: true,
        isUnlimited: true,
        hospitalUserId: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const approval = await this.prisma.discountApproval.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        authorityUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!approval) throw new NotFoundException('Discount approval not found.');
    return approval;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDiscountApprovalDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.discountApproval.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Discount approval not found.');

    if (dto.hospitalUserId) {
      await this.assertAuthorityUserVisible(tenantId, dto.hospitalUserId);
    }

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.discountApproval.findFirst({
        where: { tenantId, code: dto.code, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Discount approval code '${dto.code}' already exists.`);
    }

    const updated = await this.prisma.discountApproval.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_DISCOUNT_APPROVAL_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'DiscountApproval',
        targetId: updated.id,
        targetName: updated.authorityName,
        detail: `Discount approval '${updated.authorityName}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.discountApproval.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Discount approval not found.');

    await this.prisma.discountApproval.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_DISCOUNT_APPROVAL_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'DiscountApproval',
        targetId: existing.id,
        targetName: existing.authorityName,
        detail: `Discount approval '${existing.authorityName}' deleted`,
      });
    }

    return { message: `Discount approval '${existing.authorityName}' deleted successfully.` };
  }
}
