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

    // Rule 3: Create vitals record (BMI removed from DB payload)
    const vitals = await this.vitalsRepository.create({
      tenantId,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      consultationId: dto.consultationId,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
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

    return VitalsResponseDto.fromEntity(this.attachBmi(vitals)!);
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

    return VitalsResponseDto.fromEntity(this.attachBmi(vitals)!);
  }

  // ─── GET VITALS BY APPOINTMENT ──────────────────────────────────
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

    return VitalsResponseDto.fromEntity(this.attachBmi(vitals)!);
  }

  // ─── GET LATEST VITALS FOR PATIENT ──────────────────────────────
  async findLatestByPatientId(
    tenantId: string,
    patientId: string,
  ): Promise<VitalsResponseDto | null> {
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

    return VitalsResponseDto.fromEntity(this.attachBmi(vitals)!);
  }

  // ─── GET PATIENT VITALS HISTORY ──────────────────────────────────
  async getPatientHistory(
    tenantId: string,
    patientId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<VitalsListResponseDto> {
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
      data: records.map((r) => VitalsResponseDto.fromEntity(this.attachBmi(r)!)),
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
    const existing = await this.vitalsRepository.findById(tenantId, id);

    if (!existing) {
      throw new NotFoundException(VITALS_ERRORS.NOT_FOUND);
    }

    if (existing.tenantId !== tenantId) {
      throw new ForbiddenException(VITALS_ERRORS.CROSS_TENANT);
    }

    const updated = await this.vitalsRepository.update(id, {
      ...dto,
    });

    this.logger.log(`Vitals ${id} updated`);

    return VitalsResponseDto.fromEntity(this.attachBmi(updated)!);
  }

  // ─── GET VITALS TREND ───────────────────────────────────────────
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

    // Format for charting (compute BMI dynamically per data point)
    return {
      patientId,
      patientUhid: patient.uhid,
      dataPoints: records.map((r) => {
        const heightCm = r.heightCm ? Number(r.heightCm) : undefined;
        const weightKg = r.weightKg ? Number(r.weightKg) : undefined;
        const calculatedBmi = this.calculateBMI(heightCm, weightKg);

        return {
          date: r.recordedAt,
          bp: r.bloodPressureSys && r.bloodPressureDia
            ? `${r.bloodPressureSys}/${r.bloodPressureDia}`
            : null,
          bloodPressureSys: r.bloodPressureSys ? Number(r.bloodPressureSys) : null,
          bloodPressureDia: r.bloodPressureDia ? Number(r.bloodPressureDia) : null,
          pulseRate: r.pulseRate,
          spo2: r.spo2 ? Number(r.spo2) : null,
          temperature: r.temperatureF ? Number(r.temperatureF) : null,
          weight: weightKg ?? null,
          bmi: calculatedBmi ?? null,
          sugarFasting: r.bloodSugarFasting ? Number(r.bloodSugarFasting) : null,
          sugarPP: r.bloodSugarPP ? Number(r.bloodSugarPP) : null,
          sugarRandom: r.bloodSugarRandom ? Number(r.bloodSugarRandom) : null,
        };
      }),
    };
  }

  // ─── PRIVATE: DYNAMIC BMI ATTACHMENT ─────────────────────────────
  private attachBmi<T extends { heightCm?: any; weightKg?: any }>(record: T | null): (T & { bmi?: number }) | null {
    if (!record) return null;
    const heightCm = record.heightCm ? Number(record.heightCm) : undefined;
    const weightKg = record.weightKg ? Number(record.weightKg) : undefined;
    const bmi = this.calculateBMI(heightCm, weightKg);
    return {
      ...record,
      bmi,
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

    // Round to 1 decimal place
    return Math.round(bmi * 10) / 10;
  }
}