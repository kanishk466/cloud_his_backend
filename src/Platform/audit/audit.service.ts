import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

export interface AuditLogInput {
  action: string;
  actorId: string;
  actorEmail: string;
  targetType: string;
  targetName: string;
  tenantId?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  detail?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an audit entry. Auditing must never break the business action that
   * triggered it, so failures are logged and swallowed rather than thrown.
   */
  async log(dto: AuditLogInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          tenantId: dto.tenantId,
          userId: dto.actorId,
          action: dto.action,
          entity: dto.targetType,
          entityId: dto.targetId,
          metadata: {
            actorEmail: dto.actorEmail,
            targetName: dto.targetName,
            ...dto.metadata,
            ...(dto.detail ? { detail: dto.detail } : {}),
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log ${dto.action} on ${dto.targetType} "${dto.targetName}"`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  async findAll(query: ListAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorEmail
        ? { metadata: { path: ['actorEmail'], equals: query.actorEmail } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
