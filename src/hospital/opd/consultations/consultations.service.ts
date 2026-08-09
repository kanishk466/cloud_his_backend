import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConsultationsRepository } from './consultations.repository';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { AddPrescriptionDto } from './dto/add-prescription.dto';
import { AddInvestigationDto } from './dto/add-investigation.dto';
import { ConsultationResponseDto } from './dto/consultation-response.dto';
import { CONSULTATION_ERRORS, CONSULTATION_ELIGIBLE_STATUSES } from './constants/consultations.constants';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(private readonly consultationsRepository: ConsultationsRepository) {}

  // ─── START CONSULTATION ─────────────────────────────────────────
  async startConsultation(
    tenantId: string,
    dto: CreateConsultationDto,
  ): Promise<ConsultationResponseDto> {
    // Rule 1: Validate appointment
    const appointment = await this.consultationsRepository.getAppointment(tenantId, dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException(CONSULTATION_ERRORS.APPOINTMENT_NOT_FOUND);
    }

    // Rule 2: Check appointment status
    const isEligible = CONSULTATION_ELIGIBLE_STATUSES.includes(appointment.status as any);
    if (!isEligible) {
      throw new BadRequestException({
        ...CONSULTATION_ERRORS.INVALID_APPOINTMENT_STATUS,
        details: { currentStatus: appointment.status },
      });
    }

    // Rule 3: Check if consultation already exists
    const existing = await this.consultationsRepository.findByAppointmentId(tenantId, dto.appointmentId);
    if (existing) {
      throw new ConflictException({
        ...CONSULTATION_ERRORS.ALREADY_EXISTS,
        details: { consultationId: existing.id, consultationNo: existing.consultationNo },
      });
    }

    // Rule 4: Generate consultation number
    const consultationNo = await this.consultationsRepository.generateConsultationNo(tenantId);

    // Rule 5: Create consultation
    const consultation = await this.consultationsRepository.create({
      tenantId,
      consultationNo,
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      doctorProfileId: appointment.doctorProfileId,
      chiefComplaints: dto.chiefComplaints,
    });

    this.logger.log(`Consultation ${consultationNo} started for appointment ${appointment.appointmentNo}`);

    return ConsultationResponseDto.fromEntity(consultation);
  }

  // ─── GET CONSULTATION ───────────────────────────────────────────
  async findById(tenantId: string, id: string): Promise<ConsultationResponseDto> {
    const consultation = await this.consultationsRepository.findById(tenantId, id);
    if (!consultation) {
      throw new NotFoundException(CONSULTATION_ERRORS.NOT_FOUND);
    }
    if (consultation.tenantId !== tenantId) {
      throw new ForbiddenException(CONSULTATION_ERRORS.CROSS_TENANT);
    }
    return ConsultationResponseDto.fromEntity(consultation);
  }

  // ─── GET BY APPOINTMENT ─────────────────────────────────────────
  async findByAppointmentId(tenantId: string, appointmentId: string): Promise<ConsultationResponseDto | null> {
    const consultation = await this.consultationsRepository.findByAppointmentId(tenantId, appointmentId);
    if (!consultation) return null;
    return ConsultationResponseDto.fromEntity(consultation);
  }

  // ─── UPDATE CONSULTATION (Auto-save / Draft) ───────────────────
  async update(tenantId: string, id: string, dto: UpdateConsultationDto): Promise<ConsultationResponseDto> {
    const existing = await this.consultationsRepository.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(CONSULTATION_ERRORS.NOT_FOUND);
    }

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException(CONSULTATION_ERRORS.ALREADY_COMPLETED);
    }

    const updateData: Record<string, any> = {};

    // Map all fields
    if (dto.chiefComplaints !== undefined) updateData.chiefComplaints = dto.chiefComplaints;
    if (dto.historyOfIllness !== undefined) updateData.historyOfIllness = dto.historyOfIllness;
    if (dto.pastHistory !== undefined) updateData.pastHistory = dto.pastHistory;
    if (dto.familyHistory !== undefined) updateData.familyHistory = dto.familyHistory;
    if (dto.personalHistory !== undefined) updateData.personalHistory = dto.personalHistory;
    if (dto.generalExamination !== undefined) updateData.generalExamination = dto.generalExamination;
    if (dto.systemicExamination !== undefined) updateData.systemicExamination = dto.systemicExamination;
    if (dto.localExamination !== undefined) updateData.localExamination = dto.localExamination;
    if (dto.provisionalDiagnosis !== undefined) updateData.provisionalDiagnosis = dto.provisionalDiagnosis;
    if (dto.finalDiagnosis !== undefined) updateData.finalDiagnosis = dto.finalDiagnosis;
    if (dto.icdCodes !== undefined) updateData.icdCodes = dto.icdCodes;
    if (dto.clinicalNotes !== undefined) updateData.clinicalNotes = dto.clinicalNotes;
    if (dto.specialInstructions !== undefined) updateData.specialInstructions = dto.specialInstructions;
    if (dto.followUpDate !== undefined) updateData.followUpDate = dto.followUpDate ? new Date(dto.followUpDate) : null;
    if (dto.followUpNotes !== undefined) updateData.followUpNotes = dto.followUpNotes;
    if (dto.referredToDoctorId !== undefined) updateData.referredToDoctorId = dto.referredToDoctorId;
    if (dto.referredToDepartment !== undefined) updateData.referredToDepartment = dto.referredToDepartment;
    if (dto.referralReason !== undefined) updateData.referralReason = dto.referralReason;

    const updated = await this.consultationsRepository.update(id, updateData);

    return ConsultationResponseDto.fromEntity(updated);
  }

  // ─── COMPLETE CONSULTATION ──────────────────────────────────────
  async complete(tenantId: string, id: string): Promise<ConsultationResponseDto> {
    const existing = await this.consultationsRepository.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(CONSULTATION_ERRORS.NOT_FOUND);
    }

    if (existing.status !== 'IN_PROGRESS') {
      throw new BadRequestException(CONSULTATION_ERRORS.NOT_IN_PROGRESS);
    }

    // Rule: Must have at least provisional or final diagnosis
    if (!existing.provisionalDiagnosis && !existing.finalDiagnosis) {
      throw new BadRequestException(CONSULTATION_ERRORS.DIAGNOSIS_REQUIRED);
    }

    // Determine status
    const status = existing.referredToDoctorId ? 'REFERRED' : 'COMPLETED';

    // Update consultation
    const updated = await this.consultationsRepository.update(id, {
      status,
      completedAt: new Date(),
    });

    // Update appointment to COMPLETED
    await this.consultationsRepository.updateAppointmentStatus(existing.appointmentId, 'COMPLETED');

    // Update token to COMPLETED
    await this.consultationsRepository.updateTokenStatus(existing.appointmentId, 'COMPLETED', {
      completedAt: new Date(),
    });

    this.logger.log(`Consultation ${existing.consultationNo} completed`);

    return ConsultationResponseDto.fromEntity(updated);
  }

  // ─── ADD PRESCRIPTION ───────────────────────────────────────────
// ─── ADD PRESCRIPTION ───────────────────────────────────────────
async addPrescription(
  tenantId: string,
  consultationId: string,
  dto: AddPrescriptionDto,
): Promise<ConsultationResponseDto> {
  const consultation = await this.consultationsRepository.findById(tenantId, consultationId);
  if (!consultation) {
    throw new NotFoundException(CONSULTATION_ERRORS.NOT_FOUND);
  }

  if (consultation.status !== 'IN_PROGRESS') {
    throw new BadRequestException(CONSULTATION_ERRORS.NOT_IN_PROGRESS);
  }

  await this.consultationsRepository.addPrescription({
    tenantId,
    consultationId,
    medicineName: dto.medicineName,
    genericName: dto.genericName,
    medicineType: dto.medicineType,
    dosage: dto.dosage,
    frequency: dto.frequency,
    customFrequency: dto.customFrequency,
    route: dto.route,
    mealRelation: dto.mealRelation,
    durationDays: dto.durationDays,
    durationWeeks: dto.durationWeeks,
    quantity: dto.quantity,
    instructions: dto.instructions,
    isCritical: dto.isCritical,
    sortOrder: dto.sortOrder,
  });

  const updated = await this.consultationsRepository.findById(tenantId, consultationId);
  return ConsultationResponseDto.fromEntity(updated);
}

  // ─── REMOVE PRESCRIPTION ───────────────────────────────────────
  async removePrescription(tenantId: string, consultationId: string, prescriptionId: string): Promise<ConsultationResponseDto> {
    const consultation = await this.consultationsRepository.findById(tenantId, consultationId);
    if (!consultation) {
      throw new NotFoundException(CONSULTATION_ERRORS.NOT_FOUND);
    }

    if (consultation.status !== 'IN_PROGRESS') {
      throw new BadRequestException(CONSULTATION_ERRORS.NOT_IN_PROGRESS);
    }

    const deleted = await this.consultationsRepository.deletePrescription(tenantId, prescriptionId);
    if (!deleted) {
      throw new NotFoundException(CONSULTATION_ERRORS.PRESCRIPTION_NOT_FOUND);
    }

    const updated = await this.consultationsRepository.findById(tenantId, consultationId);
    return ConsultationResponseDto.fromEntity(updated);
  }

// ─── ADD INVESTIGATION ──────────────────────────────────────────
async addInvestigation(
  tenantId: string,
  consultationId: string,
  dto: AddInvestigationDto,
): Promise<ConsultationResponseDto> {
  const consultation = await this.consultationsRepository.findById(tenantId, consultationId);
  if (!consultation) {
    throw new NotFoundException(CONSULTATION_ERRORS.NOT_FOUND);
  }

  if (consultation.status !== 'IN_PROGRESS') {
    throw new BadRequestException(CONSULTATION_ERRORS.NOT_IN_PROGRESS);
  }

  await this.consultationsRepository.addInvestigation({
    tenantId,
    consultationId,
    investigationName: dto.investigationName,
    investigationType: dto.investigationType,
    urgency: dto.urgency,
    instructions: dto.instructions,
    clinicalNotes: dto.clinicalNotes,
    sortOrder: dto.sortOrder,
  });

  const updated = await this.consultationsRepository.findById(tenantId, consultationId);
  return ConsultationResponseDto.fromEntity(updated);
}

  // ─── REMOVE INVESTIGATION ──────────────────────────────────────
  async removeInvestigation(tenantId: string, consultationId: string, investigationId: string): Promise<ConsultationResponseDto> {
    const consultation = await this.consultationsRepository.findById(tenantId, consultationId);
    if (!consultation) {
      throw new NotFoundException(CONSULTATION_ERRORS.NOT_FOUND);
    }

    if (consultation.status !== 'IN_PROGRESS') {
      throw new BadRequestException(CONSULTATION_ERRORS.NOT_IN_PROGRESS);
    }

    const deleted = await this.consultationsRepository.deleteInvestigation(tenantId, investigationId);
    if (!deleted) {
      throw new NotFoundException(CONSULTATION_ERRORS.INVESTIGATION_NOT_FOUND);
    }

    const updated = await this.consultationsRepository.findById(tenantId, consultationId);
    return ConsultationResponseDto.fromEntity(updated);
  }

  // ─── PATIENT PAST CONSULTATIONS ─────────────────────────────────
  async getPatientHistory(tenantId: string, patientId: string, limit: number = 5) {
    const records = await this.consultationsRepository.getPatientPastConsultations(tenantId, patientId, limit);

    return records.map((r) => ConsultationResponseDto.fromEntity(r));
  }
}