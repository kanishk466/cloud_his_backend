import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DoctorsRepository } from './doctors.repository';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { CreateLeaveBlockDto } from './dto/create-leave-block.dto';
import {
  DoctorProfileResponseDto,
  DoctorListResponseDto,
  LeaveBlockResponseDto,
} from './dto/doctor-response.dto';
import { DOCTOR_ERRORS } from './constants/doctors.constants';
import { startOfDay, isBefore } from 'date-fns';

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(private readonly doctorsRepository: DoctorsRepository) {}

  // ─── CREATE DOCTOR PROFILE ──────────────────────────────────────
  async createProfile(
    tenantId: string,
    dto: CreateDoctorProfileDto,
  ): Promise<DoctorProfileResponseDto> {
    // Rule 1: Validate hospital user exists
    const user = await this.doctorsRepository.getHospitalUser(tenantId, dto.hospitalUserId);
    if (!user) {
      throw new NotFoundException(DOCTOR_ERRORS.USER_NOT_FOUND);
    }

    // Rule 2: Check no existing profile
    const existing = await this.doctorsRepository.findByUserId(tenantId, dto.hospitalUserId);
    if (existing) {
      throw new ConflictException({
        ...DOCTOR_ERRORS.PROFILE_ALREADY_EXISTS,
        details: { existingProfileId: existing.id },
      });
    }

    const profile = await this.doctorsRepository.create({
      tenantId,
      hospitalUserId: dto.hospitalUserId,
      specialization: dto.specialization,
      qualifications: dto.qualifications,
      consultationFee: dto.consultationFee,
      slotDurationMins: dto.slotDurationMins,
      bufferTimeMins: dto.bufferTimeMins,
      maxPatientsPerDay: dto.maxPatientsPerDay,
      isActive: dto.isActive,
    });

    this.logger.log(`Doctor profile created for user ${dto.hospitalUserId}`);
    return DoctorProfileResponseDto.fromEntity(profile);
  }

  // ─── GET DOCTOR PROFILE BY ID ───────────────────────────────────
  async findById(tenantId: string, id: string): Promise<DoctorProfileResponseDto> {
    const profile = await this.doctorsRepository.findById(tenantId, id);
    if (!profile) {
      throw new NotFoundException(DOCTOR_ERRORS.PROFILE_NOT_FOUND);
    }
    if (profile.tenantId !== tenantId) {
      throw new ForbiddenException(DOCTOR_ERRORS.CROSS_TENANT);
    }
    return DoctorProfileResponseDto.fromEntity(profile);
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
  ): Promise<DoctorListResponseDto> {
    const { doctors, total } = await this.doctorsRepository.findMany(tenantId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: doctors.map((d) => DoctorProfileResponseDto.fromEntity(d)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── UPDATE DOCTOR PROFILE ──────────────────────────────────────
  async updateProfile(
    tenantId: string,
    id: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<DoctorProfileResponseDto> {
    const existing = await this.doctorsRepository.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(DOCTOR_ERRORS.PROFILE_NOT_FOUND);
    }

    const updated = await this.doctorsRepository.update(id, {
      specialization: dto.specialization,
      qualifications: dto.qualifications,
      consultationFee: dto.consultationFee,
      slotDurationMins: dto.slotDurationMins,
      bufferTimeMins: dto.bufferTimeMins,
      maxPatientsPerDay: dto.maxPatientsPerDay,
      isActive: dto.isActive,
    });

    return DoctorProfileResponseDto.fromEntity(updated);
  }

  // ─── SET WEEKLY AVAILABILITY ────────────────────────────────────
  async setAvailability(
    tenantId: string,
    doctorProfileId: string,
    dto: SetAvailabilityDto,
  ): Promise<DoctorProfileResponseDto> {
    // Validate doctor exists
    const doctor = await this.doctorsRepository.findById(tenantId, doctorProfileId);
    if (!doctor) {
      throw new NotFoundException(DOCTOR_ERRORS.PROFILE_NOT_FOUND);
    }

    // Validate each day's schedule
    for (const day of dto.schedule) {
      if (day.isActive) {
        if (!day.startTime || !day.endTime) {
          throw new BadRequestException({
            code: 'OPD_DOC_010',
            message: `startTime and endTime required for active day ${day.dayOfWeek}`,
          });
        }

        // Validate startTime < endTime
        if (this.timeToMins(day.startTime) >= this.timeToMins(day.endTime)) {
          throw new BadRequestException({
            ...DOCTOR_ERRORS.INVALID_TIME_RANGE,
            details: { day: day.dayOfWeek },
          });
        }

        // Validate break time
        if (day.breakStartTime && day.breakEndTime) {
          const breakStart = this.timeToMins(day.breakStartTime);
          const breakEnd = this.timeToMins(day.breakEndTime);
          const dayStart = this.timeToMins(day.startTime);
          const dayEnd = this.timeToMins(day.endTime);

          if (breakStart >= breakEnd) {
            throw new BadRequestException({
              ...DOCTOR_ERRORS.INVALID_TIME_RANGE,
              details: { day: day.dayOfWeek, field: 'break' },
            });
          }

          if (breakStart < dayStart || breakEnd > dayEnd) {
            throw new BadRequestException({
              ...DOCTOR_ERRORS.INVALID_BREAK_TIME,
              details: { day: day.dayOfWeek },
            });
          }
        }
      }
    }

    // Update slot duration if provided
    if (dto.slotDurationMins !== undefined || dto.bufferTimeMins !== undefined) {
      const updateData: Record<string, any> = {};
      if (dto.slotDurationMins !== undefined) updateData.slotDurationMins = dto.slotDurationMins;
      if (dto.bufferTimeMins !== undefined) updateData.bufferTimeMins = dto.bufferTimeMins;
      await this.doctorsRepository.update(doctorProfileId, updateData);
    }

    // Set availability (bulk upsert)
    const updated = await this.doctorsRepository.setAvailability(
      tenantId,
      doctorProfileId,
      dto.schedule,
    );

    this.logger.log(`Availability updated for doctor ${doctorProfileId}`);
    return DoctorProfileResponseDto.fromEntity(updated);
  }

  // ─── GET AVAILABILITY ───────────────────────────────────────────
  async getAvailability(tenantId: string, doctorProfileId: string) {
    const doctor = await this.doctorsRepository.findById(tenantId, doctorProfileId);
    if (!doctor) {
      throw new NotFoundException(DOCTOR_ERRORS.PROFILE_NOT_FOUND);
    }

    const availability = await this.doctorsRepository.getAvailability(tenantId, doctorProfileId);

    return {
      doctorProfileId,
      slotDurationMins: doctor.slotDurationMins,
      bufferTimeMins: doctor.bufferTimeMins,
      schedule: availability.map((a) => DoctorProfileResponseDto.mapAvailability(a)),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  LEAVE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  // ─── CREATE LEAVE BLOCK ─────────────────────────────────────────
  async createLeave(
    tenantId: string,
    doctorProfileId: string,
    dto: CreateLeaveBlockDto,
  ): Promise<LeaveBlockResponseDto> {
    // Validate doctor
    const doctor = await this.doctorsRepository.findById(tenantId, doctorProfileId);
    if (!doctor) {
      throw new NotFoundException(DOCTOR_ERRORS.PROFILE_NOT_FOUND);
    }

    const blockDate = new Date(dto.blockDate);

    // Cannot create past leave
    if (isBefore(startOfDay(blockDate), startOfDay(new Date()))) {
      throw new BadRequestException(DOCTOR_ERRORS.PAST_LEAVE_DATE);
    }

    // Check duplicate leave
    const existing = await this.doctorsRepository.getLeaveByDate(
      tenantId,
      doctorProfileId,
      blockDate,
    );
    if (existing) {
      throw new ConflictException({
        ...DOCTOR_ERRORS.DUPLICATE_LEAVE,
        details: { existingLeaveId: existing.id },
      });
    }

    // Validate time range if partial leave
    if (dto.startTime && dto.endTime) {
      if (this.timeToMins(dto.startTime) >= this.timeToMins(dto.endTime)) {
        throw new BadRequestException(DOCTOR_ERRORS.INVALID_TIME_RANGE);
      }
    }

    const leave = await this.doctorsRepository.createLeaveBlock({
      tenantId,
      doctorProfileId,
      blockDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      reason: dto.reason,
    });

    this.logger.log(`Leave created for doctor ${doctorProfileId} on ${dto.blockDate}`);
    return DoctorProfileResponseDto.mapLeaveBlock(leave);
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
    const { leaves, total } = await this.doctorsRepository.listLeaves(
      tenantId,
      doctorProfileId,
      filter,
    );

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: leaves.map((l) => DoctorProfileResponseDto.mapLeaveBlock(l)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── DELETE LEAVE ───────────────────────────────────────────────
  async deleteLeave(tenantId: string, doctorProfileId: string, leaveId: string) {
    const leave = await this.doctorsRepository.findLeaveById(tenantId, leaveId);
    if (!leave) {
      throw new NotFoundException(DOCTOR_ERRORS.LEAVE_NOT_FOUND);
    }

    if (leave.tenantId !== tenantId) {
      throw new ForbiddenException(DOCTOR_ERRORS.CROSS_TENANT);
    }

    if (leave.doctorProfileId !== doctorProfileId) {
      throw new ForbiddenException({
        code: 'OPD_DOC_011',
        message: 'Leave does not belong to this doctor',
      });
    }

    await this.doctorsRepository.deleteLeave(leaveId);
    this.logger.log(`Leave ${leaveId} deleted`);

    return { success: true, message: 'Leave deleted successfully' };
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────────
  private timeToMins(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}