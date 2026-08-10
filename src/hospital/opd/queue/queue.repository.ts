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
      return await this.prisma.$transaction(async (tx) => {
        const dateStr = format(tokenDate, 'yyyy-MM-dd');

        // Lock and get the highest token number
        const result = await tx.$queryRaw<{ token_number: number }[]>`
          SELECT token_number
          FROM opd_tokens
          WHERE tenant_id = ${tenantId}
            AND doctor_profile_id = ${doctorProfileId}
            AND token_date = ${dateStr}::date
          ORDER BY token_number DESC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastToken = result[0]?.token_number ?? 0;
        return lastToken + 1;
      });
    } catch (error) {
      this.logger.error('Token number generation failed', error);
      throw new InternalServerErrorException({
        code: 'OPD_QUE_000',
        message: 'Failed to generate token number',
      });
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
      where: { id, tenantId },
      include: tokenWithDetails,
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
  // Main query: get all tokens for a doctor on a date
  async getDoctorQueue(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
    status?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const where: Prisma.OpdTokenWhereInput = {
      tenantId,
      doctorProfileId,
      tokenDate: dateOnly,
    };

    if (status) {
      where.status = status as any;
    }

    const skip = (page - 1) * limit;

    const [tokens, total] = await Promise.all([
      this.prisma.opdToken.findMany({
        where,
        include: tokenWithDetails,
        orderBy: [
          // Emergency/urgent first (via appointment priority)
          { appointment: { priority: 'desc' } },
          // Then by token number
          { tokenNumber: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.opdToken.count({ where }),
    ]);

    return { tokens, total };
  }

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

    // Calculate average wait time (calledAt - createdAt) for completed tokens
    const avgWaitResult = await this.prisma.$queryRaw<
      { avg_wait_mins: number | null }[]
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM (called_at - created_at)) / 60
      )::numeric(10,1) as avg_wait_mins
      FROM opd_tokens
      WHERE tenant_id = ${tenantId}
        AND doctor_profile_id = ${doctorProfileId}
        AND token_date = ${format(dateOnly, 'yyyy-MM-dd')}::date
        AND called_at IS NOT NULL
        AND status IN ('IN_PROGRESS', 'COMPLETED')
    `;

    // Calculate average consultation time (completedAt - startedAt)
    const avgConsultResult = await this.prisma.$queryRaw<
      { avg_consult_mins: number | null }[]
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM (completed_at - started_at)) / 60
      )::numeric(10,1) as avg_consult_mins
      FROM opd_tokens
      WHERE tenant_id = ${tenantId}
        AND doctor_profile_id = ${doctorProfileId}
        AND token_date = ${format(dateOnly, 'yyyy-MM-dd')}::date
        AND started_at IS NOT NULL
        AND completed_at IS NOT NULL
        AND status = 'COMPLETED'
    `;

    return {
      total,
      waiting,
      inProgress,
      completed,
      skipped,
      cancelled,
      avgWaitTimeMins: avgWaitResult[0]?.avg_wait_mins
        ? Number(avgWaitResult[0].avg_wait_mins)
        : null,
      avgConsultTimeMins: avgConsultResult[0]?.avg_consult_mins
        ? Number(avgConsultResult[0].avg_consult_mins)
        : null,
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
  async getNextWaitingToken(
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
        status: 'WAITING',
      },
      orderBy: [
        { appointment: { priority: 'desc' } },
        { tokenNumber: 'asc' },
      ],
      include: tokenWithDetails,
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
}