import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class RoleNameRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Search globally (system + all hospitals)
  findAll(search?: string) {
    return this.prisma.roleName.findMany({
      where: {
        ...(search
          ? { name: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: [
        { isSystem: 'desc' }, // system roles first
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isSystem: true,
        createdByHospitalId: true,
        createdAt: true,
      },
    });
  }

  findByCode(code: string) {
    return this.prisma.roleName.findUnique({
      where: { code },
    });
  }

  create(data: {
    name: string;
    code: string;
    description?: string;
    createdByHospitalId: string;
  }) {
    return this.prisma.roleName.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        isSystem: false,
        createdByHospitalId: data.createdByHospitalId,
      },
    });
  }
}