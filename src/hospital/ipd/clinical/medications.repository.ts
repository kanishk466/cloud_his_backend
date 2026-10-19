import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateMedicationDto } from './dto/create-medication.dto';

@Injectable()
export class MedicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tenantId: string,
    admissionId: string,
    orderedBy: string,
    dto: CreateMedicationDto,
  ) {
    return this.prisma.ipdMedicationOrder.create({
      data: {
        tenantId,
        admissionId,
        orderedBy,
        drugName: dto.drugName,
        dose: dto.dose,
        route: dto.route ?? 'ORAL',
        frequency: dto.frequency ?? 'OD',
        startDate: dto.startDate,
        endDate: dto.endDate,
        notes: dto.notes,
      },
    });
  }

  list(tenantId: string, admissionId: string, status?: string) {
    return this.prisma.ipdMedicationOrder.findMany({
      where: {
        tenantId,
        admissionId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.ipdMedicationOrder.findFirst({
      where: { id, tenantId },
    });
  }

  stop(
    tenantId: string,
    id: string,
    stoppedBy: string,
    reason: string | undefined,
  ) {
    const now = new Date();
    return this.prisma.ipdMedicationOrder.update({
      where: { id, tenantId },
      data: {
        status: 'STOPPED',
        stoppedAt: now,
        stoppedBy,
        stopReason: reason ?? null,
        endDate: now,
      },
    });
  }
}
