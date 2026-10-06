import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreatePatientDocumentDto } from './dto/create-patient-document.dto';
import { UpdatePatientDocumentDto } from './dto/update-patient-document.dto';
import { QueryPatientDocumentDto } from './dto/query-patient-document.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Patient Document Master. Tenant-scoped (table: patient_document_types). */
@Injectable()
export class PatientDocumentService {
  private readonly logger = new Logger(PatientDocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreatePatientDocumentDto, actor?: AuditActor) {
    const existing = await this.prisma.patientDocument.findFirst({
      where: {
        tenantId,
        documentName: { equals: dto.documentName, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`Document '${dto.documentName}' already exists.`);
    }

    try {
      const created = await this.prisma.patientDocument.create({
        data: {
          tenantId,
          documentName: dto.documentName,
          isMandatory: dto.isMandatory ?? false,
          applicableFor: dto.applicableFor ?? 'BOTH',
          allowedFileTypes: dto.allowedFileTypes ?? ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSizeMB: dto.maxFileSizeMB ?? 5,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_PATIENT_DOC_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'PatientDocument',
          targetId: created.id,
          targetName: created.documentName,
          detail: `Patient document '${created.documentName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Document '${dto.documentName}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryPatientDocumentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PatientDocumentWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.applicableFor && { applicableFor: query.applicableFor }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        documentName: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.patientDocument.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { documentName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.patientDocument.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, applicableFor?: string) {
    return this.prisma.patientDocument.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(applicableFor && { applicableFor: { in: [applicableFor as any, 'BOTH'] } }),
      },
      orderBy: [{ sortOrder: 'asc' }, { documentName: 'asc' }],
      select: {
        id: true,
        documentName: true,
        isMandatory: true,
        applicableFor: true,
        allowedFileTypes: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Patient document not found.');
    return doc;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePatientDocumentDto,
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.patientDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Patient document not found.');

    if (dto.documentName && dto.documentName.toLowerCase() !== existing.documentName.toLowerCase()) {
      const dup = await this.prisma.patientDocument.findFirst({
        where: {
          tenantId,
          documentName: { equals: dto.documentName, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Document '${dto.documentName}' already exists.`);
    }

    const updated = await this.prisma.patientDocument.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_PATIENT_DOC_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'PatientDocument',
        targetId: updated.id,
        targetName: updated.documentName,
        detail: `Patient document '${updated.documentName}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.patientDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Patient document not found.');

    await this.prisma.patientDocument.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_PATIENT_DOC_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'PatientDocument',
        targetId: existing.id,
        targetName: existing.documentName,
        detail: `Patient document '${existing.documentName}' deleted`,
      });
    }

    return { message: `Patient document '${existing.documentName}' deleted successfully.` };
  }
}
