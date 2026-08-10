import { DAY_OF_WEEK_MAP } from '../constants/doctors.constants';

export class AvailabilityResponseDto {
  id!: string;
  dayOfWeek!: number;
  dayName!: string;
  isActive!: boolean;
  startTime!: string;
  endTime!: string;
  breakStartTime!: string | null;
  breakEndTime!: string | null;
  workingHours!: number;
}

export class LeaveBlockResponseDto {
  id!: string;
  blockDate!: string;
  startTime!: string | null;
  endTime!: string | null;
  isFullDay!: boolean;
  reason!: string | null;
  createdAt!: Date;
}

export class DoctorProfileResponseDto {
  id!: string;
  hospitalUserId!: string;

  // User info
  firstName!: string;
  lastName!: string | null;
  fullName!: string;
  email!: string;
  mobile!: string | null;

  // Professional details
  specialization!: string;
  qualifications!: string | null;
  consultationFee!: number;
  slotDurationMins!: number;
  bufferTimeMins!: number;
  maxPatientsPerDay!: number | null;
  isActive!: boolean;

  // Availability (7 days)
  availability!: AvailabilityResponseDto[];

  // Upcoming leaves
  upcomingLeaves!: LeaveBlockResponseDto[];

  createdAt?: Date;
  updatedAt!: Date;

  static fromEntity(entity: any): DoctorProfileResponseDto {
    const dto = new DoctorProfileResponseDto();
    const user = entity.hospitalUser;

    dto.id = entity.id;
    dto.hospitalUserId = entity.hospitalUserId;
    dto.firstName = user?.firstName ?? '';
    dto.lastName = user?.lastName ?? null;
    dto.fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    dto.email = user?.email ?? '';
    dto.mobile = user?.mobile ?? null;

    dto.specialization = entity.specialization;
    dto.qualifications = entity.qualifications;
    dto.consultationFee = Number(entity.consultationFee);
    dto.slotDurationMins = entity.slotDurationMins;
    dto.bufferTimeMins = entity.bufferTimeMins;
    dto.maxPatientsPerDay = entity.maxPatientsPerDay;
    dto.isActive = entity.isActive;

    dto.availability = (entity.availabilities ?? []).map((a: any) =>
      DoctorProfileResponseDto.mapAvailability(a),
    );

    dto.upcomingLeaves = (entity.leaveBlocks ?? []).map((l: any) =>
      DoctorProfileResponseDto.mapLeaveBlock(l),
    );

    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    return dto;
  }

  static mapAvailability(a: any): AvailabilityResponseDto {
    return {
      id: a.id,
      dayOfWeek: a.dayOfWeek,
      dayName: DAY_OF_WEEK_MAP[a.dayOfWeek],
      isActive: a.isActive,
      startTime: a.startTime,
      endTime: a.endTime,
      breakStartTime: a.breakStartTime,
      breakEndTime: a.breakEndTime,
      workingHours: DoctorProfileResponseDto.calculateHours(
        a.startTime,
        a.endTime,
        a.breakStartTime,
        a.breakEndTime,
      ),
    };
  }

  static mapLeaveBlock(l: any): LeaveBlockResponseDto {
    return {
      id: l.id,
      blockDate: new Date(l.blockDate).toISOString().split('T')[0],
      startTime: l.startTime,
      endTime: l.endTime,
      isFullDay: !l.startTime,
      reason: l.reason,
      createdAt: l.createdAt,
    };
  }

  static calculateHours(
    startTime: string,
    endTime: string,
    breakStart?: string | null,
    breakEnd?: string | null,
  ): number {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    let totalMins = toMins(endTime) - toMins(startTime);

    if (breakStart && breakEnd) {
      totalMins -= toMins(breakEnd) - toMins(breakStart);
    }

    return Math.round((totalMins / 60) * 10) / 10;
  }
}

export class DoctorListResponseDto {
  data!: DoctorProfileResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}