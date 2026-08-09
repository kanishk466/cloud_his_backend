import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AppointmentsRepository } from './appointments.repository';
import { PatientsRepository } from '../patients/patients.repository';
import { CreateAppointmentDto, AppointmentType } from './dto/create-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { GetSlotsDto } from './dto/get-slots.dto';
import {
  AppointmentResponseDto,
  AppointmentListResponseDto,
  AvailableSlotsResponseDto,
  SlotDto,
} from './dto/appointment-response.dto';
import {
  APPOINTMENT_ERRORS,
  CANCELLABLE_STATUSES,
  MAX_ADVANCE_BOOKING_DAYS,
} from './constants/appointments.constants';
import { addMinutes, format, getDay, isBefore, startOfDay, addDays } from 'date-fns';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly patientsRepository: PatientsRepository,
  ) {}

  // ─── BOOK APPOINTMENT ───────────────────────────────────────────
  async book(
    tenantId: string,
    bookedBy: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointmentDate = new Date(dto.appointmentDate);

    // ── Rule 1: Cannot book for past date ──────────────────────────
    const today = startOfDay(new Date());
    if (isBefore(startOfDay(appointmentDate), today)) {
      throw new BadRequestException(APPOINTMENT_ERRORS.PAST_DATE);
    }

    // ── Rule 2: Cannot book more than N days in advance ─────────────
    const maxDate = addDays(today, MAX_ADVANCE_BOOKING_DAYS);
    if (appointmentDate > maxDate) {
      throw new BadRequestException({
        code: 'OPD_APT_014',
        message: `Cannot book more than ${MAX_ADVANCE_BOOKING_DAYS} days in advance`,
      });
    }

    // ── Rule 3: Validate patient exists in same tenant ─────────────
    const patient = await this.appointmentsRepository.getPatient(
      tenantId,
      dto.patientId,
    );

    if (!patient) {
      throw new NotFoundException(APPOINTMENT_ERRORS.PATIENT_NOT_FOUND);
    }

    // ── Rule 4: Validate doctor exists and is active ────────────────
    const doctor = await this.appointmentsRepository.getDoctorProfile(
      tenantId,
      dto.doctorProfileId,
    );

    if (!doctor) {
      throw new NotFoundException(APPOINTMENT_ERRORS.DOCTOR_NOT_FOUND);
    }

    // ── Rule 5: Validate department if provided ─────────────────────
    if (dto.departmentId) {
      const dept = await this.appointmentsRepository.getDepartment(
        tenantId,
        dto.departmentId,
      );
      if (!dept) {
        throw new NotFoundException(
          APPOINTMENT_ERRORS.DEPARTMENT_NOT_FOUND,
        );
      }
    }

    // ── Rule 6: Check doctor availability for this day ─────────────
    const dayOfWeek = getDay(appointmentDate); // 0=Sun, 6=Sat
    const availability =
      await this.appointmentsRepository.getDoctorAvailability(
        tenantId,
        dto.doctorProfileId,
        dayOfWeek,
      );

    if (!availability) {
      throw new BadRequestException({
        ...APPOINTMENT_ERRORS.DOCTOR_NOT_AVAILABLE,
        details: {
          message: `Doctor is not available on ${format(appointmentDate, 'EEEE')}`,
        },
      });
    }

    // ── Rule 7: Check doctor leave ─────────────────────────────────
    const leaveBlock =
      await this.appointmentsRepository.getDoctorLeave(
        tenantId,
        dto.doctorProfileId,
        appointmentDate,
      );

    if (leaveBlock) {
      // Full day leave
      if (!leaveBlock.startTime) {
        throw new BadRequestException({
          ...APPOINTMENT_ERRORS.DOCTOR_ON_LEAVE,
          details: { reason: leaveBlock.reason },
        });
      }

      // Partial leave — check if slot falls in leave time
      if (dto.slotStartTime) {
        const slotInLeave = this.isTimeInRange(
          dto.slotStartTime,
          leaveBlock.startTime,
          leaveBlock.endTime ?? '23:59',
        );

        if (slotInLeave) {
          throw new BadRequestException({
            ...APPOINTMENT_ERRORS.DOCTOR_ON_LEAVE,
            details: {
              leaveFrom: leaveBlock.startTime,
              leaveTill: leaveBlock.endTime,
            },
          });
        }
      }
    }

    // ── Rule 8: Check max patients per day ─────────────────────────
    if (doctor.maxPatientsPerDay) {
      const count =
        await this.appointmentsRepository.countTodayAppointments(
          tenantId,
          dto.doctorProfileId,
          appointmentDate,
        );

      if (count >= doctor.maxPatientsPerDay) {
        throw new BadRequestException({
          ...APPOINTMENT_ERRORS.MAX_PATIENTS_REACHED,
          details: { max: doctor.maxPatientsPerDay, current: count },
        });
      }
    }

    // ── Rule 9: For SCHEDULED — validate and check slot ────────────
    let slotStartTime = dto.slotStartTime;
    let slotEndTime: string | undefined;

    if (dto.appointmentType === AppointmentType.SCHEDULED) {
      if (!slotStartTime) {
        throw new BadRequestException({
          code: 'OPD_APT_015',
          message: 'slotStartTime is required for SCHEDULED appointments',
        });
      }

      // Validate slot falls within availability
      const slotInRange = this.isTimeInRange(
        slotStartTime,
        availability.startTime,
        availability.endTime,
      );

      if (!slotInRange) {
        throw new BadRequestException({
          ...APPOINTMENT_ERRORS.INVALID_SLOT_TIME,
          details: {
            availableFrom: availability.startTime,
            availableTill: availability.endTime,
          },
        });
      }

      // Check if slot is already taken
      const slotTaken =
        await this.appointmentsRepository.isSlotTaken(
          tenantId,
          dto.doctorProfileId,
          appointmentDate,
          slotStartTime,
        );

      if (slotTaken) {
        throw new BadRequestException(
          APPOINTMENT_ERRORS.SLOT_ALREADY_BOOKED,
        );
      }

      // Calculate slot end time
      slotEndTime = this.addMinutesToTime(
        slotStartTime,
        doctor.slotDurationMins,
      );
    }

    // ── Rule 10: Snapshot consultation fee at booking time ─────────
    // Store fee as it was when appointment was made
    const consultationFee = Number(doctor.consultationFee);

    // ── Generate appointment number ────────────────────────────────
    const appointmentNo =
      await this.appointmentsRepository.generateAppointmentNo(
        tenantId,
      );

    this.logger.log(
      `Booking appointment ${appointmentNo} for patient ${patient.uhid}`,
    );

    // ── Create appointment ─────────────────────────────────────────
    const appointment = await this.appointmentsRepository.create({
      tenantId,
      appointmentNo,
      patientId: dto.patientId,
      doctorProfileId: dto.doctorProfileId,
      departmentId: dto.departmentId,
      appointmentDate,
      slotStartTime,
      slotEndTime,
      appointmentType: dto.appointmentType,
      visitType: dto.visitType,
      priority: dto.priority ?? 0,
      consultationFee,
      referredByDoctorName: dto.referredByDoctorName,
      referralNote: dto.referralNote,
      reasonForVisit: dto.reasonForVisit,
      notes: dto.notes,
      bookedBy,
    });

    return AppointmentResponseDto.fromEntity(appointment);
  }

  // ─── LIST APPOINTMENTS ──────────────────────────────────────────
  async findMany(
    tenantId: string,
    filter: {
      date?: string;
      doctorProfileId?: string;
      patientId?: string;
      status?: string;
      appointmentType?: string;
      departmentId?: number;
      page?: number;
      limit?: number;
    },
  ): Promise<AppointmentListResponseDto> {
    const { appointments, total } =
      await this.appointmentsRepository.findMany(tenantId, filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: appointments.map((a) =>
        AppointmentResponseDto.fromEntity(a),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── GET APPOINTMENT BY ID ──────────────────────────────────────
  async findById(
    tenantId: string,
    id: string,
  ): Promise<AppointmentResponseDto> {
    const appointment =
      await this.appointmentsRepository.findById(tenantId, id);

    if (!appointment) {
      throw new NotFoundException(APPOINTMENT_ERRORS.NOT_FOUND);
    }

    if (appointment.tenantId !== tenantId) {
      throw new ForbiddenException(APPOINTMENT_ERRORS.CROSS_TENANT);
    }

    return AppointmentResponseDto.fromEntity(appointment);
  }

  // ─── CHECK-IN PATIENT ───────────────────────────────────────────
  async checkIn(
    tenantId: string,
    id: string,
    checkedInBy: string,
  ): Promise<AppointmentResponseDto> {
    const appointment =
      await this.appointmentsRepository.findById(tenantId, id);

    if (!appointment) {
      throw new NotFoundException(APPOINTMENT_ERRORS.NOT_FOUND);
    }

    if (appointment.status !== 'BOOKED') {
      throw new BadRequestException({
        ...APPOINTMENT_ERRORS.CANNOT_CHECKIN,
        details: { currentStatus: appointment.status },
      });
    }

    const updated = await this.appointmentsRepository.updateStatus(
      tenantId,
      id,
      'CHECKED_IN',
      {
        checkedInAt: new Date(),
        checkedInBy,
      },
    );

    this.logger.log(
      `Patient checked in for appointment ${appointment.appointmentNo}`,
    );

    return AppointmentResponseDto.fromEntity(updated);
  }

  // ─── CANCEL APPOINTMENT ─────────────────────────────────────────
  async cancel(
    tenantId: string,
    id: string,
    dto: CancelAppointmentDto,
    cancelledBy: string,
  ): Promise<AppointmentResponseDto> {
    const appointment =
      await this.appointmentsRepository.findById(tenantId, id);

    if (!appointment) {
      throw new NotFoundException(APPOINTMENT_ERRORS.NOT_FOUND);
    }

    // Only BOOKED or CHECKED_IN can be cancelled
    const canCancel = CANCELLABLE_STATUSES.includes(
      appointment.status as any,
    );

    if (!canCancel) {
      throw new BadRequestException({
        ...APPOINTMENT_ERRORS.CANNOT_CANCEL,
        details: { currentStatus: appointment.status },
      });
    }

    const updated = await this.appointmentsRepository.cancel(
      tenantId,
      id,
      dto.cancelReason,
      cancelledBy,
    );

    this.logger.log(
      `Appointment ${appointment.appointmentNo} cancelled by ${cancelledBy}`,
    );

    return AppointmentResponseDto.fromEntity(updated);
  }

  // ─── GET AVAILABLE SLOTS ────────────────────────────────────────
  async getAvailableSlots(
    tenantId: string,
    dto: GetSlotsDto,
  ): Promise<AvailableSlotsResponseDto> {
    const date = new Date(dto.date);

    // Get doctor profile
    const doctor =
      await this.appointmentsRepository.getDoctorProfile(
        tenantId,
        dto.doctorProfileId,
      );

    if (!doctor) {
      throw new NotFoundException(APPOINTMENT_ERRORS.DOCTOR_NOT_FOUND);
    }

    // Get availability for this day
    const dayOfWeek = getDay(date);
    const availability =
      await this.appointmentsRepository.getDoctorAvailability(
        tenantId,
        dto.doctorProfileId,
        dayOfWeek,
      );

    if (!availability) {
      return {
        doctorProfileId: dto.doctorProfileId,
        date: dto.date,
        slotDurationMins: doctor.slotDurationMins,
        totalSlots: 0,
        availableSlots: 0,
        slots: [],
      };
    }

    // Check full-day leave
    const leaveBlock =
      await this.appointmentsRepository.getDoctorLeave(
        tenantId,
        dto.doctorProfileId,
        date,
      );

    if (leaveBlock && !leaveBlock.startTime) {
      return {
        doctorProfileId: dto.doctorProfileId,
        date: dto.date,
        slotDurationMins: doctor.slotDurationMins,
        totalSlots: 0,
        availableSlots: 0,
        slots: [],
      };
    }

    // Generate all slots
    const allSlots = this.generateSlots(
      availability.startTime,
      availability.endTime,
      doctor.slotDurationMins,
      doctor.bufferTimeMins,
       availability.breakStartTime,      // ← NEW
  availability.breakEndTime
    );

    // Get booked slots
    const bookedSlots =
      await this.appointmentsRepository.getBookedSlots(
        tenantId,
        dto.doctorProfileId,
        date,
      );

    // Map slots with availability
    const slots: SlotDto[] = allSlots.map((slot) => {
      // Check if slot falls in partial leave
      let blockedByLeave = false;
      if (leaveBlock?.startTime) {
        blockedByLeave = this.isTimeInRange(
          slot.startTime,
          leaveBlock.startTime,
          leaveBlock.endTime ?? '23:59',
        );
      }

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable:
          !bookedSlots.includes(slot.startTime) &&
          !blockedByLeave,
      };
    });

    const availableCount = slots.filter((s) => s.isAvailable).length;

    return {
      doctorProfileId: dto.doctorProfileId,
      date: dto.date,
      slotDurationMins: doctor.slotDurationMins,
      totalSlots: slots.length,
      availableSlots: availableCount,
      slots,
    };
  }

  // ─── TODAY'S APPOINTMENTS FOR DOCTOR ───────────────────────────
  // Used in Doctor Console — shows today's queue
  async getTodayAppointments(
    tenantId: string,
    doctorProfileId: string,
  ): Promise<AppointmentListResponseDto> {
    const today = format(new Date(), 'yyyy-MM-dd');

    return this.findMany(tenantId, {
      date: today,
      doctorProfileId,
      page: 1,
      limit: 100, // All of today's patients
    });
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────────

  // Generate time slots between start and end


  // Update generateSlots to skip break time
private generateSlots(
  startTime: string,
  endTime: string,
  durationMins: number,
  bufferMins: number,
  breakStartTime?: string | null,
  breakEndTime?: string | null,
): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = [];

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startTotalMins = startH * 60 + startM;
  const endTotalMins = endH * 60 + endM;
  const slotInterval = durationMins + bufferMins;

  // Calculate break time in minutes
  let breakStart = -1;
  let breakEnd = -1;
  if (breakStartTime && breakEndTime) {
    const [bsH, bsM] = breakStartTime.split(':').map(Number);
    const [beH, beM] = breakEndTime.split(':').map(Number);
    breakStart = bsH * 60 + bsM;
    breakEnd = beH * 60 + beM;
  }

  let currentMins = startTotalMins;

  while (currentMins + durationMins <= endTotalMins) {
    const slotEndMins = currentMins + durationMins;

    // Skip if slot overlaps with break time
    const overlapsBreak =
      breakStart !== -1 &&
      currentMins < breakEnd &&
      slotEndMins > breakStart;

    if (!overlapsBreak) {
      slots.push({
        startTime: this.minsToTime(currentMins),
        endTime: this.minsToTime(slotEndMins),
      });
    }

    // Jump past break if we hit it
    if (breakStart !== -1 && currentMins === breakStart) {
      currentMins = breakEnd;
    } else {
      currentMins += slotInterval;
    }
  }

  return slots;
}

  // Check if a time falls within a range
  private isTimeInRange(
    time: string,      // "10:30"
    rangeStart: string, // "10:00"
    rangeEnd: string,   // "13:00"
  ): boolean {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    return (
      toMins(time) >= toMins(rangeStart) &&
      toMins(time) < toMins(rangeEnd)
    );
  }

  // Add minutes to a time string
  private addMinutesToTime(
    time: string,     // "10:30"
    minutes: number,  // 15
  ): string {
    const [h, m] = time.split(':').map(Number);
    const totalMins = h * 60 + m + minutes;
    return this.minsToTime(totalMins);
  }

  // Convert minutes to time string
  private minsToTime(totalMins: number): string {
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}