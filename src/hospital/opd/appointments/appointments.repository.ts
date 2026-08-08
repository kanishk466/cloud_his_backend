import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { APPOINTMENT_NO_CONFIG } from './constants/appointments.constants';
import { format } from 'date-fns';

export interface CreateAppointmentData {
  tenantId: string;
  appointmentNo: string;
  patientId: string;
  doctorProfileId: string;
  departmentId?: number;
  appointmentDate: Date;
  slotStartTime?: string;
  slotEndTime?: string;
  appointmentType: string;
  visitType: string;
  priority: number;
  consultationFee: number;
  referredByDoctorName?: string;
  referralNote?: string;
  reasonForVisit?: string;
  notes?: string;
  bookedBy?: string;
}

export interface ListAppointmentsFilter {
  date?: string;
  doctorProfileId?: string;
  patientId?: string;
  status?: string;
  appointmentType?: string;
  departmentId?: number;
  page?: number;
  limit?: number;
}

// Full appointment with relations — used internally
const appointmentWithRelations = {
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
  doctorProfile: {
    select: {
      id: true,
      specialization: true,
      consultationFee: true,
      slotDurationMins: true,
      hospitalUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  department: {
    select: { id: true, name: true },
  },
  token: {
    select: {
      tokenNumber: true,
      status: true,
      estimatedTime: true,
      roomNo: true,
    },
  },
};

@Injectable()
export class AppointmentsRepository {
  private readonly logger = new Logger(AppointmentsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── GENERATE APPOINTMENT NUMBER ────────────────────────────────
  // Format : APT-20250610-0001
  // Resets : Daily per tenant
  // Safe   : DB transaction prevents duplicates
  async generateAppointmentNo(tenantId: string): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const today = format(new Date(), 'yyyyMMdd');
        const prefix = `${APPOINTMENT_NO_CONFIG.PREFIX}-${today}-`;

        const result = await tx.$queryRaw<
          { appointment_no: string }[]
        >`
          SELECT appointment_no
          FROM appointments
          WHERE tenant_id = ${tenantId}
            AND appointment_no LIKE ${`${prefix}%`}
          ORDER BY appointment_no DESC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastNo = result[0]?.appointment_no;
        let sequence = 1;

        if (lastNo) {
          const parts = lastNo.split('-');
          sequence =
            parseInt(parts[parts.length - 1], 10) + 1;
        }

        const paddedSeq = sequence
          .toString()
          .padStart(APPOINTMENT_NO_CONFIG.SEQUENCE_LENGTH, '0');

        return `${prefix}${paddedSeq}`;
        // Output: APT-20250610-0001
      });
    } catch (error) {
      this.logger.error('Appointment number generation failed', error);
      throw new InternalServerErrorException({
        code: 'OPD_APT_000',
        message: 'Failed to generate appointment number',
      });
    }
  }

  // ─── CREATE APPOINTMENT ─────────────────────────────────────────
  async create(data: CreateAppointmentData) {
    return this.prisma.appointment.create({
      data: {
        tenantId: data.tenantId,
        appointmentNo: data.appointmentNo,
        patientId: data.patientId,
        doctorProfileId: data.doctorProfileId,
        departmentId: data.departmentId,
        appointmentDate: data.appointmentDate,
        slotStartTime: data.slotStartTime,
        slotEndTime: data.slotEndTime,
        appointmentType: data.appointmentType as any,
        visitType: data.visitType as any,
        priority: data.priority,
        consultationFee: data.consultationFee,
        referredByDoctorName: data.referredByDoctorName,
        referralNote: data.referralNote,
        reasonForVisit: data.reasonForVisit,
        notes: data.notes,
        bookedBy: data.bookedBy,
        status: 'BOOKED',
      },
      include: appointmentWithRelations,
    });
  }

  // ─── FIND BY ID ──────────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    return this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: appointmentWithRelations,
    });
  }

  // ─── FIND BY APPOINTMENT NUMBER ─────────────────────────────────
  async findByAppointmentNo(
    tenantId: string,
    appointmentNo: string,
  ) {
    return this.prisma.appointment.findFirst({
      where: { tenantId, appointmentNo },
      include: appointmentWithRelations,
    });
  }

  // ─── LIST APPOINTMENTS ──────────────────────────────────────────
  async findMany(tenantId: string, filter: ListAppointmentsFilter) {
    const {
      date,
      doctorProfileId,
      patientId,
      status,
      appointmentType,
      departmentId,
      page = 1,
      limit = 20,
    } = filter;

    const where: Prisma.AppointmentWhereInput = {
      tenantId, // ALWAYS tenant-scoped
      deletedAt: null,
    };

    if (date) {
      // Filter exact date
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.appointmentDate = { gte: start, lte: end };
    }

    if (doctorProfileId) {
      where.doctorProfileId = doctorProfileId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status as any;
    }

    if (appointmentType) {
      where.appointmentType = appointmentType as any;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: appointmentWithRelations,
        orderBy: [
          { priority: 'desc' },       // Emergency first
          { appointmentDate: 'asc' },
          { slotStartTime: 'asc' },   // Earlier slots first
          { bookedAt: 'asc' },        // Walk-ins: first come first
        ],
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { appointments, total };
  }

  // ─── COUNT TODAY'S APPOINTMENTS FOR DOCTOR ──────────────────────
  // Used for maxPatientsPerDay check
  async countTodayAppointments(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
  ): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.prisma.appointment.count({
      where: {
        tenantId,
        doctorProfileId,
        appointmentDate: { gte: start, lte: end },
        status: {
          // Count active appointments only
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });
  }

  // ─── CHECK SLOT AVAILABILITY ─────────────────────────────────────
  // Returns true if slot is taken
  async isSlotTaken(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
    slotStartTime: string,
  ): Promise<boolean> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const existing = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        doctorProfileId,
        appointmentDate: { gte: start, lte: end },
        slotStartTime,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });

    return !!existing;
  }

  // ─── GET BOOKED SLOTS FOR A DOCTOR ON A DATE ────────────────────
  async getBookedSlots(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
  ): Promise<string[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        doctorProfileId,
        appointmentDate: { gte: start, lte: end },
        slotStartTime: { not: null },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { slotStartTime: true },
    });

    return appointments
      .map((a) => a.slotStartTime)
      .filter((s): s is string => s !== null);
  }

  // ─── UPDATE STATUS ───────────────────────────────────────────────
  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    extraData?: Record<string, unknown>,
  ) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: status as any,
        ...extraData,
      },
      include: appointmentWithRelations,
    });
  }

  // ─── SOFT DELETE (cancel) ────────────────────────────────────────
  async cancel(
    tenantId: string,
    id: string,
    cancelReason: string,
    cancelledBy: string,
  ) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason,
        cancelledBy,
        cancelledAt: new Date(),
      },
      include: appointmentWithRelations,
    });
  }

  // ─── GET DOCTOR AVAILABILITY FOR DATE ───────────────────────────
  async getDoctorAvailability(
    tenantId: string,
    doctorProfileId: string,
    dayOfWeek: number,
  ) {
    return this.prisma.doctorAvailability.findFirst({
      where: {
        tenantId,
        doctorProfileId,
        dayOfWeek,
        isActive: true,
      },
    });
  }

  // ─── CHECK DOCTOR LEAVE ──────────────────────────────────────────
  async getDoctorLeave(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
  ) {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    return this.prisma.doctorLeaveBlock.findFirst({
      where: {
        tenantId,
        doctorProfileId,
        blockDate: dateOnly,
      },
    });
  }

  // ─── GET DOCTOR PROFILE ──────────────────────────────────────────
  async getDoctorProfile(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: {
        id: doctorProfileId,
        tenantId,
        isActive: true,
      },
      include: {
        hospitalUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // ─── GET PATIENT ─────────────────────────────────────────────────
  async getPatient(tenantId: string, patientId: string) {
    return this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, deletedAt: null },
    });
  }

  // ─── GET DEPARTMENT ──────────────────────────────────────────────
  async getDepartment(tenantId: string, departmentId: number) {
    return this.prisma.department.findFirst({
      where: { id: departmentId, tenantId, isActive: true },
    });
  }

  // ─── MARK NO-SHOWS (called by cron job) ─────────────────────────
  // Appointments that are still BOOKED/CHECKED_IN at end of day
  async markNoShows(tenantId: string, date: Date): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const result = await this.prisma.appointment.updateMany({
      where: {
        tenantId,
        appointmentDate: { gte: start, lte: end },
        status: { in: ['BOOKED', 'CHECKED_IN'] },
      },
      data: { status: 'NO_SHOW' },
    });

    return result.count;
  }
}