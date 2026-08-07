import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class RoleNameRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.roleName.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isSystem: true,
        createdByTenantId: true,
        createdAt: true,
      },
    });
  }

  findByCode(code: string) {
    return this.prisma.roleName.findUnique({ where: { code } });
  }

  create(data: {
    name: string;
    code: string;
    description?: string;
    createdByTenantId: string;
  }) {
    return this.prisma.roleName.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        isSystem: false,
        createdByTenantId: data.createdByTenantId,
      },
    });
  }
}