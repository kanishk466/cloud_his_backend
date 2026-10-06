import {
  Injectable, ConflictException, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateLabApprovalRightDto } from './dto/create-approval-right.dto';
import { UpdateLabApprovalRightDto } from './dto/update-approval-right.dto';
import { QueryLabApprovalRightDto } from './dto/query-approval-right.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Lab Approval Rights (who can sign lab/radio reports). Tenant-scoped. */
@Injectable()
export class LabApprovalRightService {
  private readonly logger = new Logger(LabApprovalRightService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async assertRefs(tenantId: string, userId: string, departmentId?: string) {
    const user = await this.prisma.hospitalUser.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Invalid userId.');
    if (departmentId) {
      const dept = await this.prisma.labDepartment.findFirst({
        where: { id: departmentId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!dept) throw new BadRequestException('Invalid departmentId.');
    }
  }

  async create(tenantId: string, dto: CreateLabApprovalRightDto, actor?: AuditActor) {
    await this.assertRefs(tenantId, dto.userId, dto.departmentId);
    const existing = await this.prisma.labApprovalRight.findFirst({
      where: { tenantId, userId: dto.userId, departmentId: dto.departmentId ?? null, deletedAt: null },
    });
    if (existing) throw new ConflictException('An approval right for this user/department already exists.');

    try {
      const created = await this.prisma.labApprovalRight.create({
        data: {
          tenantId, userId: dto.userId, departmentId: dto.departmentId,
          canSignLabReports: dto.canSignLabReports ?? false,
          canSignRadioReports: dto.canSignRadioReports ?? false,
          isActive: dto.isActive ?? true, createdBy: actor?.actorId, updatedBy: actor?.actorId,
        },
      });
      if (actor) {
        await this.auditService.log({
          action: 'LAB_APPROVAL_RIGHT_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
          tenantId, targetType: 'LabApprovalRight', targetId: created.id, targetName: 'LabApprovalRight',
          detail: `Approval right granted (lab=${created.canSignLabReports}, radio=${created.canSignRadioReports})`,
        });
      }
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An approval right for this user/department already exists.');
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryLabApprovalRightDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.LabApprovalRightWhereInput = {
      tenantId, deletedAt: null,
      ...(query.userId && { userId: query.userId }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };
    const [data, total] = await Promise.all([
      this.prisma.labApprovalRight.findMany({
        where, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          department: { select: { id: true, name: true, category: true } },
        },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.labApprovalRight.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.labApprovalRight.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('Approval right not found.');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateLabApprovalRightDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    await this.assertRefs(tenantId, dto.userId ?? existing.userId, dto.departmentId);
    const updated = await this.prisma.labApprovalRight.update({
      where: { id }, data: { ...dto, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'LAB_APPROVAL_RIGHT_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'LabApprovalRight', targetId: updated.id, targetName: 'LabApprovalRight',
        detail: `Approval right updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    await this.prisma.labApprovalRight.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'LAB_APPROVAL_RIGHT_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'LabApprovalRight', targetId: existing.id, targetName: 'LabApprovalRight',
        detail: `Approval right revoked`,
      });
    }
    return { message: 'Approval right deleted.' };
  }
}
