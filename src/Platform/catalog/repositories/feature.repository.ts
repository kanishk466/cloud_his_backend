import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class FeatureRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(data: {
    name: string;
    code: string;
    description?: string;
  }) {
    return this.prisma.feature.create({
      data,
    });
  }

  findById(id: string) {
    return this.prisma.feature.findUnique({
      where: { id },
    });
  }

  findByCode(code: string) {
    return this.prisma.feature.findUnique({
      where: { code },
    });
  }

  findAll() {
    return this.prisma.feature.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
    }>,
  ) {
    return this.prisma.feature.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.feature.delete({
      where: { id },
    });
  }
}