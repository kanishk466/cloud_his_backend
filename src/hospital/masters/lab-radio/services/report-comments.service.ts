import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportCommentsRepository } from '../repositories/report-comments.repository';
import { CreateReportCommentDto } from '../dto/report-comment/create-report-comment.dto';
import { UpdateReportCommentDto } from '../dto/report-comment/update-report-comment.dto';

@Injectable()
export class ReportCommentsService {
  constructor(private readonly repo: ReportCommentsRepository) {}

  async create(tenantId: string, dto: CreateReportCommentDto) {
    await this.assertDepartment(tenantId, dto.labDepartmentId);
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(
    tenantId: string,
    filters: {
      labDepartmentId?: string;
      category?: string;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.repo.findAll(tenantId, filters);
  }

  /** Quick lookup by shortcut code (e.g., ?shortcut=HEM). */
  async getByShortcut(tenantId: string, shortcut: string) {
    const comment = await this.repo.findByShortcut(tenantId, shortcut);
    if (!comment) {
      throw new NotFoundException(
        `No active report comment for shortcut '${shortcut.toUpperCase()}'`,
      );
    }
    return comment;
  }

  async findOne(tenantId: string, id: string) {
    const comment = await this.repo.findById(tenantId, id);
    if (!comment) throw new NotFoundException('Report comment not found');
    return comment;
  }

  async update(tenantId: string, id: string, dto: UpdateReportCommentDto) {
    await this.findOne(tenantId, id);
    if (dto.labDepartmentId) {
      await this.assertDepartment(tenantId, dto.labDepartmentId);
    }
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Report comment deleted successfully' };
  }

  private async assertDepartment(tenantId: string, labDepartmentId?: string) {
    if (!labDepartmentId) return;
    const dept = await this.repo.findLabDepartment(tenantId, labDepartmentId);
    if (!dept) {
      throw new NotFoundException('Lab department not found in this hospital');
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Shortcut already exists');
    }
    throw e;
  }
}
