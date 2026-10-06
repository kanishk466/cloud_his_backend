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
import { CreateDoctorSpecializationDto } from './dto/create-doctor-specialization.dto';
import { UpdateDoctorSpecializationDto } from './dto/update-doctor-specialization.dto';
import { QueryDoctorSpecializationDto } from './dto/query-doctor-specialization.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Doctor Specialization Master. Tenant-scoped, under a ClinicalDepartment. */
@Injectable()
export class DoctorSpecializationService {
  private readonly logger = new Logger(DoctorSpecializationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertDepartmentVisible(tenantId: string, clinicalDepartmentId: string) {
    const dept = await this.prisma.clinicalDepartment.findFirst({
      where: { id: clinicalDepartmentId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!dept) {
      throw new BadRequestException('Invalid clinicalDepartmentId: department not found.');
    }
  }

  async create(tenantId: string, dto: CreateDoctorSpecializationDto, actor?: AuditActor) {
    await this.assertDepartmentVisible(tenantId, dto.clinicalDepartmentId);

    const existing = await this.prisma.doctorSpecialization.findFirst({
      where: {
        clinicalDepartmentId: dto.clinicalDepartmentId,
        name: { equals: dto.name, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`Specialization '${dto.name}' already exists in this department.`);
    }

    try {
      const created = await this.prisma.doctorSpecialization.create({
        data: {
          tenantId,
          clinicalDepartmentId: dto.clinicalDepartmentId,
          name: dto.name,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'DOCTOR_SPECIALIZATION_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'DoctorSpecialization',
          targetId: created.id,
          targetName: created.name,
          detail: `Specialization '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Specialization '${dto.name}' already exists in this department.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryDoctorSpecializationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DoctorSpecializationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.clinicalDepartmentId && { clinicalDepartmentId: query.clinicalDepartmentId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.doctorSpecialization.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { clinicalDepartment: { select: { id: true, name: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.doctorSpecialization.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, clinicalDepartmentId?: string) {
    return this.prisma.doctorSpecialization.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(clinicalDepartmentId && { clinicalDepartmentId }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, clinicalDepartmentId: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const spec = await this.prisma.doctorSpecialization.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!spec) throw new NotFoundException('Specialization not found.');
    return spec;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDoctorSpecializationDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.doctorSpecialization.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Specialization not found.');

    if (dto.clinicalDepartmentId) {
      await this.assertDepartmentVisible(tenantId, dto.clinicalDepartmentId);
    }

    const targetDept = dto.clinicalDepartmentId ?? existing.clinicalDepartmentId;
    const targetName = dto.name ?? existing.name;
    if (
      targetDept !== existing.clinicalDepartmentId ||
      targetName.toLowerCase() !== existing.name.toLowerCase()
    ) {
      const dup = await this.prisma.doctorSpecialization.findFirst({
        where: {
          clinicalDepartmentId: targetDept,
          name: { equals: targetName, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) {
        throw new ConflictException(`Specialization '${targetName}' already exists in this department.`);
      }
    }

    const updated = await this.prisma.doctorSpecialization.update({
      where: { id },
      data: { ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'DOCTOR_SPECIALIZATION_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'DoctorSpecialization',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Specialization '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.doctorSpecialization.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Specialization not found.');

    const docCount = await this.prisma.doctorProfile.count({
      where: { specializationId: id },
    });
    if (docCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${docCount} doctor(s) use this specialization.`,
      );
    }

    await this.prisma.doctorSpecialization.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'DOCTOR_SPECIALIZATION_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'DoctorSpecialization',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Specialization '${existing.name}' deleted`,
      });
    }

    return { message: `Specialization '${existing.name}' deleted.` };
  }
}
