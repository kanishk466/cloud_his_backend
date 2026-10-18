import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BedsRepository } from '../repositories/beds.repository';
import { BedStatusRepository } from '../repositories/bed-status.repository';
import { CreateBedDto } from '../dto/bed/create-bed.dto';
import { BulkCreateBedsDto } from '../dto/bed/bulk-create-beds.dto';
import { FilterBedDto } from '../dto/bed/filter-bed.dto';

// Statuses that block bed deletion
const DELETE_BLOCKING_STATUSES = ['OCCUPIED', 'RESERVED'];

@Injectable()
export class BedsService {
  constructor(
    private readonly repo: BedsRepository,
    private readonly bedStatusRepo: BedStatusRepository,
  ) {}

  async create(tenantId: string, dto: CreateBedDto) {
    const room = await this.repo.findRoom(tenantId, dto.roomId);
    if (!room) throw new NotFoundException('Room not found in this hospital');

    try {
      return await this.repo.create(
        tenantId,
        dto.roomId,
        room.roomNumber,
        dto.bedNumber,
      );
    } catch (e) {
      this.rethrowConflict(e, room.roomNumber, dto.bedNumber);
    }
  }

  // ─── Bulk Bed Generator ─────────────────────────────────────────────────────
  //
  // { roomId, startNumber: 1, endNumber: 10 } → beds "01"…"10".
  // Duplicates are skipped (createMany + skipDuplicates), never fatal.

  async bulkCreate(tenantId: string, dto: BulkCreateBedsDto) {
    if (dto.endNumber < dto.startNumber) {
      throw new BadRequestException(
        'endNumber cannot be less than startNumber',
      );
    }

    const room = await this.repo.findRoom(tenantId, dto.roomId);
    if (!room) throw new NotFoundException('Room not found in this hospital');

    const padWidth = Math.max(
      String(dto.startNumber).length,
      String(dto.endNumber).length,
      2,
    );
    const prefix = dto.prefix ?? '';

    const bedNumbers: string[] = [];
    for (let n = dto.startNumber; n <= dto.endNumber; n++) {
      bedNumbers.push(`${prefix}${String(n).padStart(padWidth, '0')}`);
    }

    const { created } = await this.repo.bulkCreate(
      tenantId,
      dto.roomId,
      room.roomNumber,
      bedNumbers,
    );

    const skipped = bedNumbers.length - created;
    return {
      created,
      skipped,
      errors:
        skipped > 0
          ? [`${skipped} bed(s) already existed and were skipped`]
          : [],
    };
  }

  findAll(tenantId: string, filters: FilterBedDto) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const bed = await this.repo.findById(tenantId, id);
    if (!bed) throw new NotFoundException('Bed not found');
    return bed;
  }

  // ─── Delete guard: occupied / reserved beds are untouchable ─────────────────

  async remove(tenantId: string, id: string) {
    const bed = await this.findOne(tenantId, id);

    const current = await this.bedStatusRepo.getCurrentStatus(tenantId, id);
    if (current && DELETE_BLOCKING_STATUSES.includes(current.status)) {
      throw new ConflictException({
        code: 'BED_DELETE_BLOCKED',
        message: `Cannot delete bed ${bed.bedIdentifier}: it is currently ${current.status}. Free the bed first.`,
        details: { bedId: id, currentStatus: current.status },
      });
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Bed deleted successfully' };
  }

  private rethrowConflict(
    e: unknown,
    roomNumber: string,
    bedNumber: string,
  ): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(
        `Bed '${roomNumber}/${bedNumber}' already exists`,
      );
    }
    throw e;
  }
}
