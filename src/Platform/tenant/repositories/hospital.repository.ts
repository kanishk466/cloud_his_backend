import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(data: {
    code: string;
    name: string;
    email: string;
    phone?: string;
  }) {
    return this.prisma.hospital.create({
      data,
    });
  }

  findById(id: string) {
    return this.prisma.hospital.findUnique({
      where: { id },

      include: {
        packages: {
          include: {
            package: true,
          },
        },
      },
    });
  }

  findByCode(code: string) {
    return this.prisma.hospital.findUnique({
      where: { code },
    });
  }

  findByEmail(email: string) {
    return this.prisma.hospital.findUnique({
      where: { email },
    });
  }

  findAll() {
    return this.prisma.hospital.findMany({
      include: {
        packages: {
          include: {
            package: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  updateStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ) {
    return this.prisma.hospital.update({
      where: { id },

      data: {
        status,
      },
    });
  }
}