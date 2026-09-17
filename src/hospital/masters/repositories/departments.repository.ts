import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) { }

  // create(tenantId: string, data: { name: string; code?: string }) {
  //   return this.prisma.department.create({
  //     data: { tenantId, name: data.name, code: data.code },
  //   });
  // }

  create(tenantId: string, data: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        description: data.description,
        isActive: data.isActive,
      },
    });
  }

  findAll(tenantId: string, active?: boolean) {
    return this.prisma.department.findMany({
      where: {
        tenantId,
        ...(typeof active === 'boolean' ? { isActive: active } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.department.findUnique({ where: { id } });
  }

  findByTenantAndName(tenantId: string, name: string) {
    return this.prisma.department.findFirst({ where: { tenantId, name } });
  }

  update(
    id: number,
    data: { name?: string; code?: string; isActive?: boolean },
  ) {
    return this.prisma.department.update({ where: { id }, data });
  }
}
