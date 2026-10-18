import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { FilterAdmissionDto } from './dto/filter-admission.dto';

export const ADMISSION_INCLUDE = {
  patient: {
    select: {
      id: true,
      uhid: true,
      firstName: true,
      lastName: true,
      gender: true,
      mobile: true,
      dateOfBirth: true,
      ageAtRegistration: true,
      ageUnit: true,
    },
  },
  doctorProfile: {
    select: {
      id: true,
      specialization: true,
      hospitalUser: { select: { firstName: true, lastName: true } },
      clinicalDepartment: { select: { id: true, name: true } },
    },
  },
  bed: {
    select: {
      id: true,
      bedIdentifier: true,
      room: {
        select: {
          roomNumber: true,
          floor: true,
          wing: true,
          gender: true,
          roomType: {
            select: {
              id: true,
              name: true,
              code: true,
              defaultRate: true,
              nursingCharge: true,
              isDaycare: true,
              isDialysis: true,
              isEmergency: true,
            },
          },
        },
      },
    },
  },
  panel: { select: { id: true, panelCode: true, panelName: true } },
} as const;

@Injectable()
export class AdmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Admission number: IPD-{YYYY}-{00001} (TenantSequence, race-safe upsert) ─

  async generateAdmissionNo(tenantId: string): Promise<string> {
    const year = new Date().getFullYear().toString();

    const seq = await this.prisma.tenantSequence.upsert({
      where: {
        tenantId_entityType_scopeKey: {
          tenantId,
          entityType: 'IPD_ADMISSION',
          scopeKey: year,
        },
      },
      create: {
        tenantId,
        entityType: 'IPD_ADMISSION',
        scopeKey: year,
        lastValue: 1,
      },
      update: { lastValue: { increment: 1 } },
    });

    return `IPD-${year}-${String(seq.lastValue).padStart(5, '0')}`;
  }

  create(tenantId: string, admissionNo: string, dto: CreateAdmissionDto) {
    return this.prisma.ipdAdmission.create({
      data: {
        tenantId,
        admissionNo,
        patientId: dto.patientId,
        doctorProfileId: dto.doctorProfileId,
        panelId: dto.panelId ?? null,
        referDoctorId: dto.referDoctorId ?? null,
        admissionType: dto.admissionType ?? 'EMERGENCY',
        provisionalDiagnosis: dto.provisionalDiagnosis,
        reasonForAdmission: dto.reasonForAdmission,
        expectedDischargeDate: dto.expectedDischargeDate,
        advancePaid: dto.advancePaid ?? 0,
        status: 'ADMITTED',
      },
      include: ADMISSION_INCLUDE,
    });
  }

  findAll(tenantId: string, filters: FilterAdmissionDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.IpdAdmissionWhereInput = {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
      ...(filters.doctorProfileId
        ? { doctorProfileId: filters.doctorProfileId }
        : {}),
      ...(filters.panelId ? { panelId: filters.panelId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            admissionDate: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.ipdAdmission.findMany({
        where,
        include: ADMISSION_INCLUDE,
        orderBy: { admissionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ipdAdmission.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, limit }));
  }

  findActive(tenantId: string) {
    return this.prisma.ipdAdmission.findMany({
      where: {
        tenantId,
        status: { in: ['ADMITTED', 'DISCHARGE_ORDERED'] },
      },
      include: ADMISSION_INCLUDE,
      orderBy: { admissionDate: 'desc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.ipdAdmission.findFirst({
      where: { id, tenantId },
      include: ADMISSION_INCLUDE,
    });
  }

  update(
    tenantId: string,
    id: string,
    data: Prisma.IpdAdmissionUncheckedUpdateInput,
  ) {
    return this.prisma.ipdAdmission.update({
      where: { id, tenantId },
      data,
      include: ADMISSION_INCLUDE,
    });
  }

  // ─── Tenant validation helpers ──────────────────────────────────────────────

  findPatient(tenantId: string, patientId: string) {
    return this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, deletedAt: null },
      select: {
        id: true,
        gender: true,
        dateOfBirth: true,
        ageAtRegistration: true,
        ageUnit: true,
      },
    });
  }

  findDoctorProfile(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id: doctorProfileId, tenantId, isActive: true },
      select: { id: true },
    });
  }

  findPanel(tenantId: string, panelId: string) {
    return this.prisma.panel.findFirst({
      where: { id: panelId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }

  findReferDoctor(tenantId: string, referDoctorId: string) {
    return this.prisma.referDoctor.findFirst({
      where: { id: referDoctorId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  }

  /** Bed + room + current status — for assignment/transfer validation. */
  findBedWithStatus(tenantId: string, bedId: string) {
    return this.prisma.bed.findFirst({
      where: { id: bedId, tenantId, deletedAt: null, isActive: true },
      select: {
        id: true,
        bedIdentifier: true,
        room: {
          select: {
            roomNumber: true,
            gender: true,
            roomType: { select: { id: true, name: true, code: true } },
          },
        },
        statusHistory: { where: { isCurrent: true }, take: 1 },
      },
    });
  }
}
