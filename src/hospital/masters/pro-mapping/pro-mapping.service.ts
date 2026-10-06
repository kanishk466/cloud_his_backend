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
import { CreateProMappingDto } from './dto/create-pro-mapping.dto';
import { UpdateProMappingDto } from './dto/update-pro-mapping.dto';
import { QueryProMappingDto } from './dto/query-pro-mapping.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** PRO ↔ Refer Doctor mapping. Tenant-scoped. */
@Injectable()
export class ProMappingService {
  private readonly logger = new Logger(ProMappingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertRefs(
    tenantId: string,
    refs: { referDoctorId?: string; hospitalUserId?: string },
  ) {
    if (refs.referDoctorId) {
      const rd = await this.prisma.referDoctor.findFirst({
        where: { id: refs.referDoctorId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!rd) throw new BadRequestException('Invalid referDoctorId.');
    }
    if (refs.hospitalUserId) {
      const u = await this.prisma.hospitalUser.findFirst({
        where: { id: refs.hospitalUserId, tenantId },
        select: { id: true },
      });
      if (!u) throw new BadRequestException('Invalid hospitalUserId.');
    }
  }

  async create(tenantId: string, dto: CreateProMappingDto, actor?: AuditActor) {
    if (!dto.proName && !dto.hospitalUserId) {
      throw new BadRequestException('Either proName or hospitalUserId is required.');
    }
    await this.assertRefs(tenantId, dto);

    const existing = await this.prisma.proMapping.findFirst({
      where: {
        tenantId,
        referDoctorId: dto.referDoctorId,
        hospitalUserId: dto.hospitalUserId ?? null,
        proName: dto.hospitalUserId ? null : (dto.proName ?? null),
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('This PRO mapping already exists.');
    }

    try {
      const created = await this.prisma.proMapping.create({
        data: {
          tenantId,
          referDoctorId: dto.referDoctorId,
          proName: dto.hospitalUserId ? null : dto.proName,
          hospitalUserId: dto.hospitalUserId,
          commissionPercent: dto.commissionPercent ?? 0,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'PRO_MAPPING_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'ProMapping',
          targetId: created.id,
          targetName: created.proName ?? created.hospitalUserId ?? 'PRO',
          detail: `PRO mapping created for refer doctor ${created.referDoctorId}`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This PRO mapping already exists.');
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryProMappingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProMappingWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.referDoctorId && { referDoctorId: query.referDoctorId }),
      ...(query.hospitalUserId && { hospitalUserId: query.hospitalUserId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        proName: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.proMapping.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          referDoctor: { select: { id: true, name: true, specialty: true } },
          hospitalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.proMapping.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const mapping = await this.prisma.proMapping.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        referDoctor: { select: { id: true, name: true, specialty: true } },
        hospitalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!mapping) throw new NotFoundException('PRO mapping not found.');
    return mapping;
  }

  async update(tenantId: string, id: string, dto: UpdateProMappingDto, actor?: AuditActor) {
    const existing = await this.prisma.proMapping.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('PRO mapping not found.');

    await this.assertRefs(tenantId, dto);

    const updated = await this.prisma.proMapping.update({
      where: { id },
      data: {
        ...dto,
        // If switching to a linked user, clear the free-text name and vice versa.
        ...(dto.hospitalUserId ? { proName: null } : {}),
      },
    });

    if (actor) {
      await this.auditService.log({
        action: 'PRO_MAPPING_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ProMapping',
        targetId: updated.id,
        targetName: updated.proName ?? updated.hospitalUserId ?? 'PRO',
        detail: `PRO mapping '${updated.id}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.proMapping.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('PRO mapping not found.');

    await this.prisma.proMapping.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'PRO_MAPPING_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ProMapping',
        targetId: existing.id,
        targetName: existing.proName ?? existing.hospitalUserId ?? 'PRO',
        detail: `PRO mapping '${existing.id}' deleted`,
      });
    }

    return { message: 'PRO mapping deleted.' };
  }
}
