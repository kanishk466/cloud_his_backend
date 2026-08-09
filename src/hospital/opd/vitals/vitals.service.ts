import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { VitalsRepository } from './vitals.repository';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { UpdateVitalsDto } from './dto/update-vitals.dto';
import {
  VitalsResponseDto,
  VitalsListResponseDto,
} from './dto/vitals-response.dto';
import {
  VITALS_ERRORS,
  VITALS_ELIGIBLE_STATUSES,
} from './constants/vitals.constants';

@Injectable()
export class VitalsService {
  private readonly logger = new Logger(VitalsService.name);

  constructor(private readonly vitalsRepository: VitalsRepository) {}

  // ─── RECORD VITALS ──────────────────────────────────────────────
  async recordVitals(
    tenantId: string,
    recordedBy: string,
    dto: CreateVitalsDto,
  ): Promise<VitalsResponseDto> {
    // Rule 1: Validate patient exists in tenant
    const patient = await this.vitalsRepository.getPatient(
      tenantId,
      dto.patientId,
    );

    if (!patient) {
      throw new NotFoundException(VITALS_ERRORS.PATIENT_NOT_FOUND);
    }

    // Rule 2: If appointmentId provided, validate appointment
    if (dto.appointmentId) {
      const appointment = await this.vitalsRepository.getAppointment(
        tenantId,
        dto.appointmentId,
      );

      if (!appointment) {
        throw new NotFoundException(VITALS_ERRORS.APPOINTMENT_NOT_FOUND);
      }

      // Check appointment status
      const isEligible = VITALS_ELIGIBLE_STATUSES.includes(
        appointment.status as any,
      );

      if (!isEligible) {
        throw new BadRequestException({
          ...VITALS_ERRORS.APPOINTMENT_NOT_ACTIVE,
          details: { currentStatus: appointment.status },
        });
      }

      // Verify appointment belongs to this patient
      if (appointment.patientId !== dto.patientId) {
        throw new BadRequestException({
          code: 'OPD_VIT_006',
          message: 'Appointment does not belong to this patient',
        });
      }
    }

    // Rule 3: Auto-calculate BMI
    const bmi = this.calculateBMI(dto.heightCm, dto.weightKg);

    // Rule 4: Create vitals record
    const vitals = await this.vitalsRepository.create({
      tenantId,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      consultationId: dto.consultationId,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      bmi,
      temperatureF: dto.temperatureF,
      bloodPressureSys: dto.bloodPressureSys,
      bloodPressureDia: dto.bloodPressureDia,
      pulseRate: dto.pulseRate,
      respiratoryRate: dto.respiratoryRate,
      spo2: dto.spo2,
      bloodSugarFasting: dto.bloodSugarFasting,
      bloodSugarPP: dto.bloodSugarPP,
      bloodSugarRandom: dto.bloodSugarRandom,
      painScore: dto.painScore,
      chiefComplaints: dto.chiefComplaints,
      notes: dto.notes,
      recordedBy,
    });

    this.logger.log(
      `Vitals recorded for patient ${patient.uhid} by ${recordedBy}`,
    );

    return VitalsResponseDto.fromEntity(vitals);
  }

  // ─── GET VITALS BY ID ───────────────────────────────────────────
  async findById(
    tenantId: string,
    id: string,
  ): Promise<VitalsResponseDto> {
    const vitals = await this.vitalsRepository.findById(tenantId, id);

    if (!vitals) {
      throw new NotFoundException(VITALS_ERRORS.NOT_FOUND);
    }

    if (vitals.tenantId !== tenantId) {
      throw new ForbiddenException(VITALS_ERRORS.CROSS_TENANT);
    }

    return VitalsResponseDto.fromEntity(vitals);
  }

  // ─── GET VITALS BY APPOINTMENT ──────────────────────────────────
  // Used by doctor to see vitals recorded by nurse for this visit
  async findByAppointmentId(
    tenantId: string,
    appointmentId: string,
  ): Promise<VitalsResponseDto | null> {
    const vitals = await this.vitalsRepository.findByAppointmentId(
      tenantId,
      appointmentId,
    );

    if (!vitals) {
      return null;
    }

    return VitalsResponseDto.fromEntity(vitals);
  }

  // ─── GET LATEST VITALS FOR PATIENT ──────────────────────────────
  // Quick view of most recent vitals
  async findLatestByPatientId(
    tenantId: string,
    patientId: string,
  ): Promise<VitalsResponseDto | null> {
    // Validate patient exists
    const patient = await this.vitalsRepository.getPatient(
      tenantId,
      patientId,
    );

    if (!patient) {
      throw new NotFoundException(VITALS_ERRORS.PATIENT_NOT_FOUND);
    }

    const vitals = await this.vitalsRepository.findLatestByPatientId(
      tenantId,
      patientId,
    );

    if (!vitals) {
      return null;
    }

    return VitalsResponseDto.fromEntity(vitals);
  }

  // ─── GET PATIENT VITALS HISTORY ──────────────────────────────────
  // All historical vitals for a patient (paginated)
  async getPatientHistory(
    tenantId: string,
    patientId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<VitalsListResponseDto> {
    // Validate patient exists
    const patient = await this.vitalsRepository.getPatient(
      tenantId,
      patientId,
    );

    if (!patient) {
      throw new NotFoundException(VITALS_ERRORS.PATIENT_NOT_FOUND);
    }

    const { records, total } =
      await this.vitalsRepository.getPatientHistory(
        tenantId,
        patientId,
        page,
        limit,
      );

    return {
      data: records.map((r) => VitalsResponseDto.fromEntity(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── UPDATE VITALS ──────────────────────────────────────────────
  async updateVitals(
    tenantId: string,
    id: string,
    dto: UpdateVitalsDto,
  ): Promise<VitalsResponseDto> {
    // Validate vitals record exists
    const existing = await this.vitalsRepository.findById(tenantId, id);

    if (!existing) {
      throw new NotFoundException(VITALS_ERRORS.NOT_FOUND);
    }

    if (existing.tenantId !== tenantId) {
      throw new ForbiddenException(VITALS_ERRORS.CROSS_TENANT);
    }

    // Recalculate BMI if height or weight changed
    const heightCm = dto.heightCm ?? (existing.heightCm ? Number(existing.heightCm) : undefined);
    const weightKg = dto.weightKg ?? (existing.weightKg ? Number(existing.weightKg) : undefined);
    const bmi = this.calculateBMI(heightCm, weightKg);

    const updated = await this.vitalsRepository.update(id, {
      ...dto,
      bmi,
    });

    this.logger.log(`Vitals ${id} updated`);

    return VitalsResponseDto.fromEntity(updated);
  }

  // ─── GET VITALS TREND ───────────────────────────────────────────
  // Returns last N records for graphing (e.g., BP trend, Sugar trend)
  async getVitalsTrend(
    tenantId: string,
    patientId: string,
    lastN: number = 10,
  ) {
    const patient = await this.vitalsRepository.getPatient(
      tenantId,
      patientId,
    );

    if (!patient) {
      throw new NotFoundException(VITALS_ERRORS.PATIENT_NOT_FOUND);
    }

    const records = await this.vitalsRepository.getVitalsTrend(
      tenantId,
      patientId,
      'all',
      lastN,
    );

    // Format for charting
    return {
      patientId,
      patientUhid: patient.uhid,
      dataPoints: records.map((r) => ({
        date: r.recordedAt,
        bp: r.bloodPressureSys && r.bloodPressureDia
          ? `${r.bloodPressureSys}/${r.bloodPressureDia}`
          : null,
        bloodPressureSys: r.bloodPressureSys ? Number(r.bloodPressureSys) : null,
        bloodPressureDia: r.bloodPressureDia ? Number(r.bloodPressureDia) : null,
        pulseRate: r.pulseRate,
        spo2: r.spo2 ? Number(r.spo2) : null,
        temperature: r.temperatureF ? Number(r.temperatureF) : null,
        weight: r.weightKg ? Number(r.weightKg) : null,
        bmi: r.bmi ? Number(r.bmi) : null,
        sugarFasting: r.bloodSugarFasting ? Number(r.bloodSugarFasting) : null,
        sugarPP: r.bloodSugarPP ? Number(r.bloodSugarPP) : null,
        sugarRandom: r.bloodSugarRandom ? Number(r.bloodSugarRandom) : null,
      })),
    };
  }

  // ─── PRIVATE: BMI CALCULATION ───────────────────────────────────
  private calculateBMI(
    heightCm?: number,
    weightKg?: number,
  ): number | undefined {
    if (!heightCm || !weightKg) return undefined;

    if (heightCm <= 0 || weightKg <= 0) return undefined;

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    // Round to 1 decimal
    return Math.round(bmi * 10) / 10;
  }
}