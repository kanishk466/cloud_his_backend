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
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { QueryDistrictDto } from './dto/query-district.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** District Master. GLOBAL reference data (no tenantId) under a State. */
@Injectable()
export class DistrictService {
  private readonly logger = new Logger(DistrictService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertStateExists(stateId: string) {
    const state = await this.prisma.state.findUnique({
      where: { id: stateId },
      select: { id: true },
    });
    if (!state) throw new BadRequestException('Invalid stateId: state not found.');
  }

  async create(dto: CreateDistrictDto, actor?: AuditActor) {
    await this.assertStateExists(dto.stateId);

    const existing = await this.prisma.district.findFirst({
      where: { stateId: dto.stateId, districtCode: dto.districtCode },
    });
    if (existing) {
      throw new ConflictException(`District code '${dto.districtCode}' already exists in this state.`);
    }

    try {
      const created = await this.prisma.district.create({
        data: {
          stateId: dto.stateId,
          districtCode: dto.districtCode,
          districtName: dto.districtName,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_DISTRICT_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          targetType: 'District',
          targetId: created.id,
          targetName: created.districtName,
          detail: `District '${created.districtName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`District code '${dto.districtCode}' already exists in this state.`);
      }
      throw e;
    }
  }

  async list(query: QueryDistrictDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DistrictWhereInput = {
      ...(query.stateId && { stateId: query.stateId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { districtName: { contains: query.search, mode: 'insensitive' } },
          { districtCode: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.district.findMany({
        where,
        orderBy: { districtName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.district.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(stateId?: string) {
    return this.prisma.district.findMany({
      where: { isActive: true, ...(stateId && { stateId }) },
      orderBy: { districtName: 'asc' },
      select: { id: true, districtCode: true, districtName: true, stateId: true },
    });
  }

  async findOne(id: string) {
    const district = await this.prisma.district.findUnique({ where: { id } });
    if (!district) throw new NotFoundException('District not found.');
    return district;
  }

  async update(id: string, dto: UpdateDistrictDto, actor?: AuditActor) {
    const existing = await this.prisma.district.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('District not found.');

    if (dto.stateId) await this.assertStateExists(dto.stateId);

    const targetStateId = dto.stateId ?? existing.stateId;
    const targetCode = dto.districtCode ?? existing.districtCode;
    if (targetCode !== existing.districtCode || targetStateId !== existing.stateId) {
      const dup = await this.prisma.district.findFirst({
        where: { stateId: targetStateId, districtCode: targetCode, NOT: { id } },
      });
      if (dup) throw new ConflictException(`District code '${targetCode}' already exists in this state.`);
    }

    const updated = await this.prisma.district.update({ where: { id }, data: { ...dto } });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_DISTRICT_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'District',
        targetId: updated.id,
        targetName: updated.districtName,
        detail: `District '${updated.districtName}' updated`,
      });
    }

    return updated;
  }

  async remove(id: string, actor?: AuditActor) {
    const existing = await this.prisma.district.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('District not found.');

    const childCount = await this.prisma.city.count({ where: { districtId: id } });
    if (childCount > 0) {
      throw new ConflictException(`Cannot delete: ${childCount} city(ies) still reference this district.`);
    }

    await this.prisma.district.delete({ where: { id } });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_DISTRICT_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'District',
        targetId: existing.id,
        targetName: existing.districtName,
        detail: `District '${existing.districtName}' deleted`,
      });
    }

    return { message: `District '${existing.districtName}' deleted successfully.` };
  }
}
