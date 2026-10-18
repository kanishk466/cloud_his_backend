import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TemplateType } from '@prisma/client';
import { TemplatesRepository } from '../repositories/templates.repository';
import { CreateTemplateDto } from '../dto/template/create-template.dto';
import { UpdateTemplateDto } from '../dto/template/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly repo: TemplatesRepository) {}

  async create(tenantId: string, dto: CreateTemplateDto) {
    await this.validateScope(
      tenantId,
      dto.labDepartmentId,
      dto.investigationId,
    );
    return this.repo.create(tenantId, dto);
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
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.repo.findById(tenantId, id);
    if (!template) throw new NotFoundException('Report template not found');
    return template;
  }

  /**
   * Template resolution for report rendering (Session 4 print):
   * investigation-specific → department default → global default.
   */
  async resolve(tenantId: string, investigationId: string) {
    const investigation = await this.repo.findInvestigation(
      tenantId,
      investigationId,
    );
    if (!investigation) {
      throw new NotFoundException('Investigation not found in this hospital');
    }

    const resolved = await this.repo.resolve(
      tenantId,
      investigationId,
      investigation.labDepartmentId,
    );

    if (!resolved.template) {
      throw new NotFoundException(
        'No report template configured (investigation, department or global)',
      );
    }

    return resolved;
  }

  async setDefault(tenantId: string, id: string) {
    const template = await this.repo.setDefault(tenantId, id);
    if (!template) throw new NotFoundException('Report template not found');
    return template;
  }

  async update(tenantId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOne(tenantId, id);
    if (dto.labDepartmentId || dto.investigationId) {
      await this.validateScope(
        tenantId,
        dto.labDepartmentId,
        dto.investigationId,
      );
    }
    return this.repo.update(tenantId, id, dto);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Report template deleted successfully' };
  }

  private async validateScope(
    tenantId: string,
    labDepartmentId?: string,
    investigationId?: string,
  ) {
    if (labDepartmentId) {
      const dept = await this.repo.findLabDepartment(tenantId, labDepartmentId);
      if (!dept)
        throw new NotFoundException(
          'Lab department not found in this hospital',
        );
    }

    if (investigationId) {
      const investigation = await this.repo.findInvestigation(
        tenantId,
        investigationId,
      );
      if (!investigation) {
        throw new NotFoundException('Investigation not found in this hospital');
      }

      // Consistency: investigation must belong to the given department (if any)
      if (
        labDepartmentId &&
        investigation.labDepartmentId !== labDepartmentId
      ) {
        throw new BadRequestException(
          'Investigation does not belong to the given lab department',
        );
      }
    }
  }
}
