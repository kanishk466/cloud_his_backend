import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FilterCommissionsDto } from '../dto/commission/filter-commissions.dto';

const RELATION_SELECT = {
  referDoctor: {
    select: { id: true, name: true, code: true, mobile: true },
  },
} as const;

@Injectable()
export class ReferralCommissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ReferralCommissionUncheckedCreateInput) {
    return this.prisma.referralCommission.create({
      data,
      include: RELATION_SELECT,
    });
  }

  findByBillId(tenantId: string, billId: string) {
    return this.prisma.referralCommission.findFirst({
      where: { tenantId, billId },
    });
  }

  findAll(tenantId: string, filters: FilterCommissionsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.ReferralCommissionWhereInput = {
      tenantId,
      ...(filters.referDoctorId
        ? { referDoctorId: filters.referDoctorId }
        : {}),
      ...(filters.proUserId ? { proUserId: filters.proUserId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.referralCommission.findMany({
        where,
        include: RELATION_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.referralCommission.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, limit }));
  }

  findById(tenantId: string, id: string) {
    return this.prisma.referralCommission.findFirst({
      where: { id, tenantId },
      include: RELATION_SELECT,
    });
  }

  settle(
    tenantId: string,
    id: string,
    status: string,
    settledBy: string,
    notes?: string,
  ) {
    return this.prisma.referralCommission.update({
      where: { id, tenantId },
      data: {
        status,
        notes,
        settledAt: new Date(),
        settledBy,
      },
      include: RELATION_SELECT,
    });
  }

  bulkSettle(
    tenantId: string,
    ids: string[],
    status: string,
    settledBy: string,
    notes?: string,
  ) {
    return this.prisma.referralCommission.updateMany({
      where: { id: { in: ids }, tenantId },
      data: {
        status,
        notes,
        settledAt: new Date(),
        settledBy,
      },
    });
  }

  /** Per-doctor + per-PRO aggregation for the summary endpoint. */
  async getSummary(tenantId: string, filters: FilterCommissionsDto) {
    const where: Prisma.ReferralCommissionWhereInput = {
      tenantId,
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };

    const [commissions, referDoctors] = await Promise.all([
      this.prisma.referralCommission.findMany({
        where,
        include: {
          referDoctor: {
            select: { id: true, name: true, code: true, proUserId: true },
          },
        },
      }),
      this.prisma.hospitalUser.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    return { commissions, referDoctors };
  }
}
