import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PackageRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(data: {
    name: string;
    description?: string;
  }) {
    return this.prisma.package.create({
      data,
    });
  }

  findById(id: string) {
    return this.prisma.package.findUnique({
      where: { id },

      include: {
        modules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  findByName(name: string) {
    return this.prisma.package.findUnique({
      where: { name },
    });
  }

  findAll() {
    return this.prisma.package.findMany({
      include: {
        modules: {
          include: {
            module: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.package.update({
      where: { id },
      data,
    });
  }

  attachModule(
    packageId: string,
    moduleId: string,
  ) {
    return this.prisma.packageModule.create({
      data: {
        packageId,
        moduleId,
      },
    });
  }
}