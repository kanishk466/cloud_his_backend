import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(hospitalId: number, data: { name: string; startTime?: string; endTime?: string }) {
    return this.prisma.shiftMaster.create({
      data: {
        hospitalId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  findAll(hospitalId: number, active?: boolean) {
    return this.prisma.shiftMaster.findMany({
      where: {
        hospitalId,
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

  findByHospitalAndName(hospitalId: number, name: string) {
    return this.prisma.shiftMaster.findFirst({
      where: { hospitalId, name },
    });
  }

  update(id: number, data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean }) {
    return this.prisma.shiftMaster.update({
      where: { id },
      data,
    });
  }
}