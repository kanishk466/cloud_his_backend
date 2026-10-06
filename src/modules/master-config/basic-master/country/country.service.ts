import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { QueryCountryDto } from './dto/query-country.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/**
 * Country Master.
 *
 * Geo masters (Country/State/District/City) are GLOBAL — shared across all
 * hospitals and keyed by code. They are platform-managed reference data and
 * are NOT tenant-scoped. Mutations are intended for platform/admin seeding.
 */
@Injectable()
export class CountryService {
  private readonly logger = new Logger(CountryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateCountryDto, actor?: AuditActor) {
    const existing = await this.prisma.country.findFirst({
      where: {
        OR: [
          { countryCode: dto.countryCode },
          { countryName: { equals: dto.countryName, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw new ConflictException(`Country '${dto.countryName}' already exists.`);
    }

    try {
      const created = await this.prisma.country.create({
        data: {
          countryCode: dto.countryCode,
          countryName: dto.countryName,
          currency: dto.currency,
          currencySymbol: dto.currencySymbol,
          isBaseCurrency: dto.isBaseCurrency ?? false,
          phoneCode: dto.phoneCode,
          isActive: dto.isActive ?? true,
        },
      });

      if (dto.isBaseCurrency) {
        await this.clearBaseCurrency(created.id);
      }

      if (actor) {
        await this.auditService.log({
          action: 'BASIC_MASTER_COUNTRY_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          targetType: 'Country',
          targetId: created.id,
          targetName: created.countryName,
          detail: `Country '${created.countryName}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Country '${dto.countryName}' already exists.`);
      }
      throw e;
    }
  }

  async list(query: QueryCountryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CountryWhereInput = {
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { countryName: { contains: query.search, mode: 'insensitive' } },
          { countryCode: { contains: query.search, mode: 'insensitive' } },
          { currency: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.country.findMany({
        where,
        orderBy: { countryName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.country.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async dropdown() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { countryName: 'asc' },
      select: {
        id: true,
        countryCode: true,
        countryName: true,
        currency: true,
        currencySymbol: true,
        isBaseCurrency: true,
      },
    });
  }

  async findOne(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) throw new NotFoundException('Country not found.');
    return country;
  }

  async update(id: string, dto: UpdateCountryDto, actor?: AuditActor) {
    const existing = await this.prisma.country.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Country not found.');

    if (dto.countryCode && dto.countryCode !== existing.countryCode) {
      const dup = await this.prisma.country.findFirst({
        where: { countryCode: dto.countryCode, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Country code '${dto.countryCode}' already exists.`);
    }

    const updated = await this.prisma.country.update({
      where: { id },
      data: { ...dto },
    });

    if (dto.isBaseCurrency) {
      await this.clearBaseCurrency(id);
    }

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_COUNTRY_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'Country',
        targetId: updated.id,
        targetName: updated.countryName,
        detail: `Country '${updated.countryName}' updated`,
      });
    }

    return updated;
  }

  async remove(id: string, actor?: AuditActor) {
    const existing = await this.prisma.country.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Country not found.');

    const childCount = await this.prisma.state.count({ where: { countryId: id } });
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${childCount} state(s) still reference this country.`,
      );
    }

    await this.prisma.country.delete({ where: { id } });

    if (actor) {
      await this.auditService.log({
        action: 'BASIC_MASTER_COUNTRY_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'Country',
        targetId: existing.id,
        targetName: existing.countryName,
        detail: `Country '${existing.countryName}' deleted`,
      });
    }

    return { message: `Country '${existing.countryName}' deleted successfully.` };
  }

  private async clearBaseCurrency(exceptId?: string) {
    await this.prisma.country.updateMany({
      where: { isBaseCurrency: true, ...(exceptId && { NOT: { id: exceptId } }) },
      data: { isBaseCurrency: false },
    });
  }
}
