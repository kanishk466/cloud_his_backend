import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DiscountApprovalAuthorityRepository } from './discount-approval-authority.repository';
import { CreateDiscountApprovalAuthorityDto } from './dto/create-discount-approval-authority.dto';
import { UpdateDiscountApprovalAuthorityDto } from './dto/update-discount-approval-authority.dto';

@Injectable()
export class DiscountApprovalAuthorityService {
  constructor(private readonly repo: DiscountApprovalAuthorityRepository) {}

  async create(tenantId: string, dto: CreateDiscountApprovalAuthorityDto) {
    await this.assertRoleBelongsToTenant(tenantId, dto.hospitalRoleId);

    // One authority per role. A soft-deleted mapping still holds the unique
    // key, so revive it instead of failing with a conflict.
    const existing = await this.repo.findByRoleIncludingDeleted(
      tenantId,
      dto.hospitalRoleId,
    );
    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        'Discount approval authority already exists for this role',
      );
    }
    if (existing) {
      return this.repo.restore(tenantId, existing.id, dto);
    }

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
    const authority = await this.repo.findById(tenantId, id);
    if (!authority) {
      throw new NotFoundException('Discount approval authority not found');
    }
    return authority;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDiscountApprovalAuthorityDto,
  ) {
    const current = await this.findOne(tenantId, id);

    if (
      dto.hospitalRoleId !== undefined &&
      dto.hospitalRoleId !== current.hospitalRoleId
    ) {
      await this.assertRoleBelongsToTenant(tenantId, dto.hospitalRoleId);
    }

    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Discount approval authority deleted successfully' };
  }

  private async assertRoleBelongsToTenant(
    tenantId: string,
    hospitalRoleId: number,
  ) {
    const role = await this.repo.findRole(tenantId, hospitalRoleId);
    if (!role) throw new NotFoundException('Hospital role not found');
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(
        'Discount approval authority already exists for this role',
      );
    }
    throw e;
  }
}
