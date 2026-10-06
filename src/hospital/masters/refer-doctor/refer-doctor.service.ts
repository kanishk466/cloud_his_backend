import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateReferDoctorDto } from './dto/create-refer-doctor.dto';
import { UpdateReferDoctorDto } from './dto/update-refer-doctor.dto';
import { QueryReferDoctorDto } from './dto/query-refer-doctor.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Refer Doctor Master (external referring doctors). Tenant-scoped. */
@Injectable()
export class ReferDoctorService {
  private readonly logger = new Logger(ReferDoctorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateReferDoctorDto, actor?: AuditActor) {
    const existing = await this.prisma.referDoctor.findFirst({
      where: {
        tenantId,
        name: { equals: dto.name, mode: 'insensitive' },
        mobile: dto.mobile ?? null,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Refer doctor '${dto.name}'${dto.mobile ? ` (${dto.mobile})` : ''} already exists.`,
      );
    }

    try {
      const created = await this.prisma.referDoctor.create({
        data: {
          tenantId,
          title: dto.title,
          name: dto.name,
          mobile: dto.mobile,
          address: dto.address,
          specialty: dto.specialty,
          hospitalName: dto.hospitalName,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'REFER_DOCTOR_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'ReferDoctor',
          targetId: created.id,
          targetName: created.name,
          detail: `Refer doctor '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Refer doctor '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryReferDoctorDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ReferDoctorWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { mobile: { contains: query.search, mode: 'insensitive' } },
          { specialty: { contains: query.search, mode: 'insensitive' } },
          { hospitalName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.referDoctor.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { proMappings: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.referDoctor.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.referDoctor.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, title: true, name: true, mobile: true, specialty: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const doctor = await this.prisma.referDoctor.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doctor) throw new NotFoundException('Refer doctor not found.');
    return doctor;
  }

  async update(tenantId: string, id: string, dto: UpdateReferDoctorDto, actor?: AuditActor) {
    const existing = await this.prisma.referDoctor.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Refer doctor not found.');

    const targetName = dto.name ?? existing.name;
    const targetMobile = dto.mobile !== undefined ? dto.mobile : existing.mobile;
    if (
      targetName.toLowerCase() !== existing.name.toLowerCase() ||
      targetMobile !== existing.mobile
    ) {
      const dup = await this.prisma.referDoctor.findFirst({
        where: {
          tenantId,
          name: { equals: targetName, mode: 'insensitive' },
          mobile: targetMobile ?? null,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Refer doctor '${targetName}' already exists.`);
    }

    const updated = await this.prisma.referDoctor.update({
      where: { id },
      data: { ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'REFER_DOCTOR_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ReferDoctor',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Refer doctor '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.referDoctor.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Refer doctor not found.');

    const mappingCount = await this.prisma.proMapping.count({
      where: { referDoctorId: id, deletedAt: null },
    });
    if (mappingCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${mappingCount} PRO mapping(s) reference this refer doctor.`,
      );
    }

    await this.prisma.referDoctor.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'REFER_DOCTOR_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'ReferDoctor',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Refer doctor '${existing.name}' deleted`,
      });
    }

    return { message: `Refer doctor '${existing.name}' deleted.` };
  }
}
