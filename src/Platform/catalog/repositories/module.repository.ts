import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ModuleRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(data: {
    name: string;
    code: string;
    route?: string;
    icon?: string;
    parentId?: string;
    sortOrder?: number;
  }) {
    return this.prisma.module.create({
      data,
    });
  }

  findById(id: string) {
    return this.prisma.module.findUnique({
      where: { id },

      include: {
        children: true,
        features: {
          include: {
            feature: true,
          },
        },
      },
    });
  }

  findByCode(code: string) {
    return this.prisma.module.findUnique({
      where: { code },
    });
  }

  findAll() {
    return this.prisma.module.findMany({
      orderBy: {
        sortOrder: 'asc',
      },

      include: {
        children: true,
      },
    });
  }

  update(
    id: string,
    data: Partial<{
      name: string;
      route: string;
      icon: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.module.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.module.delete({
      where: { id },
    });
  }

  attachFeature(
    moduleId: string,
    featureId: string,
  ) {
    return this.prisma.moduleFeature.create({
      data: {
        moduleId,
        featureId,
      },
    });
  }
}