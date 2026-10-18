import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateRoundDto } from './dto/create-round.dto';

@Injectable()
export class RoundsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tenantId: string,
    admissionId: string,
    recordedBy: string,
    dto: CreateRoundDto,
  ) {
    return this.prisma.ipdRound.create({
      data: {
        tenantId,
        admissionId,
        recordedBy,
        doctorProfileId: dto.doctorProfileId,
        roundAt: dto.roundAt,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        nextRoundAt: dto.nextRoundAt,
      },
    });
  }

  list(tenantId: string, admissionId: string, limit = 50) {
    return this.prisma.ipdRound.findMany({
      where: { tenantId, admissionId },
      orderBy: { roundAt: 'desc' },
      take: limit,
    });
  }
}
