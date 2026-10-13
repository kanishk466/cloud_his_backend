import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';

@Injectable()
export class VitalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tenantId: string,
    admissionId: string,
    recordedBy: string,
    dto: CreateVitalsDto,
  ) {
    return this.prisma.ipdVital.create({
      data: {
        tenantId,
        admissionId,
        recordedBy,
        recordedAt: dto.recordedAt,
        temperature: dto.temperature,
        pulse: dto.pulse,
        respiratoryRate: dto.respiratoryRate,
        bpSystolic: dto.bpSystolic,
        bpDiastolic: dto.bpDiastolic,
        spo2: dto.spo2,
        painScore: dto.painScore,
        notes: dto.notes,
      },
    });
  }

  list(tenantId: string, admissionId: string, limit = 50) {
    return this.prisma.ipdVital.findMany({
      where: { tenantId, admissionId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
