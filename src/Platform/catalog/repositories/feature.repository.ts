import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class FeatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; code: string; description?: string }) {
    return this.prisma.feature.create({ data });
  }

  findById(id: number) {
    return this.prisma.feature.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.feature.findUnique({ where: { code } });
  }

  findAll() {
    return this.prisma.feature.findMany({ orderBy: { name: 'asc' } });
  }

  // Feature <-> Module is many-to-many through ModuleFeature, so parent
  // modules come back as a list rather than a single `module` relation.
  findAllWithModules() {
    return this.prisma.feature.findMany({
      include: { modules: { include: { module: true } } },
      orderBy: { name: 'asc' },
    });
  }

  update(id: number, data: Partial<{ name: string; description: string }>) {
    return this.prisma.feature.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.feature.delete({ where: { id } });
  }
}