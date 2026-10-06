import { DAY_OF_WEEK_MAP } from '../constants/doctors.constants';

export class AvailabilityResponseDto {
  id!: string;
  dayOfWeek!: number;
  dayName!: string;
  isActive!: boolean;
  startTime!: string;
  endTime!: string;
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
  specializationId!: string | null;
  qualifications!: string | null;
  title!: string | null;
  degree!: string | null;
  designation!: string | null;
  medicalRegNo!: string | null;
  doctorType!: string;
  doctorShare!: number | null;
  discountApplicable!: boolean;
  emergencyAvailable!: boolean;
  digitalSignatureUrl!: string | null;
  prescriptionHeader1!: string | null;
  prescriptionHeader2!: string | null;
  taxPin!: string | null;
  consultationFee!: number;
  slotDurationMins!: number;
  bufferTimeMins!: number;
  maxPatientsPerDay!: number | null;
  maxPatientsPerSlot!: number | null;
  isActive!: boolean;

  // OPD visit validation rules
  visitConfig!: {
    freeFollowupDays: number;
    maxFreeVisits: number;
    revisitChargePercent: number;
    validityAfterPrescription: number | null;
  } | null;

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
    dto.specializationId = entity.specializationId ?? null;
    dto.qualifications = entity.qualifications;
    dto.title = entity.title ?? null;
    dto.degree = entity.degree ?? null;
    dto.designation = entity.designation ?? null;
    dto.medicalRegNo = entity.medicalRegNo ?? null;
    dto.doctorType = entity.doctorType ?? 'FULL_TIME';
    dto.doctorShare = entity.doctorShare != null ? Number(entity.doctorShare) : null;
    dto.discountApplicable = entity.discountApplicable ?? true;
    dto.emergencyAvailable = entity.emergencyAvailable ?? false;
    dto.digitalSignatureUrl = entity.digitalSignatureUrl ?? null;
    dto.prescriptionHeader1 = entity.prescriptionHeader1 ?? null;
    dto.prescriptionHeader2 = entity.prescriptionHeader2 ?? null;
    dto.taxPin = entity.taxPin ?? null;
    dto.consultationFee = Number(entity.consultationFee);
    dto.slotDurationMins = entity.slotDurationMins;
    dto.bufferTimeMins = entity.bufferTimeMins;
    dto.maxPatientsPerDay = entity.maxPatientsPerDay;
    dto.maxPatientsPerSlot = entity.maxPatientsPerSlot ?? null;
    dto.isActive = entity.isActive;

    dto.visitConfig = entity.visitConfig
      ? {
          freeFollowupDays: entity.visitConfig.freeFollowupDays,
          maxFreeVisits: entity.visitConfig.maxFreeVisits,
          revisitChargePercent: Number(entity.visitConfig.revisitChargePercent),
          validityAfterPrescription: entity.visitConfig.validityAfterPrescription ?? null,
        }
      : null;

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