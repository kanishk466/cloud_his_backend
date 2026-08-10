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
    qualifications?: string;
    consultationFee: number;
    slotDurationMins?: number;
    bufferTimeMins?: number;
    maxPatientsPerDay?: number;
    isActive?: boolean;
  }) {
    return this.prisma.doctorProfile.create({
      data: {
        tenantId: data.tenantId,
        hospitalUserId: data.hospitalUserId,
        specialization: data.specialization,
        qualifications: data.qualifications,
        consultationFee: data.consultationFee,
        slotDurationMins: data.slotDurationMins ?? 15,
        bufferTimeMins: data.bufferTimeMins ?? 0,
        maxPatientsPerDay: data.maxPatientsPerDay,
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
  async update(id: string, data: Record<string, any>) {
    return this.prisma.doctorProfile.update({
      where: { id },
      data,
      include: doctorWithRelations,
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
      breakStartTime?: string;
      breakEndTime?: string;
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
            breakStartTime: s.breakStartTime,
            breakEndTime: s.breakEndTime,
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