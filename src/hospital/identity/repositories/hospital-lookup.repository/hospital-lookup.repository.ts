import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class HospitalLookupRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string) {
    return this.prisma.hospital.findUnique({
      where: { code },
      select: { id: true, code: true, status: true, email: true, name: true },
    });
  }
}