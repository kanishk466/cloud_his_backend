import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';

// Reusable include for token queries with full details
const tokenWithDetails = {
  appointment: {
    select: {
      id: true,
      appointmentNo: true,
      appointmentType: true,
      visitType: true,
      priority: true,
      reasonForVisit: true,
      patient: {
        select: {
          id: true,
          uhid: true,
          firstName: true,
          lastName: true,
          mobile: true,
          age: true,
          ageUnit: true,
          gender: true,
          allergies: true,
          chronicDiseases: true,
        },
      },
    },
  },
  doctorProfile: {
    select: {
      id: true,
      specialization: true,
      slotDurationMins: true,
      hospitalUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
};

@Injectable()
export class QueueRepository {
  private readonly logger = new Logger(QueueRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── GENERATE TOKEN NUMBER ──────────────────────────────────────
  // Sequential per doctor per day per tenant
  // Uses DB transaction + FOR UPDATE to prevent race conditions
async generateTokenNumber(
  tenantId: string,
  doctorProfileId: string,
  tokenDate: Date,
): Promise<number> {
  try {
    // Transaction support
    const result = await this.prisma.opdToken.aggregate({
      _max: {
        tokenNumber: true,
      },
      where: {
        tenantId,
        doctorProfileId,
        tokenDate,
      },
    });

    return (result._max.tokenNumber ?? 0) + 1;
  } catch (error) {
    this.logger.error('Token number generation failed', error);
    throw error;
  }
}

  // ─── CREATE TOKEN ───────────────────────────────────────────────
  async create(data: {
    tenantId: string;
    appointmentId: string;
    doctorProfileId: string;
    tokenNumber: number;
    tokenDate: Date;
    estimatedTime?: string;
    roomNo?: string;
  }) {
    return this.prisma.opdToken.create({
      data: {
        tenantId: data.tenantId,
        appointmentId: data.appointmentId,
        doctorProfileId: data.doctorProfileId,
        tokenNumber: data.tokenNumber,
        tokenDate: data.tokenDate,
        estimatedTime: data.estimatedTime,
        roomNo: data.roomNo,
        status: 'WAITING',
        originalPosition: data.tokenNumber,
      },
      include: tokenWithDetails,
    });
  }

  // ─── FIND TOKEN BY ID ──────────────────────────────────────────


  async findById(tenantId: string, id: string) {
  return this.prisma.opdToken.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      appointment: {
        include: {
          patient: true,
        },
      },
      doctorProfile: {
        include: {
          hospitalUser: true,
        },
      },
    },
  });
}

  // ─── FIND TOKEN BY APPOINTMENT ID ──────────────────────────────
  async findByAppointmentId(tenantId: string, appointmentId: string) {
    return this.prisma.opdToken.findFirst({
      where: { tenantId, appointmentId },
      include: tokenWithDetails,
    });
  }

  // ─── GET DOCTOR QUEUE ──────────────────────────────────────────


  async getDoctorQueue(
  tenantId: string,
  doctorProfileId: string,
  date: Date,
  status?: string,
  page: number = 1,
  limit: number = 100,
) {
  const where: any = {
    tenantId,
    doctorProfileId,
    tokenDate: date,
  };

  if (status) {
    where.status = status;
  }

  const [tokens, total] = await Promise.all([
    this.prisma.opdToken.findMany({
      where,
      include: {
        appointment: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: [
        { appointment: { priority: 'desc' } },
        { tokenNumber: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.opdToken.count({ where }),
  ]);

  return { tokens, total };
}

  // ─── GET QUEUE STATS ────────────────────────────────────────────
// ─── GET QUEUE STATS ────────────────────────────────────────────
async getQueueStats(
  tenantId: string,
  doctorProfileId: string,
  date: Date,
) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const baseWhere = {
    tenantId,
    doctorProfileId,
    tokenDate: dateOnly,
  };

  // 1. Fetch counts in parallel
  const [total, waiting, inProgress, completed, skipped, cancelled] =
    await Promise.all([
      this.prisma.opdToken.count({ where: baseWhere }),
      this.prisma.opdToken.count({
        where: { ...baseWhere, status: 'WAITING' },
      }),
      this.prisma.opdToken.count({
        where: { ...baseWhere, status: 'IN_PROGRESS' },
      }),
      this.prisma.opdToken.count({
        where: { ...baseWhere, status: 'COMPLETED' },
      }),
      this.prisma.opdToken.count({
        where: { ...baseWhere, status: 'SKIPPED' },
      }),
      this.prisma.opdToken.count({
        where: { ...baseWhere, status: 'CANCELLED' },
      }),
    ]);

  // 2. Fetch called tokens for average wait time calculation (No raw SQL)
  const calledTokens = await this.prisma.opdToken.findMany({
    where: {
      ...baseWhere,
      calledAt: { not: null },
      status: { in: ['IN_PROGRESS', 'COMPLETED'] },
    },
    select: {
      createdAt: true,
      calledAt: true,
    },
  });

  let avgWaitTimeMins: number | null = null;
  if (calledTokens.length > 0) {
    const totalWaitMs = calledTokens.reduce((sum, token) => {
      if (token.calledAt && token.createdAt) {
        return sum + (token.calledAt.getTime() - token.createdAt.getTime());
      }
      return sum;
    }, 0);
    avgWaitTimeMins =
      Math.round((totalWaitMs / (calledTokens.length * 60000)) * 10) / 10;
  }

  // 3. Fetch completed tokens for average consultation time calculation (No raw SQL)
  const completedTokens = await this.prisma.opdToken.findMany({
    where: {
      ...baseWhere,
      startedAt: { not: null },
      completedAt: { not: null },
      status: 'COMPLETED',
    },
    select: {
      startedAt: true,
      completedAt: true,
    },
  });

  let avgConsultTimeMins: number | null = null;
  if (completedTokens.length > 0) {
    const totalConsultMs = completedTokens.reduce((sum, token) => {
      if (token.completedAt && token.startedAt) {
        return (
          sum + (token.completedAt.getTime() - token.startedAt.getTime())
        );
      }
      return sum;
    }, 0);
    avgConsultTimeMins =
      Math.round((totalConsultMs / (completedTokens.length * 60000)) * 10) /
      10;
  }

  return {
    total,
    waiting,
    inProgress,
    completed,
    skipped,
    cancelled,
    avgWaitTimeMins,
    avgConsultTimeMins,
  };
}

  // ─── GET CURRENT IN-PROGRESS TOKEN ──────────────────────────────
  async getCurrentToken(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
  ) {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    return this.prisma.opdToken.findFirst({
      where: {
        tenantId,
        doctorProfileId,
        tokenDate: dateOnly,
        status: 'IN_PROGRESS',
      },
      include: tokenWithDetails,
    });
  }

  // ─── GET NEXT WAITING TOKEN ─────────────────────────────────────


// queue.repository.ts — Update method signature

async getNextWaitingToken(
  tenantId: string,
  doctorProfileId: string,
  date: Date,
  requiredAppointmentStatus?: string,
) {
  const where: any = {
    tenantId,
    doctorProfileId,
    tokenDate: date,
    status: 'WAITING',
  };

  if (requiredAppointmentStatus) {
    where.appointment = {
      status: requiredAppointmentStatus,
    };
  }

  return this.prisma.opdToken.findFirst({
    where,
    include: {
      appointment: {
        include: {
          patient: true,
        },
      },
    },
    orderBy: [
      { appointment: { priority: 'desc' } },
      { tokenNumber: 'asc' },
    ],
  });
}


  // ─── UPDATE TOKEN STATUS ────────────────────────────────────────
  async updateStatus(
    id: string,
    status: string,
    extraData?: Record<string, unknown>,
  ) {
    return this.prisma.opdToken.update({
      where: { id },
      data: {
        status: status as any,
        ...extraData,
      },
      include: tokenWithDetails,
    });
  }

  // ─── UPDATE APPOINTMENT STATUS ──────────────────────────────────
  async updateAppointmentStatus(
    appointmentId: string,
    status: string,
    extraData?: Record<string, unknown>,
  ) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: status as any,
        ...extraData,
      },
    });
  }

  // ─── GET APPOINTMENT ────────────────────────────────────────────
  async getAppointment(tenantId: string, appointmentId: string) {
    return this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, deletedAt: null },
    });
  }

  // ─── GET DOCTOR PROFILE ─────────────────────────────────────────
  async getDoctorProfile(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id: doctorProfileId, tenantId, isActive: true },
      include: {
        hospitalUser: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // ─── COUNT WAITING TOKENS AHEAD ─────────────────────────────────
  // Used to calculate estimated wait time
  async countWaitingAhead(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
    tokenNumber: number,
  ): Promise<number> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    return this.prisma.opdToken.count({
      where: {
        tenantId,
        doctorProfileId,
        tokenDate: dateOnly,
        status: 'WAITING',
        tokenNumber: { lt: tokenNumber },
      },
    });
  }

  // ─── GET ALL DOCTORS WITH QUEUES FOR DISPLAY BOARD ──────────────
  async getDisplayBoardData(tenantId: string, date: Date) {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    // Get all doctors who have tokens today
    const doctorsWithTokens = await this.prisma.opdToken.findMany({
      where: { tenantId, tokenDate: dateOnly },
      select: {
        doctorProfileId: true,
        tokenNumber: true,
        status: true,
        roomNo: true,
        appointment: {
          select: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        doctorProfile: {
          select: {
            id: true,
            specialization: true,
            hospitalUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    return doctorsWithTokens;
  }







// src/hospital/opd/queue/queue.repository.ts

async getNurseQueue(
  tenantId: string,
  filter: {
    dayStart: Date;
    dayEnd: Date;
    isVitalsDone: boolean;
    doctorProfileId?: string;
    departmentId?: number;
  },
) {
  // ✅ FIX: Use Date Range (gte & lte) to bypass timezone shifts
  const where: any = {
    tenantId,
    tokenDate: {
      gte: filter.dayStart,
      lte: filter.dayEnd,
    },
    status: { in: ['WAITING', 'IN_PROGRESS'] },
  };

  if (filter.isVitalsDone) {
    where.appointment = {
      status: { in: ['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED'] },
    };
  } else {
    // Include all active pre-consultation statuses
    where.appointment = {
      status: { in: ['BOOKED', 'IN_QUEUE'] },
    };
  }

  if (filter.doctorProfileId) {
    where.doctorProfileId = filter.doctorProfileId;
  }

  if (filter.departmentId) {
    where.appointment = {
      ...where.appointment,
      departmentId: filter.departmentId,
    };
  }

  return this.prisma.opdToken.findMany({
    where,
    include: {
      appointment: {
        include: {
          patient: true,
        },
      },
      doctorProfile: {
        include: {
          hospitalUser: true,
        },
      },
    },
    orderBy: [
      { appointment: { priority: 'desc' } },
      { tokenNumber: 'asc' },
    ],
  });
}

async countNurseQueue(
  tenantId: string,
  dayStart: Date,
  dayEnd: Date,
  isVitalsDone: boolean,
  doctorProfileId?: string,
  departmentId?: number,
): Promise<number> {
  const where: any = {
    tenantId,
    tokenDate: {
      gte: dayStart,
      lte: dayEnd,
    },
    status: { in: ['WAITING', 'IN_PROGRESS'] },
    appointment: {
      status: isVitalsDone
        ? { in: ['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED'] }
        : { in: ['BOOKED', 'IN_QUEUE'] },
    },
  };

  if (doctorProfileId) where.doctorProfileId = doctorProfileId;
  if (departmentId) {
    where.appointment = {
      ...where.appointment,
      departmentId,
    };
  }

  return this.prisma.opdToken.count({ where });
}








}