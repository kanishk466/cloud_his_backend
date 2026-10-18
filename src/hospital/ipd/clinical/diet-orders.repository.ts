import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateDietOrderDto } from './dto/create-diet-order.dto';

@Injectable()
export class DietOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One ACTIVE diet per stay: deactivate the previous order and insert the new
   * one in a single transaction, so the kitchen never sees two live diets.
   */
  create(
    tenantId: string,
    admissionId: string,
    orderedBy: string,
    dto: CreateDietOrderDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.ipdDietOrder.updateMany({
        where: { tenantId, admissionId, isActive: true },
        data: { isActive: false },
      });

      return tx.ipdDietOrder.create({
        data: {
          tenantId,
          admissionId,
          orderedBy,
          dietType: dto.dietType,
          details: dto.details,
          effectiveFrom: dto.effectiveFrom,
        },
      });
    });
  }

  list(tenantId: string, admissionId: string, limit = 50) {
    return this.prisma.ipdDietOrder.findMany({
      where: { tenantId, admissionId },
      orderBy: { effectiveFrom: 'desc' },
      take: limit,
    });
  }

  findActive(tenantId: string, admissionId: string) {
    return this.prisma.ipdDietOrder.findFirst({
      where: { tenantId, admissionId, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.ipdDietOrder.findFirst({ where: { id, tenantId } });
  }

  stop(tenantId: string, id: string) {
    return this.prisma.ipdDietOrder.update({
      where: { id, tenantId },
      data: { isActive: false },
    });
  }
}
