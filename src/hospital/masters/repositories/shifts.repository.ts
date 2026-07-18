import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(hospitalId: string, data: { name: string; startTime?: string; endTime?: string }) {
    return this.prisma.shiftMaster.create({
      data: {
        hospitalId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  findAll(hospitalId: string, active?: boolean) {
    return this.prisma.shiftMaster.findMany({
      where: {
        hospitalId,
        ...(typeof active === 'boolean' ? { isActive: active } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.shiftMaster.findUnique({
      where: { id },
    });
  }

  findByHospitalAndName(hospitalId: string, name: string) {
    return this.prisma.shiftMaster.findFirst({
      where: { hospitalId, name },
    });
  }

  update(id: string, data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean }) {
    return this.prisma.shiftMaster.update({
      where: { id },
      data,
    });
  }
}