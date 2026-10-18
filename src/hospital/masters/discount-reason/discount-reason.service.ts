import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DiscountReasonRepository } from './discount-reason.repository';
import { CreateDiscountReasonDto } from './dto/create-discount-reason.dto';
import { UpdateDiscountReasonDto } from './dto/update-discount-reason.dto';

@Injectable()
export class DiscountReasonService {
  constructor(private readonly repo: DiscountReasonRepository) {}

  async create(tenantId: string, dto: CreateDiscountReasonDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findOne(tenantId: string, id: string) {
    const reason = await this.repo.findById(tenantId, id);
    if (!reason) throw new NotFoundException('Discount reason not found');
    return reason;
  }

  async update(tenantId: string, id: string, dto: UpdateDiscountReasonDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Discount reason deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Discount reason code already exists');
    }
    throw e;
  }
}
