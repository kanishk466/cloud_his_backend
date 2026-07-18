import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(hospitalId: string, data: { name: string; code?: string }) {
    return this.prisma.department.create({
      data: {
        hospitalId,
        name: data.name,
        code: data.code,
      },
    });
  }

  findAll(hospitalId: string, active?: boolean) {
    return this.prisma.department.findMany({
      where: {
        hospitalId,
        ...(typeof active === 'boolean' ? { isActive: active } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
    });
  }

  findByHospitalAndName(hospitalId: string, name: string) {
    return this.prisma.department.findFirst({
      where: { hospitalId, name },
    });
  }

  update(id: string, data: { name?: string; code?: string; isActive?: boolean }) {
    return this.prisma.department.update({
      where: { id },
      data,
    });
  }
}