import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { TemplateType } from '@prisma/client';
import { CreateTemplateDto } from '../dto/template/create-template.dto';
import { UpdateTemplateDto } from '../dto/template/update-template.dto';

const RELATION_SELECT = {
  labDepartment: { select: { id: true, name: true, code: true } },
  investigation: { select: { id: true, name: true, code: true } },
} as const;

@Injectable()
export class TemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Create; if isDefault, unset other defaults in the same scope (one tx). */
  async create(tenantId: string, dto: CreateTemplateDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.reportTemplate.updateMany({
          where: {
            tenantId,
            labDepartmentId: dto.labDepartmentId ?? null,
            investigationId: dto.investigationId ?? null,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      return tx.reportTemplate.create({
        data: {
          ...dto,
          labDepartmentId: dto.labDepartmentId ?? null,
          investigationId: dto.investigationId ?? null,
          tenantId,
        },
        include: RELATION_SELECT,
      });
    });
  }

  findAll(
    tenantId: string,
    filters: {
      labDepartmentId?: string;
      investigationId?: string;
      templateType?: TemplateType;
      isActive?: boolean;
    },
  ) {
    return this.prisma.reportTemplate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.labDepartmentId
          ? { labDepartmentId: filters.labDepartmentId }
          : {}),
        ...(filters.investigationId
          ? { investigationId: filters.investigationId }
          : {}),
        ...(filters.templateType ? { templateType: filters.templateType } : {}),
      },
      include: RELATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.reportTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: RELATION_SELECT,
    });
  }

  /** Resolution chain: investigation-specific → dept default → global default. */
  async resolve(
    tenantId: string,
    investigationId: string,
    labDepartmentId: string,
  ) {
    const investigationScoped = await this.prisma.reportTemplate.findFirst({
      where: {
        tenantId,
        investigationId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    if (investigationScoped) {
      return {
        template: investigationScoped,
        resolvedFrom: 'INVESTIGATION' as const,
      };
    }

    const departmentScoped = await this.prisma.reportTemplate.findFirst({
      where: {
        tenantId,
        labDepartmentId,
        investigationId: null,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    if (departmentScoped) {
      return {
        template: departmentScoped,
        resolvedFrom: 'DEPARTMENT' as const,
      };
    }

    const globalScoped = await this.prisma.reportTemplate.findFirst({
      where: {
        tenantId,
        labDepartmentId: null,
        investigationId: null,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    if (globalScoped) {
      return { template: globalScoped, resolvedFrom: 'GLOBAL' as const };
    }

    return { template: null, resolvedFrom: null };
  }

  /** Mark as default for its scope (unsets the previous one). */
  async setDefault(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.reportTemplate.findFirst({
        where: { id, tenantId, deletedAt: null },
      });
      if (!template) return null;

      await tx.reportTemplate.updateMany({
        where: {
          tenantId,
          labDepartmentId: template.labDepartmentId,
          investigationId: template.investigationId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });

      return tx.reportTemplate.update({
        where: { id },
        data: { isDefault: true },
        include: RELATION_SELECT,
      });
    });
  }

  update(tenantId: string, id: string, dto: UpdateTemplateDto) {
    return this.prisma.reportTemplate.update({
      where: { id, tenantId },
      data: dto,
      include: RELATION_SELECT,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.reportTemplate.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Validation helpers ─────────────────────────────────────────────────────

  findLabDepartment(tenantId: string, id: string) {
    return this.prisma.labDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
  }

  findInvestigation(tenantId: string, id: string) {
    return this.prisma.investigation.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, labDepartmentId: true },
    });
  }
}
