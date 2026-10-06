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
import { CreateServiceItemTypeDto } from './dto/create-service-item-type.dto';
import { UpdateServiceItemTypeDto } from './dto/update-service-item-type.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/**
 * Service Item Type Master — GLOBAL, system-seeded reference data
 * (SERVICE, MEDICINE, CONSUMABLE, PACKAGE, ROOM, PROCEDURE,
 * INVESTIGATION, OT_CHARGE). Not tenant-scoped.
 */
@Injectable()
export class ServiceItemTypeService {
  private readonly logger = new Logger(ServiceItemTypeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateServiceItemTypeDto, actor?: AuditActor) {
    const existing = await this.prisma.serviceItemType.findFirst({
      where: { OR: [{ code: dto.code }, { name: dto.name }] },
    });
    if (existing) {
      throw new ConflictException(`Item type '${dto.code}' already exists.`);
    }

    try {
      const created = await this.prisma.serviceItemType.create({
        data: {
          code: dto.code,
          name: dto.name,
          isSystem: dto.isSystem ?? false,
          isActive: dto.isActive ?? true,
        },
      });

      if (actor) {
        await this.auditService.log({
          action: 'SERVICE_ITEM_TYPE_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          targetType: 'ServiceItemType',
          targetId: created.id,
          targetName: created.name,
          detail: `Service item type '${created.name}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Item type '${dto.code}' already exists.`);
      }
      throw e;
    }
  }

  async list(search?: string) {
    return this.prisma.serviceItemType.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.serviceItemType.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Service item type not found.');
    return item;
  }

  async update(id: string, dto: UpdateServiceItemTypeDto, actor?: AuditActor) {
    const existing = await this.findOne(id);

    if (existing.isSystem && dto.code && dto.code !== existing.code) {
      throw new BadRequestException(
        'System item type codes cannot be changed.',
      );
    }

    const updated = await this.prisma.serviceItemType.update({
      where: { id },
      data: { ...dto },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_ITEM_TYPE_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'ServiceItemType',
        targetId: updated.id,
        targetName: updated.name,
        detail: `Service item type '${updated.name}' updated`,
      });
    }

    return updated;
  }

  async remove(id: string, actor?: AuditActor) {
    const existing = await this.findOne(id);

    if (existing.isSystem) {
      throw new BadRequestException(
        'System item types cannot be deleted. Deactivate instead.',
      );
    }

    const inUse = await this.prisma.serviceMaster.count({
      where: { itemTypeId: id, deletedAt: null },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot delete: ${inUse} service(s) use this item type.`,
      );
    }

    await this.prisma.serviceItemType.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (actor) {
      await this.auditService.log({
        action: 'SERVICE_ITEM_TYPE_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        targetType: 'ServiceItemType',
        targetId: existing.id,
        targetName: existing.name,
        detail: `Service item type '${existing.name}' deleted`,
      });
    }

    return { message: `Service item type '${existing.name}' deleted.` };
  }
}
