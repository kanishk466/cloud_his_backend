import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: { name: string; startTime?: string; endTime?: string }) {
    return this.prisma.shiftMaster.create({
      data: {
        tenantId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  findAll(tenantId: string, active?: boolean) {
    return this.prisma.shiftMaster.findMany({
      where: {
        tenantId,
        ...(typeof active === 'boolean' ? { isActive: active } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.shiftMaster.findUnique({
      where: { id },
    });
  }

  findByTenantAndName(tenantId: string, name: string) {
    return this.prisma.shiftMaster.findFirst({
      where: { tenantId, name },
    });
  }

  update(id: number, data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean }) {
    return this.prisma.shiftMaster.update({
      where: { id },
      data,
    });
  }
}