export class PrescriptionResponseDto {
  id!: string;
  medicineName!: string;
  genericName!: string | null;
  medicineType!: string | null;
  dosage!: string | null;
  frequency!: string;
  customFrequency!: string | null;
  route!: string;
  mealRelation!: string;
  durationDays!: number | null;
  durationWeeks!: number | null;
  quantity!: number | null;
  instructions!: string | null;
  isCritical!: boolean;
  sortOrder?: number;
}

export class InvestigationResponseDto {
  id!: string;
  investigationName!: string;
  investigationType!: string;
  urgency!: string;
  instructions!: string | null;
  clinicalNotes!: string | null;
  status!: string;
  orderedAt?: Date;
  completedAt?: Date | null;
  resultSummary?: string | null;
  resultFile?: string | null;
  sortOrder?: number;
}

export class ConsultationResponseDto {
  id!: string;
  consultationNo!: string;
  appointmentId!: string;

  patient!: {
    id: string;
    uhid: string;
    firstName: string;
    lastName: string | null;
    fullName: string;
    age: number | null;
    ageUnit: string | null;
    gender: string;
    allergies: string | null;
    chronicDiseases: string | null;
  };

  doctor!: {
    id: string;
    firstName: string;
    lastName: string | null;
    specialization: string;
  };

  // SOAP Notes
  chiefComplaints!: string | null;
  historyOfIllness!: string | null;
  pastHistory!: string | null;
  familyHistory!: string | null;
  personalHistory!: string | null;

  generalExamination!: string | null;
  systemicExamination!: string | null;
  localExamination!: string | null;

  provisionalDiagnosis!: string | null;
  finalDiagnosis!: string | null;
  icdCodes!: string[];

  clinicalNotes!: string | null;
  specialInstructions!: string | null;

  followUpDate!: string | null;
  followUpNotes!: string | null;

  referredToDoctorId!: string | null;
  referredToDepartment!: string | null;
  referralReason!: string | null;

  status!: string;
  startedAt?: Date;
  completedAt?: Date | null;

  prescriptions?: PrescriptionResponseDto[];
  investigations?: InvestigationResponseDto[];

  static fromEntity(entity: any): ConsultationResponseDto {
    const dto = new ConsultationResponseDto();

    dto.id = entity.id;
    dto.consultationNo = entity.consultationNo;
    dto.appointmentId = entity.appointmentId;

    // Patient
    const p = entity.patient;
    if (p) {
      dto.patient = {
        id: p.id,
        uhid: p.uhid,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: [p.firstName, p.lastName].filter(Boolean).join(' '),
        age: p.age,
        ageUnit: p.ageUnit,
        gender: p.gender,
        allergies: p.allergies,
        chronicDiseases: p.chronicDiseases,
      };
    }

    // Doctor
    const d = entity.doctorProfile;
    if (d) {
      const u = d.hospitalUser;
      dto.doctor = {
        id: d.id,
        firstName: u?.firstName ?? '',
        lastName: u?.lastName ?? null,
        specialization: d.specialization,
      };
    }

    // SOAP
    dto.chiefComplaints = entity.chiefComplaints;
    dto.historyOfIllness = entity.historyOfIllness;
    dto.pastHistory = entity.pastHistory;
    dto.familyHistory = entity.familyHistory;
    dto.personalHistory = entity.personalHistory;
    dto.generalExamination = entity.generalExamination;
    dto.systemicExamination = entity.systemicExamination;
    dto.localExamination = entity.localExamination;
    dto.provisionalDiagnosis = entity.provisionalDiagnosis;
    dto.finalDiagnosis = entity.finalDiagnosis;
    dto.icdCodes = entity.icdCodes ?? [];
    dto.clinicalNotes = entity.clinicalNotes;
    dto.specialInstructions = entity.specialInstructions;

    dto.followUpDate = entity.followUpDate
      ? new Date(entity.followUpDate).toISOString().split('T')[0]
      : null;
    dto.followUpNotes = entity.followUpNotes;

    dto.referredToDoctorId = entity.referredToDoctorId;
    dto.referredToDepartment = entity.referredToDepartment;
    dto.referralReason = entity.referralReason;

    dto.status = entity.status;
    dto.startedAt = entity.startedAt;
    dto.completedAt = entity.completedAt;

    // Prescriptions
    dto.prescriptions = (entity.prescriptions ?? []).map((rx: any) => ({
      id: rx.id,
      medicineName: rx.medicineName,
      genericName: rx.genericName,
      medicineType: rx.medicineType,
      dosage: rx.dosage,
      frequency: rx.frequency,
      customFrequency: rx.customFrequency,
      route: rx.route,
      mealRelation: rx.mealRelation,
      durationDays: rx.durationDays,
      durationWeeks: rx.durationWeeks,
      quantity: rx.quantity,
      instructions: rx.instructions,
      isCritical: rx.isCritical,
      sortOrder: rx.sortOrder,
    }));

    // Investigations
    dto.investigations = (entity.investigations ?? []).map((inv: any) => ({
      id: inv.id,
      investigationName: inv.investigationName,
      investigationType: inv.investigationType,
      urgency: inv.urgency,
      instructions: inv.instructions,
      clinicalNotes: inv.clinicalNotes,
      status: inv.status,
      orderedAt: inv.orderedAt,
      completedAt: inv.completedAt,
      resultSummary: inv.resultSummary,
      resultFile: inv.resultFile,
      sortOrder: inv.sortOrder,
    }));

    return dto;
  }
}