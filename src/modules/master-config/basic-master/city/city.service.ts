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
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { QueryCityDto } from './dto/query-city.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** City Master. GLOBAL reference data (no tenantId) under a District. */
@Injectable()
export class CityService {
  private readonly logger = new Logger(CityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertDistrictExists(districtId: string) {
    const district = await this.prisma.district.findUnique({
      where: { id: districtId },
      select: { id: true },
    });
    if (!district) throw new BadRequestException('Invalid districtId: district not found.');
  }

  async create(dto: CreateCityDto, actor?: AuditActor) {
    await this.assertDistrictExists(dto.districtId);

    const existing = await this.prisma.city.findFirst({
      where: { districtId: dto.districtId, cityCode: dto.cityCode },
    });
    if (existing) {
      throw new ConflictException(`City code '${dto.cityCode}' already exists in this district.`);
    }

    try {
      const created = await this.prisma.city.create({
        data: {
          districtId: dto.districtId,
          cityCode: dto.cityCode,
          cityName: dto.cityName,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_CITY_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          targetType: 'City',
          targetId: created.id,
          targetName: created.cityName,
          detail: `City '${created.cityName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`City code '${dto.cityCode}' already exists in this district.`);
      }
      throw e;
    }
  }

  async list(query: QueryCityDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CityWhereInput = {
      ...(query.districtId && { districtId: query.districtId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { cityName: { contains: query.search, mode: 'insensitive' } },
          { cityCode: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        orderBy: { cityName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.city.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown(districtId?: string) {
    return this.prisma.city.findMany({
      where: { isActive: true, ...(districtId && { districtId }) },
      orderBy: { cityName: 'asc' },
      select: { id: true, cityCode: true, cityName: true, districtId: true },
    });
  }

  async findOne(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found.');
    return city;
  }

  async update(id: string, dto: UpdateCityDto, actor?: AuditActor) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('City not found.');

    if (dto.districtId) await this.assertDistrictExists(dto.districtId);

    const targetDistrictId = dto.districtId ?? existing.districtId;
    const targetCode = dto.cityCode ?? existing.cityCode;
    if (targetCode !== existing.cityCode || targetDistrictId !== existing.districtId) {
      const dup = await this.prisma.city.findFirst({
        where: { districtId: targetDistrictId, cityCode: targetCode, NOT: { id } },
      });
      if (dup) throw new ConflictException(`City code '${targetCode}' already exists in this district.`);
    }

    const updated = await this.prisma.city.update({ where: { id }, data: { ...dto } });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_CITY_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'City',
        targetId: updated.id,
        targetName: updated.cityName,
        detail: `City '${updated.cityName}' updated`,
      });
    }

    return updated;
  }

  async remove(id: string, actor?: AuditActor) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('City not found.');

    await this.prisma.city.delete({ where: { id } });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_CITY_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'City',
        targetId: existing.id,
        targetName: existing.cityName,
        detail: `City '${existing.cityName}' deleted`,
      });
    }

    return { message: `City '${existing.cityName}' deleted successfully.` };
  }
}
