export class DoctorSummaryDto {
  id!: string;
  firstName!: string;
  lastName!: string | null;
  specialization!: string;
  consultationFee!: number;
  slotDurationMins!: number;
}

export class PatientSummaryDto {
  id!: string;
  uhid!: string;
  firstName!: string;
  lastName!: string | null;
  mobile!: string;
  age!: number | null;
  ageUni!: string | null;
  gender!: string;
  allergies!: string | null;
  chronicDiseases!: string | null;
}

export class TokenSummaryDto {
  tokenNumber!: number;
  status!: string;
  estimatedTime!: string | null;
  roomNo!: string | null;
}

export class AppointmentResponseDto {
  id!: string;
  appointmentNo!: string;
  patient!: PatientSummaryDto;
  doctor!: DoctorSummaryDto;
  departmentId!: number | null;
  departmentName!: string | null;
  appointmentDate!: string;
  slotStartTime!: string | null;
  slotEndTime!: string | null;
  appointmentType!: string;
  visitType!: string;
  status!: string;
  priority!: number;
  consultationFee!: number;
  reasonForVisit!: string | null;
  notes!: string | null;
  referredByDoctorName!: string | null;
  referralNote!: string | null;
  checkedInAt!: Date | null;
  bookedAt!: Date;
  cancelledAt!: Date | null;
  cancelReason!: string | null;
  token!: TokenSummaryDto | null;

  static fromEntity(
    appointment: any,
    token?: any,
  ): AppointmentResponseDto {
    const dto = new AppointmentResponseDto();

    dto.id = appointment.id;
    dto.appointmentNo = appointment.appointmentNo;
    dto.appointmentDate = appointment.appointmentDate
      .toISOString()
      .split('T')[0];
    dto.slotStartTime = appointment.slotStartTime;
    dto.slotEndTime = appointment.slotEndTime;
    dto.appointmentType = appointment.appointmentType;
    dto.visitType = appointment.visitType;
    dto.status = appointment.status;
    dto.priority = appointment.priority;
    dto.consultationFee = Number(appointment.consultationFee);
    dto.reasonForVisit = appointment.reasonForVisit;
    dto.notes = appointment.notes;
    dto.referredByDoctorName = appointment.referredByDoctorName;
    dto.referralNote = appointment.referralNote;
    dto.checkedInAt = appointment.checkedInAt;
    dto.bookedAt = appointment.bookedAt;
    dto.cancelledAt = appointment.cancelledAt;
    dto.cancelReason = appointment.cancelReason;
    dto.departmentId = appointment.departmentId;

    // Patient summary
    if (appointment.patient) {
      dto.patient = {
        id: appointment.patient.id,
        uhid: appointment.patient.uhid,
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        mobile: appointment.patient.mobile,
        age: appointment.patient.age,
        ageUni: appointment.patient.ageUnit,
        gender: appointment.patient.gender,
        allergies: appointment.patient.allergies,
        chronicDiseases: appointment.patient.chronicDiseases,
      };
    }

    // Doctor summary
    if (appointment.doctorProfile) {
      const user = appointment.doctorProfile.hospitalUser;
      dto.doctor = {
        id: appointment.doctorProfile.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        specialization: appointment.doctorProfile.specialization,
        consultationFee: Number(
          appointment.doctorProfile.consultationFee,
        ),
        slotDurationMins:
          appointment.doctorProfile.slotDurationMins,
      };
    }

    // Department name
    dto.departmentName =
      appointment.department?.name ?? null;

    // Token summary
    if (appointment.token) {
      dto.token = {
        tokenNumber: appointment.token.tokenNumber,
        status: appointment.token.status,
        estimatedTime: appointment.token.estimatedTime,
        roomNo: appointment.token.roomNo,
      };
    } else {
      dto.token = null;
    }

    return dto;
  }
}

// Available slot response
export class SlotDto {
  startTime!: string;  // "09:00"
  endTime!: string;    // "09:15"
  isAvailable!: boolean;
}

export class AvailableSlotsResponseDto {
  doctorProfileId!: string;
  date!: string;
  slotDurationMins!: number;
  totalSlots!: number;
  availableSlots!: number;
  slots!: SlotDto[];
}

// List response
export class AppointmentListResponseDto {
  data!: AppointmentResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}