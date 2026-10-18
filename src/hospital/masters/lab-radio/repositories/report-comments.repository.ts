import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateReportCommentDto } from '../dto/report-comment/create-report-comment.dto';
import { UpdateReportCommentDto } from '../dto/report-comment/update-report-comment.dto';

const DEPT_SELECT = {
  select: { id: true, name: true, code: true },
} as const;

@Injectable()
export class ReportCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateReportCommentDto) {
    return this.prisma.reportComment.create({
      data: { ...dto, labDepartmentId: dto.labDepartmentId ?? null, tenantId },
      include: { labDepartment: DEPT_SELECT },
    });
  }

  /** Department-scoped list ALWAYS includes global (null) comments. */
  findAll(
    tenantId: string,
    filters: {
      labDepartmentId?: string;
      category?: string;
      search?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.reportComment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.labDepartmentId
          ? {
              OR: [
                { labDepartmentId: filters.labDepartmentId },
                { labDepartmentId: null },
              ],
            }
          : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  commentText: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  shortcut: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: { labDepartment: DEPT_SELECT },
      orderBy: [{ category: 'asc' }, { commentText: 'asc' }],
    });
  }

  findByShortcut(tenantId: string, shortcut: string) {
    return this.prisma.reportComment.findFirst({
      where: {
        tenantId,
        shortcut: shortcut.toUpperCase(),
        isActive: true,
        deletedAt: null,
      },
      include: { labDepartment: DEPT_SELECT },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.reportComment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { labDepartment: DEPT_SELECT },
    });
  }

  update(tenantId: string, id: string, dto: UpdateReportCommentDto) {
    return this.prisma.reportComment.update({
      where: { id, tenantId },
      data: dto,
      include: { labDepartment: DEPT_SELECT },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.reportComment.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  findLabDepartment(tenantId: string, id: string) {
    return this.prisma.labDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
  }
}
