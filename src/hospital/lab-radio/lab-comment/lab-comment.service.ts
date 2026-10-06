import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateLabCommentDto } from './dto/create-lab-comment.dto';
import { UpdateLabCommentDto } from './dto/update-lab-comment.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Lab Comment Master (standard remarks). Tenant-scoped. */
@Injectable()
export class LabCommentService {
  private readonly logger = new Logger(LabCommentService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async assertInvestigation(tenantId: string, investigationId?: string) {
    if (!investigationId) return;
    const inv = await this.prisma.investigation.findFirst({
      where: { id: investigationId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!inv) throw new BadRequestException('Invalid investigationId.');
  }

  async list(tenantId: string, investigationId?: string) {
    return this.prisma.labComment.findMany({
      where: {
        tenantId, deletedAt: null,
        ...(investigationId && { investigationId }),
      },
      orderBy: { createdAt: 'desc' },
      include: { investigation: { select: { id: true, name: true } } },
    });
  }

  async create(tenantId: string, dto: CreateLabCommentDto, actor?: AuditActor) {
    await this.assertInvestigation(tenantId, dto.investigationId);
    const created = await this.prisma.labComment.create({
      data: {
        tenantId, investigationId: dto.investigationId, commentText: dto.commentText,
        isActive: dto.isActive ?? true, createdBy: actor?.actorId, updatedBy: actor?.actorId,
      },
    });
    if (actor) {
      await this.auditService.log({
        action: 'LAB_COMMENT_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'LabComment', targetId: created.id, targetName: 'LabComment',
        detail: `Lab comment created`,
      });
    }
    return created;
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.labComment.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!item) throw new NotFoundException('Lab comment not found.');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateLabCommentDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    void existing;
    if (dto.investigationId) await this.assertInvestigation(tenantId, dto.investigationId);
    const updated = await this.prisma.labComment.update({
      where: { id }, data: { ...dto, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'LAB_COMMENT_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'LabComment', targetId: updated.id, targetName: 'LabComment',
        detail: `Lab comment updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    await this.prisma.labComment.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'LAB_COMMENT_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'LabComment', targetId: existing.id, targetName: 'LabComment',
        detail: `Lab comment deleted`,
      });
    }
    return { message: 'Lab comment deleted.' };
  }
}
