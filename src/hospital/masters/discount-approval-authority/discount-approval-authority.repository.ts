import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateDiscountApprovalAuthorityDto } from './dto/create-discount-approval-authority.dto';
import { UpdateDiscountApprovalAuthorityDto } from './dto/update-discount-approval-authority.dto';

const include = {
  hospitalRole: {
    select: {
      id: true,
      isActive: true,
      roleName: { select: { id: true, name: true, code: true } },
    },
  },
} satisfies Prisma.DiscountApprovalAuthorityInclude;

@Injectable()
export class DiscountApprovalAuthorityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tenant-scoped lookup to make sure the role belongs to this hospital. */
  findRole(tenantId: string, hospitalRoleId: number) {
    return this.prisma.hospitalRole.findFirst({
      where: { id: hospitalRoleId, tenantId },
      select: { id: true },
    });
  }

  /** Includes soft-deleted rows; used to revive a deleted mapping. */
  findByRoleIncludingDeleted(tenantId: string, hospitalRoleId: number) {
    return this.prisma.discountApprovalAuthority.findUnique({
      where: { tenantId_hospitalRoleId: { tenantId, hospitalRoleId } },
    });
  }

  create(tenantId: string, dto: CreateDiscountApprovalAuthorityDto) {
    return this.prisma.discountApprovalAuthority.create({
      data: { ...dto, tenantId },
      include,
    });
  }

  restore(
    tenantId: string,
    id: string,
    dto: CreateDiscountApprovalAuthorityDto,
  ) {
    return this.prisma.discountApprovalAuthority.update({
      where: { id, tenantId },
      data: {
        maxDiscountAmount: null,
        description: null,
        isActive: true,
        ...dto,
        deletedAt: null,
      },
      include,
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.discountApprovalAuthority.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include,
      orderBy: { maxDiscountPercent: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.discountApprovalAuthority.findFirst({
      where: { id, tenantId, deletedAt: null },
      include,
    });
  }

  update(
    tenantId: string,
    id: string,
    dto: UpdateDiscountApprovalAuthorityDto,
  ) {
    return this.prisma.discountApprovalAuthority.update({
      where: { id, tenantId },
      data: dto,
      include,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.discountApprovalAuthority.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
