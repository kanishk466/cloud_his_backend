import {
  Injectable, ConflictException, NotFoundException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateMicroMasterDto } from './dto/create-micro-master.dto';
import { UpdateMicroMasterDto } from './dto/update-micro-master.dto';
import { QueryMicroMasterDto } from './dto/query-micro-master.dto';

interface AuditActor { actorId: string; actorEmail: string; }

/** Micro Master (microbiology: organisms, antibiotics, staining, colony counts). */
@Injectable()
export class MicroMasterService {
  private readonly logger = new Logger(MicroMasterService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  async create(tenantId: string, dto: CreateMicroMasterDto, actor?: AuditActor) {
    const existing = await this.prisma.microMaster.findFirst({
      where: { tenantId, type: dto.type, name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) throw new ConflictException(`'${dto.name}' already exists in ${dto.type}.`);
    try {
      const created = await this.prisma.microMaster.create({
        data: {
          tenantId, type: dto.type, name: dto.name, code: dto.code,
          isActive: dto.isActive ?? true, createdBy: actor?.actorId, updatedBy: actor?.actorId,
        },
      });
      if (actor) {
        await this.auditService.log({
          action: 'MICRO_MASTER_CREATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
          tenantId, targetType: 'MicroMaster', targetId: created.id, targetName: created.name,
          detail: `Micro master '${created.name}' (${created.type}) created`,
        });
      }
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`'${dto.name}' already exists in ${dto.type}.`);
      }
      throw e;
    }
  }

  async list(tenantId: string, query: QueryMicroMasterDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MicroMasterWhereInput = {
      tenantId, deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.microMaster.findMany({ where, orderBy: [{ type: 'asc' }, { name: 'asc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.microMaster.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(tenantId: string, type?: string) {
    return this.prisma.microMaster.findMany({
      where: { tenantId, deletedAt: null, isActive: true, ...(type && { type: type as any }) },
      orderBy: { name: 'asc' },
      select: { id: true, type: true, name: true, code: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const m = await this.prisma.microMaster.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!m) throw new NotFoundException('Micro master not found.');
    return m;
  }

  async update(tenantId: string, id: string, dto: UpdateMicroMasterDto, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    const targetName = dto.name ?? existing.name;
    const targetType = dto.type ?? existing.type;
    if (targetName.toLowerCase() !== existing.name.toLowerCase() || targetType !== existing.type) {
      const dup = await this.prisma.microMaster.findFirst({
        where: { tenantId, type: targetType, name: { equals: targetName, mode: 'insensitive' }, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`'${targetName}' already exists in ${targetType}.`);
    }
    const updated = await this.prisma.microMaster.update({ where: { id }, data: { ...dto, updatedBy: actor?.actorId } });
    if (actor) {
      await this.auditService.log({
        action: 'MICRO_MASTER_UPDATED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'MicroMaster', targetId: updated.id, targetName: updated.name,
        detail: `Micro master '${updated.name}' updated`,
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.findOne(tenantId, id);
    await this.prisma.microMaster.update({
      where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });
    if (actor) {
      await this.auditService.log({
        action: 'MICRO_MASTER_DELETED', actorId: actor.actorId, actorEmail: actor.actorEmail,
        tenantId, targetType: 'MicroMaster', targetId: existing.id, targetName: existing.name,
        detail: `Micro master '${existing.name}' deleted`,
      });
    }
    return { message: `Micro master '${existing.name}' deleted.` };
  }
}
