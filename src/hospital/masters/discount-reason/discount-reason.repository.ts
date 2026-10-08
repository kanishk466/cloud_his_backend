import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateDiscountReasonDto } from './dto/create-discount-reason.dto';
import { UpdateDiscountReasonDto } from './dto/update-discount-reason.dto';

@Injectable()
export class DiscountReasonRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateDiscountReasonDto) {
    return this.prisma.discountReason.create({
      data: { ...dto, tenantId },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.discountReason.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.discountReason.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  update(tenantId: string, id: string, dto: UpdateDiscountReasonDto) {
    return this.prisma.discountReason.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.discountReason.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
