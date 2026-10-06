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
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { QueryStateDto } from './dto/query-state.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/**
 * State Master. GLOBAL reference data (no tenantId) under a Country.
 */
@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertCountryExists(countryId: string) {
    const country = await this.prisma.country.findUnique({
      where: { id: countryId },
      select: { id: true },
    });
    if (!country) throw new BadRequestException('Invalid countryId: country not found.');
  }

  async create(dto: CreateStateDto, actor?: AuditActor) {
    await this.assertCountryExists(dto.countryId);

    const existing = await this.prisma.state.findFirst({
      where: { countryId: dto.countryId, stateCode: dto.stateCode },
    });
    if (existing) {
      throw new ConflictException(`State code '${dto.stateCode}' already exists in this country.`);
    }

    try {
      const created = await this.prisma.state.create({
        data: {
          countryId: dto.countryId,
          stateCode: dto.stateCode,
          stateName: dto.stateName,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_STATE_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          targetType: 'State',
          targetId: created.id,
          targetName: created.stateName,
          detail: `State '${created.stateName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`State code '${dto.stateCode}' already exists in this country.`);
      }
      throw e;
    }
  }

  async list(query: QueryStateDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StateWhereInput = {
      ...(query.countryId && { countryId: query.countryId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { stateName: { contains: query.search, mode: 'insensitive' } },
          { stateCode: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.state.findMany({
        where,
        orderBy: { stateName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.state.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(countryId?: string) {
    return this.prisma.state.findMany({
      where: { isActive: true, ...(countryId && { countryId }) },
      orderBy: { stateName: 'asc' },
      select: { id: true, stateCode: true, stateName: true, countryId: true },
    });
  }

  async findOne(id: string) {
    const state = await this.prisma.state.findUnique({ where: { id } });
    if (!state) throw new NotFoundException('State not found.');
    return state;
  }

  async update(id: string, dto: UpdateStateDto, actor?: AuditActor) {
    const existing = await this.prisma.state.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('State not found.');

    if (dto.countryId) await this.assertCountryExists(dto.countryId);

    const targetCountryId = dto.countryId ?? existing.countryId;
    const targetCode = dto.stateCode ?? existing.stateCode;
    if (targetCode !== existing.stateCode || targetCountryId !== existing.countryId) {
      const dup = await this.prisma.state.findFirst({
        where: { countryId: targetCountryId, stateCode: targetCode, NOT: { id } },
      });
      if (dup) throw new ConflictException(`State code '${targetCode}' already exists in this country.`);
    }

    const updated = await this.prisma.state.update({ where: { id }, data: { ...dto } });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_STATE_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'State',
        targetId: updated.id,
        targetName: updated.stateName,
        detail: `State '${updated.stateName}' updated`,
      });
    }

    return updated;
  }

  async remove(id: string, actor?: AuditActor) {
    const existing = await this.prisma.state.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('State not found.');

    const childCount = await this.prisma.district.count({ where: { stateId: id } });
    if (childCount > 0) {
      throw new ConflictException(`Cannot delete: ${childCount} district(s) still reference this state.`);
    }

    await this.prisma.state.delete({ where: { id } });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_STATE_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'State',
        targetId: existing.id,
        targetName: existing.stateName,
        detail: `State '${existing.stateName}' deleted`,
      });
    }

    return { message: `State '${existing.stateName}' deleted successfully.` };
  }
}
