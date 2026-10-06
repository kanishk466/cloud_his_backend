import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { QueryBankDto } from './dto/query-bank.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Bank Master. Tenant-scoped (per hospital). */
@Injectable()
export class BankService {
  private readonly logger = new Logger(BankService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateBankDto, actor?: AuditActor) {
    const existing = await this.prisma.bank.findFirst({
      where: {
        tenantId,
        bankName: { equals: dto.bankName, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`Bank '${dto.bankName}' already exists.`);
    }

    try {
      const created = await this.prisma.bank.create({
        data: {
          tenantId,
          bankName: dto.bankName,
          mdrPercent: dto.mdrPercent ?? 0,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_BANK_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'Bank',
          targetId: created.id,
          targetName: created.bankName,
          detail: `Bank '${created.bankName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Bank '${dto.bankName}' already exists.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryBankDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.BankWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        bankName: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.bank.findMany({
        where,
        orderBy: { bankName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bank.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string) {
    return this.prisma.bank.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { bankName: 'asc' },
      select: { id: true, bankName: true, mdrPercent: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const bank = await this.prisma.bank.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!bank) throw new NotFoundException('Bank not found.');
    return bank;
  }

  async update(tenantId: string, id: string, dto: UpdateBankDto, actor?: AuditActor) {
    const existing = await this.prisma.bank.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Bank not found.');

    if (dto.bankName && dto.bankName.toLowerCase() !== existing.bankName.toLowerCase()) {
      const dup = await this.prisma.bank.findFirst({
        where: {
          tenantId,
          bankName: { equals: dto.bankName, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Bank '${dto.bankName}' already exists.`);
    }

    const updated = await this.prisma.bank.update({
      where: { id },
      data: { ...dto, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_BANK_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Bank',
        targetId: updated.id,
        targetName: updated.bankName,
        detail: `Bank '${updated.bankName}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.bank.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Bank not found.');

    await this.prisma.bank.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_BANK_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Bank',
        targetId: existing.id,
        targetName: existing.bankName,
        detail: `Bank '${existing.bankName}' deleted`,
      });
    }

    return { message: `Bank '${existing.bankName}' deleted successfully.` };
  }
}
