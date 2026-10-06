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
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedDto } from './dto/update-bed.dto';
import { QueryBedDto } from './dto/query-bed.dto';
import { BulkCreateBedsDto } from './dto/bulk-create-beds.dto';

interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Bed Master + bulk generator. Tenant-scoped, under a Room. */
@Injectable()
export class BedService {
  private readonly logger = new Logger(BedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async assertRoomVisible(tenantId: string, roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!room) throw new BadRequestException('Invalid roomId: room not found.');
  }

  private async assertAmenities(tenantId: string, amenityIds?: string[]) {
    if (!amenityIds || amenityIds.length === 0) return;
    const found = await this.prisma.bedAmenity.count({
      where: { id: { in: amenityIds }, tenantId, deletedAt: null },
    });
    if (found !== amenityIds.length) {
      throw new BadRequestException('One or more amenityIds are invalid.');
    }
  }

  private async attachAmenities(
    tenantId: string,
    bedId: string,
    amenityIds?: string[],
  ) {
    if (!amenityIds || amenityIds.length === 0) return;
    await this.prisma.bedAmenityMapping.createMany({
      data: amenityIds.map((amenityId) => ({ tenantId, bedId, amenityId })),
      skipDuplicates: true,
    });
  }

  async create(tenantId: string, dto: CreateBedDto, actor?: AuditActor) {
    await this.assertRoomVisible(tenantId, dto.roomId);
    await this.assertAmenities(tenantId, dto.amenityIds);

    const existing = await this.prisma.bed.findFirst({
      where: { tenantId, roomId: dto.roomId, bedNo: dto.bedNo, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Bed '${dto.bedNo}' already exists in this room.`);
    }

    try {
      const created = await this.prisma.bed.create({
        data: {
          tenantId,
          roomId: dto.roomId,
          bedNo: dto.bedNo,
          description: dto.description,
          isCount: dto.isCount ?? true,
          isActive: dto.isActive ?? true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        },
      });

      await this.attachAmenities(tenantId, created.id, dto.amenityIds);

      if (actor) {
        await this.auditService.log({
          action: 'BED_CREATED',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          tenantId,
          targetType: 'Bed',
          targetId: created.id,
          targetName: created.bedNo,
          detail: `Bed '${created.bedNo}' created`,
        });
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Bed '${dto.bedNo}' already exists in this room.`);
      }
      throw e;
    }
  }

  /** Bulk bed generator — explicit numbers or count + startNumber. */
  async bulkCreate(tenantId: string, dto: BulkCreateBedsDto, actor?: AuditActor) {
    await this.assertRoomVisible(tenantId, dto.roomId);
    await this.assertAmenities(tenantId, dto.amenityIds);

    // Resolve the list of bed numbers to create.
    let bedNumbers: string[] = [];
    if (dto.bedNumbers && dto.bedNumbers.length > 0) {
      bedNumbers = dto.bedNumbers.map((n) => n.trim());
    } else if (dto.count && dto.count > 0) {
      const start = dto.startNumber ?? 1;
      const prefix = dto.prefix ?? '';
      for (let i = 0; i < dto.count; i++) {
        bedNumbers.push(`${prefix}${start + i}`);
      }
    } else {
      throw new BadRequestException(
        'Provide either bedNumbers or count (with optional startNumber/prefix).',
      );
    }

    // Dedupe within the request.
    bedNumbers = Array.from(new Set(bedNumbers));
    if (bedNumbers.length === 0) {
      throw new BadRequestException('No bed numbers resolved.');
    }

    // Reject if any already exists in this room (active or not-deleted).
    const clashes = await this.prisma.bed.findMany({
      where: { tenantId, roomId: dto.roomId, bedNo: { in: bedNumbers }, deletedAt: null },
      select: { bedNo: true },
    });
    if (clashes.length > 0) {
      throw new ConflictException(
        `These bed numbers already exist in this room: ${clashes.map((c) => c.bedNo).join(', ')}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.bed.createMany({
        data: bedNumbers.map((bedNo) => ({
          tenantId,
          roomId: dto.roomId,
          bedNo,
          isCount: dto.isCount ?? true,
          isActive: true,
          createdBy: actor?.actorId,
          updatedBy: actor?.actorId,
        })),
      });

      const created = await tx.bed.findMany({
        where: { tenantId, roomId: dto.roomId, bedNo: { in: bedNumbers }, deletedAt: null },
        select: { id: true, bedNo: true },
      });

      if (dto.amenityIds && dto.amenityIds.length > 0) {
        await tx.bedAmenityMapping.createMany({
          data: created.flatMap((bed) =>
            dto.amenityIds!.map((amenityId) => ({ tenantId, bedId: bed.id, amenityId })),
          ),
          skipDuplicates: true,
        });
      }

      return created;
    });

    if (actor) {
      await this.auditService.log({
        action: 'BED_BULK_CREATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Bed',
        targetId: dto.roomId,
        targetName: `${result.length} beds`,
        detail: `Bulk created ${result.length} beds in room ${dto.roomId}`,
      });
    }

    this.logger.log(`Bulk created ${result.length} beds in room ${dto.roomId}`);
    return { created: result.length, beds: result };
  }

  async list(tenantId: string, query: QueryBedDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.BedWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.roomId && { roomId: query.roomId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        bedNo: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.bed.findMany({
        where,
        orderBy: { bedNo: 'asc' },
        include: {
          room: { select: { id: true, roomName: true, roomNo: true, roomTypeId: true } },
          status: true,
          amenityMappings: {
            where: { deletedAt: null },
            include: { amenity: { select: { id: true, name: true } } },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bed.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const bed = await this.prisma.bed.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        room: { include: { roomType: true } },
        status: true,
        amenityMappings: {
          where: { deletedAt: null },
          include: { amenity: { select: { id: true, name: true } } },
        },
      },
    });
    if (!bed) throw new NotFoundException('Bed not found.');
    return bed;
  }

  async update(tenantId: string, id: string, dto: UpdateBedDto, actor?: AuditActor) {
    const existing = await this.prisma.bed.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Bed not found.');

    if (dto.roomId) await this.assertRoomVisible(tenantId, dto.roomId);
    await this.assertAmenities(tenantId, dto.amenityIds);

    const targetRoom = dto.roomId ?? existing.roomId;
    const targetNo = dto.bedNo ?? existing.bedNo;
    if (targetRoom !== existing.roomId || targetNo !== existing.bedNo) {
      const dup = await this.prisma.bed.findFirst({
        where: {
          tenantId,
          roomId: targetRoom,
          bedNo: targetNo,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Bed '${targetNo}' already exists in this room.`);
    }

    const { amenityIds, ...bedData } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      const bed = await tx.bed.update({
        where: { id },
        data: { ...bedData, updatedBy: actor?.actorId },
      });

      // Replace amenity mappings if provided.
      if (amenityIds !== undefined) {
        await tx.bedAmenityMapping.deleteMany({ where: { bedId: id, tenantId } });
        if (amenityIds.length > 0) {
          await tx.bedAmenityMapping.createMany({
            data: amenityIds.map((amenityId) => ({ tenantId, bedId: id, amenityId })),
            skipDuplicates: true,
          });
        }
      }

      return bed;
    });

    if (actor) {
      await this.auditService.log({
        action: 'BED_UPDATED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Bed',
        targetId: updated.id,
        targetName: updated.bedNo,
        detail: `Bed '${updated.bedNo}' updated`,
      });
    }

    return updated;
  }

  async remove(tenantId: string, id: string, actor?: AuditActor) {
    const existing = await this.prisma.bed.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { status: true },
    });
    if (!existing) throw new NotFoundException('Bed not found.');

    // Business rule: cannot delete an occupied bed.
    if (existing.status && existing.status.currentStatus === 'OCCUPIED') {
      throw new ConflictException(
        `Cannot delete bed '${existing.bedNo}': it is currently OCCUPIED.`,
      );
    }

    await this.prisma.bed.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor?.actorId },
    });

    if (actor) {
      await this.auditService.log({
        action: 'BED_DELETED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        tenantId,
        targetType: 'Bed',
        targetId: existing.id,
        targetName: existing.bedNo,
        detail: `Bed '${existing.bedNo}' deleted`,
      });
    }

    return { message: `Bed '${existing.bedNo}' deleted.` };
  }
}
