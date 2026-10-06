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
import { CreateInvestigationDto } from './dto/create-investigation.dto';
import { UpdateInvestigationDto } from './dto/update-investigation.dto';
import { QueryInvestigationDto } from './dto/query-investigation.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Investigation Master (test SKU). Tenant-scoped; links to ServiceMaster. */
@Injectable()
export class InvestigationService {
  private readonly logger = new Logger(InvestigationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** All refs must belong to the tenant. */
  private async validateRefs(
    tenantId: string,
    refs: { departmentId: string; serviceId: string; sampleTypeId?: string; outsourceLabId?: string },
  ) {
    const dept = await this.prisma.labDepartment.findFirst({
      where: { id: refs.departmentId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!dept) throw new BadRequestException('Invalid departmentId.');

    // Business rule: investigation.serviceId MUST exist in ServiceMaster.
    const svc = await this.prisma.serviceMaster.findFirst({
      where: { id: refs.serviceId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!svc) throw new BadRequestException('Invalid serviceId: service not found.');

    if (refs.sampleTypeId) {
      const st = await this.prisma.sampleType.findFirst({
        where: { id: refs.sampleTypeId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!st) throw new BadRequestException('Invalid sampleTypeId.');
    }
    if (refs.outsourceLabId) {
      const ol = await this.prisma.outsourceLab.findFirst({
        where: { id: refs.outsourceLabId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!ol) throw new BadRequestException('Invalid outsourceLabId.');
    }
  }

  async create(tenantId: string, dto: CreateInvestigationDto, actor?: AuditActor) {
    await this.validateRefs(tenantId, dto);

    const existing = await this.prisma.investigation.findFirst({
      where: { tenantId, deletedAt: null, OR: [{ serviceId: dto.serviceId }, { code: dto.code }] },
    });
    if (existing) {
      throw new ConflictException('An investigation with this service or code already exists.');
    }

    try {
      const created = await this.prisma.investigation.create({
        data: {
          tenantId,
          departmentId: dto.departmentId,
          serviceId: dto.serviceId,
          name: dto.name,
          code: dto.code,
          printOrder: dto.printOrder ?? 0,
          printSeparate: dto.printSeparate ?? false,
          turnaroundTimeMins: dto.turnaroundTimeMins,
          sampleTypeId: dto.sampleTypeId,
          isOutsourced: dto.isOutsourced ?? false,
          outsourceLabId: dto.outsourceLabId,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'INVESTIGATION_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'Investigation',
          targetId: created.id,
          targetName: created.name,
          detail: `Investigation '${created.name}' (${created.code}) created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An investigation with this service or code already exists.');
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryInvestigationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.InvestigationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.sampleTypeId && { sampleTypeId: query.sampleTypeId }),
      ...(query.isOutsourced !== undefined && { isOutsourced: query.isOutsourced }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.investigation.findMany({
        where,
        orderBy: [{ printOrder: 'asc' }, { name: 'asc' }],
        include: {
          department: { select: { id: true, name: true, category: true } },
          service: { select: { id: true, serviceCode: true, serviceName: true, baseRate: true } },
          sampleType: { select: { id: true, name: true } },
          _count: { select: { observations: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.investigation.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, departmentId?: string) {
    return this.prisma.investigation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(departmentId && { departmentId }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, departmentId: true, turnaroundTimeMins: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const inv = await this.prisma.investigation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        department: true,
        service: { select: { id: true, serviceCode: true, serviceName: true, baseRate: true } },
        sampleType: true,
        outsourceLab: true,
        observations: {
          orderBy: { displayOrder: 'asc' },
          include: { observation: { include: { referenceRanges: true } } },
        },
        templates: { where: { deletedAt: null } },
      },
    });
    if (!inv) throw new NotFoundException('Investigation not found.');
    return inv;
  }

  async update(tenantId: string, id: string, dto: UpdateInvestigationDto, actor?: AuditActor) {
    const existing = await this.prisma.investigation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Investigation not found.');

    await this.validateRefs(tenantId, {
      departmentId: dto.departmentId ?? existing.departmentId,
      serviceId: dto.serviceId ?? existing.serviceId,
      sampleTypeId: dto.sampleTypeId,
      outsourceLabId: dto.outsourceLabId,
    });

    if (dto.serviceId && dto.serviceId !== existing.serviceId) {
      const dup = await this.prisma.investigation.findFirst({
        where: { tenantId, serviceId: dto.serviceId, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException('Another investigation already uses this service.');
    }
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.investigation.findFirst({
        where: { tenantId, code: dto.code, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Investigation code '${dto.code}' already exists.`);
    }

    const updated = await this.prisma.investigation.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'INVESTIGATION_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Investigation',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Investigation '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.investigation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Investigation not found.');

    await this.prisma.investigation.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'INVESTIGATION_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Investigation',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Investigation '${existing.name}' deleted`,
      });
    }

    return { message: `Investigation '${existing.name}' deleted.` };
  }
}
