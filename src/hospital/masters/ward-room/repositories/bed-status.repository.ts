import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { BedStatusType } from '@prisma/client';

@Injectable()
export class BedStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  getCurrentStatus(tenantId: string, bedId: string) {
    return this.prisma.bedStatus.findFirst({
      where: { tenantId, bedId, isCurrent: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /** Atomic transition: close current row, open the next one. */
  async transition(
    tenantId: string,
    bedId: string,
    data: {
      status: BedStatusType;
      patientId?: string | null;
      ipdAdmissionId?: string | null;
      reservedBy?: string | null;
      reason?: string | null;
      changedBy?: string | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Close the current status row (if any)
      await tx.bedStatus.updateMany({
        where: { tenantId, bedId, isCurrent: true },
        data: { isCurrent: false, effectiveTo: now },
      });

      // Open the new current row
      return tx.bedStatus.create({
        data: {
          tenantId,
          bedId,
          status: data.status,
          patientId: data.patientId ?? null,
          ipdAdmissionId: data.ipdAdmissionId ?? null,
          reservedBy: data.reservedBy ?? null,
          reason: data.reason ?? null,
          changedBy: data.changedBy ?? null,
          isCurrent: true,
          effectiveFrom: now,
        },
      });
    });
  }

  getHistory(tenantId: string, bedId: string) {
    return this.prisma.bedStatus.findMany({
      where: { tenantId, bedId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /** Beds whose CURRENT status matches (e.g., HOUSEKEEPING worklist). */
  findCurrentByStatus(tenantId: string, status: BedStatusType) {
    return this.prisma.bedStatus.findMany({
      where: { tenantId, status, isCurrent: true },
      include: {
        bed: {
          select: {
            id: true,
            bedNumber: true,
            bedIdentifier: true,
            room: {
              select: {
                roomNumber: true,
                floor: true,
                wing: true,
                gender: true,
                roomType: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { effectiveFrom: 'asc' }, // FIFO — oldest pending first
    });
  }

  /** All beds currently occupied/reserved by a patient (for IPD flows). */
  findByPatient(tenantId: string, patientId: string) {
    return this.prisma.bedStatus.findMany({
      where: {
        tenantId,
        patientId,
        isCurrent: true,
        status: { in: ['OCCUPIED', 'RESERVED'] },
      },
      include: {
        bed: {
          select: {
            id: true,
            bedIdentifier: true,
            room: { select: { roomNumber: true } },
          },
        },
      },
    });
  }
}
