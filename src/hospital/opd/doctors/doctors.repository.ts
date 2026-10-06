import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const doctorWithRelations = {
  hospitalUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
      status: true,
    },
  },
  specializationRef: {
    select: { id: true, name: true, clinicalDepartment: { select: { id: true, name: true } } },
  },
  visitConfig: true,
  availabilities: {
    orderBy: { dayOfWeek: 'asc' as const },
  },
  leaveBlocks: {
    where: {
      blockDate: { gte: new Date() },
    },
    orderBy: { blockDate: 'asc' as const },
    take: 10,
  },
};

@Injectable()
export class DoctorsRepository {
  private readonly logger = new Logger(DoctorsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE DOCTOR PROFILE ──────────────────────────────────────
  async create(data: {
    tenantId: string;
    hospitalUserId: string;
    specialization: string;
    specializationId?: string;
    qualifications?: string;
    title?: string;
    degree?: string;
    designation?: string;
    medicalRegNo?: string;
    consultationFee: number;
    doctorType?: any;
    doctorShare?: number;
    discountApplicable?: boolean;
    emergencyAvailable?: boolean;
    digitalSignatureUrl?: string;
    prescriptionHeader1?: string;
    prescriptionHeader2?: string;
    taxPin?: string;
    slotDurationMins?: number;
    bufferTimeMins?: number;
    maxPatientsPerDay?: number;
    maxPatientsPerSlot?: number;
    isActive?: boolean;
  }) {
    return this.prisma.doctorProfile.create({
      data: {
        tenantId: data.tenantId,
        hospitalUserId: data.hospitalUserId,
        specialization: data.specialization,
        specializationId: data.specializationId,
        qualifications: data.qualifications,
        title: data.title,
        degree: data.degree,
        designation: data.designation,
        medicalRegNo: data.medicalRegNo,
        consultationFee: data.consultationFee,
        doctorType: data.doctorType ?? 'FULL_TIME',
        doctorShare: data.doctorShare,
        discountApplicable: data.discountApplicable ?? true,
        emergencyAvailable: data.emergencyAvailable ?? false,
        digitalSignatureUrl: data.digitalSignatureUrl,
        prescriptionHeader1: data.prescriptionHeader1,
        prescriptionHeader2: data.prescriptionHeader2,
        taxPin: data.taxPin,
        slotDurationMins: data.slotDurationMins ?? 15,
        bufferTimeMins: data.bufferTimeMins ?? 0,
        maxPatientsPerDay: data.maxPatientsPerDay,
        maxPatientsPerSlot: data.maxPatientsPerSlot,
        isActive: data.isActive ?? true,
      },
      include: doctorWithRelations,
    });
  }

  // ─── FIND BY ID ─────────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id, tenantId },
      include: doctorWithRelations,
    });
  }

  // ─── FIND BY USER ID ────────────────────────────────────────────
  async findByUserId(tenantId: string, hospitalUserId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { tenantId, hospitalUserId },
      include: doctorWithRelations,
    });
  }

  // ─── LIST DOCTORS ───────────────────────────────────────────────
  async findMany(
    tenantId: string,
    filter: {
      search?: string;
      specialization?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const where: Prisma.DoctorProfileWhereInput = { tenantId };

    if (filter.specialization) {
      where.specialization = { contains: filter.specialization, mode: 'insensitive' };
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.search) {
      where.OR = [
        { specialization: { contains: filter.search, mode: 'insensitive' } },
        {
          hospitalUser: {
            OR: [
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [doctors, total] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        include: doctorWithRelations,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return { doctors, total };
  }

  // ─── UPDATE DOCTOR PROFILE ──────────────────────────────────────
  async update(id: string, data: Record<string, any>, tenantId?: string) {
    return this.prisma.doctorProfile.update({
      where: tenantId ? { tenantId_id: { id, tenantId } } : { id },
      data,
      include: doctorWithRelations,
    });
  }

  // ─── UPSERT OPD VISIT CONFIG ────────────────────────────────────
  async upsertVisitConfig(
    tenantId: string,
    doctorProfileId: string,
    data: {
      freeFollowupDays?: number;
      maxFreeVisits?: number;
      revisitChargePercent?: number;
      validityAfterPrescription?: number | null;
    },
  ) {
    const existing = await this.prisma.opdVisitConfig.findFirst({
      where: { tenantId, doctorProfileId },
    });

    if (existing) {
      return this.prisma.opdVisitConfig.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.opdVisitConfig.create({
      data: {
        tenantId,
        doctorProfileId,
        freeFollowupDays: data.freeFollowupDays ?? 0,
        maxFreeVisits: data.maxFreeVisits ?? 0,
        revisitChargePercent: data.revisitChargePercent ?? 100,
        validityAfterPrescription: data.validityAfterPrescription ?? null,
      },
    });
  }

  async getVisitConfig(tenantId: string, doctorProfileId: string) {
    return this.prisma.opdVisitConfig.findFirst({
      where: { tenantId, doctorProfileId },
    });
  }

  // ─── HOSPITAL USER ──────────────────────────────────────────────
  async getHospitalUser(tenantId: string, userId: string) {
    return this.prisma.hospitalUser.findFirst({
      where: { id: userId, tenantId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  AVAILABILITY
  // ═══════════════════════════════════════════════════════════════

  // ─── SET WEEKLY AVAILABILITY (Bulk Upsert) ─────────────────────
  async setAvailability(
    tenantId: string,
    doctorProfileId: string,
    schedule: Array<{
      dayOfWeek: number;
      isActive: boolean;
      startTime?: string;
      endTime?: string;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Delete all existing availability for this doctor
      await tx.doctorAvailability.deleteMany({
        where: { doctorProfileId, tenantId },
      });

      // Insert new schedule
      const activeSchedule = schedule.filter((s) => s.isActive && s.startTime && s.endTime);

      if (activeSchedule.length > 0) {
        await tx.doctorAvailability.createMany({
          data: activeSchedule.map((s) => ({
            tenantId,
            doctorProfileId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime!,
            endTime: s.endTime!,
         
            isActive: true,
          })),
        });
      }

      // Return updated doctor with availability
      return tx.doctorProfile.findFirst({
        where: { id: doctorProfileId, tenantId },
        include: doctorWithRelations,
      });
    });
  }

  // ─── GET AVAILABILITY ───────────────────────────────────────────
  async getAvailability(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorAvailability.findMany({
      where: { tenantId, doctorProfileId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LEAVE BLOCKS
  // ═══════════════════════════════════════════════════════════════

  // ─── CREATE LEAVE BLOCK ─────────────────────────────────────────
  async createLeaveBlock(data: {
    tenantId: string;
    doctorProfileId: string;
    blockDate: Date;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }) {
    return this.prisma.doctorLeaveBlock.create({
      data: {
        tenantId: data.tenantId,
        doctorProfileId: data.doctorProfileId,
        blockDate: data.blockDate,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
      },
    });
  }

  // ─── GET LEAVE BY DATE ──────────────────────────────────────────
  async getLeaveByDate(tenantId: string, doctorProfileId: string, date: Date) {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    return this.prisma.doctorLeaveBlock.findFirst({
      where: { tenantId, doctorProfileId, blockDate: dateOnly },
    });
  }

  // ─── FIND LEAVE BY ID ───────────────────────────────────────────
  async findLeaveById(tenantId: string, leaveId: string) {
    return this.prisma.doctorLeaveBlock.findFirst({
      where: { id: leaveId, tenantId },
    });
  }

  // ─── LIST LEAVES ────────────────────────────────────────────────
  async listLeaves(
    tenantId: string,
    doctorProfileId: string,
    filter: {
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: Prisma.DoctorLeaveBlockWhereInput = {
      tenantId,
      doctorProfileId,
    };

    if (filter.fromDate || filter.toDate) {
      where.blockDate = {};
      if (filter.fromDate) where.blockDate.gte = new Date(filter.fromDate);
      if (filter.toDate) where.blockDate.lte = new Date(filter.toDate);
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [leaves, total] = await Promise.all([
      this.prisma.doctorLeaveBlock.findMany({
        where,
        orderBy: { blockDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.doctorLeaveBlock.count({ where }),
    ]);

    return { leaves, total };
  }

  // ─── DELETE LEAVE ───────────────────────────────────────────────
  async deleteLeave(leaveId: string) {
    return this.prisma.doctorLeaveBlock.delete({
      where: { id: leaveId },
    });
  }
}