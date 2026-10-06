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
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Investigation Template Master (rich text). Tenant-scoped. */
@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  async list(tenantId: string, investigationId: string) {
    const inv = await this.prisma.investigation.findFirst({
      where: { id: investigationId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!inv) throw new NotFoundException('Investigation not found.');
    return this.prisma.investigationTemplate.findMany({
      where: { tenantId, investigationId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { title: 'asc' }],
    });
  }

  async create(tenantId: string, investigationId: string, dto: CreateTemplateDto, actor?: AuditActor) {
    const inv = await this.prisma.investigation.findFirst({
      where: { id: investigationId, tenantId, deletedAt: null },
      select: { id: true, name: true, department: { select: { allowTemplates: true } } },
    });
    if (!inv) throw new NotFoundException('Investigation not found.');

    // Business rule: if department disallows templates, block.
    if (!inv.department?.allowTemplates) {
      throw new BadRequestException(
        'Templates are not enabled for this investigation\'s department.',
      );
    }

    const dup = await this.prisma.investigationTemplate.findFirst({
      where: { tenantId, investigationId, title: { equals: dto.title, mode: 'insensitive' }, deletedAt: null },
    });
    if (dup) throw new ConflictException(`Template '${dto.title}' already exists.`);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.investigationTemplate.updateMany({
            where: { tenantId, investigationId, isDefault: true },
            data: { isDefault: false },
          });
        }
        return tx.investigationTemplate.create({
          data: {
            tenantId, investigationId, title: dto.title, bodyHtml: dto.bodyHtml,
            isDefault: dto.isDefault ?? false, isActive: dto.isActive ?? true,
            createdBy: actor?.actorId, updatedBy: actor?.actorId,
          },
        });
      });

      if (actor) {
        await this.auditService.log({
          action: 'INVESTIGATION_TEMPLATE_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
          tenantId, targetType: 'InvestigationTemplate', targetId: created.id, targetName: created.title,
          detail: `Template '${created.title}' created for '${inv.name}'`,
        });
      }
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Template '${dto.title}' already exists.`);
      }
      throw e;
    }
  }

  async update(tenantId: string, investigationId: string, id: string, dto: UpdateTemplateDto, actor?: AuditActor) {
    const existing = await this.prisma.investigationTemplate.findFirst({
      where: { id, tenantId, investigationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Template not found.');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.investigationTemplate.updateMany({
          where: { tenantId, investigationId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.investigationTemplate.update({
        where: { id }, data: { ...dto, updatedBy: actor?.actorId },
      });
    });

    if (actor) {
      await this.auditService.log({
        action: 'INVESTIGATION_TEMPLATE_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'InvestigationTemplate', targetId: updated.id, targetName: updated.title,
        detail: `Template '${updated.title}' updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, investigationId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.investigationTemplate.findFirst({
      where: { id, tenantId, investigationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Template not found.');

    await this.prisma.investigationTemplate.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'INVESTIGATION_TEMPLATE_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'InvestigationTemplate', targetId: existing.id, targetName: existing.title,
        detail: `Template '${existing.title}' deleted`,
      });
    }
    return { message: `Template '${existing.title}' deleted.` };
  }
}
