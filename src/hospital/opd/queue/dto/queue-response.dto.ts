// Single token in queue
export class QueueTokenDto {
  id!: string;
  tokenNumber!: number;
  status!: string;
  originalPosition!: number | null;
  estimatedTime!: string | null;
  calledAt!: Date | null;
  startedAt!: Date | null;
  completedAt!: Date | null;
  roomNo!: string | null;

  // Appointment info
  appointmentId!: string;
  appointmentNo!: string;
  appointmentType!: string;
  visitType!: string;
  priority!: number;
  reasonForVisit!: string | null;

  // Patient info
  patient!: {
    id: string;
    uhid: string;
    firstName: string;
    lastName: string | null;
    fullName: string;
    mobile: string;
    age: number | null;
    ageUnit: string | null;
    gender: string;
    allergies: string | null;
    chronicDiseases: string | null;
  };

  // Vitals recorded?
  vitalsRecorded!: boolean;

  // Wait time in minutes
  waitTimeMins!: number | null;
}

// Queue statistics
export class QueueStatsDto {
  total!: number;
  waiting!: number;
  inProgress!: number;
  completed!: number;
  skipped!: number;
  cancelled!: number;
  avgWaitTimeMins!: number | null;
  avgConsultTimeMins!: number | null;
}

// Doctor queue full response
export class DoctorQueueResponseDto {
  doctor!: {
    id: string;
    firstName: string;
    lastName: string | null;
    specialization: string;
    roomNo: string | null;
  };
  date!: string;
  stats!: QueueStatsDto;
  currentToken!: QueueTokenDto | null;
  queue!: QueueTokenDto[];
}

// Token generation response
export class TokenResponseDto {
  id!: string;
  tokenNumber!: number;
  tokenDate!: string;
  status!: string;
  estimatedTime!: string | null;
  roomNo!: string | null;
  appointmentNo!: string;
  patient!: {
    uhid: string;
    firstName: string;
    lastName: string | null;
    fullName: string;
  };
  doctor!: {
    firstName: string;
    lastName: string | null;
    specialization: string;
  };
}

// Queue stats for display board
export class DisplayBoardDto {
  hospitalName!: string;
  date!: string;
  doctors!: {
    doctorName: string;
    specialization: string;
    roomNo: string | null;
    currentToken: number | null;
    currentPatientName: string | null;
    nextTokens: number[]; // next 3 waiting tokens
    totalWaiting: number;
  }[];
}