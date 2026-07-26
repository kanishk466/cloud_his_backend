import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    code: string;
    route?: string;
    icon?: string;
    parentId?: number;
    sortOrder?: number;
  }) {
    return this.prisma.module.create({ data });
  }

  findById(id: number) {
    return this.prisma.module.findUnique({
      where: { id },
      include: {
        features: { include: { feature: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          include: { features: { include: { feature: true } } },
        },
      },
    });
  }

  findByCode(code: string) {
    return this.prisma.module.findUnique({ where: { code } });
  }

  findAll() {
    return this.prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        features: { include: { feature: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          include: { features: { include: { feature: true } } },
        },
      },
    });
  }

  update(
    id: number,
    data: Partial<{
      name: string;
      route: string;
      icon: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.module.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.module.delete({ where: { id } });
  }

  attachFeature(moduleId: number, featureId: number) {
    return this.prisma.moduleFeature.create({
      data: { moduleId, featureId },
    });
  }
}