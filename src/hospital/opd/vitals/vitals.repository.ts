import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateVitalsData {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  consultationId?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  temperatureF?: number;
  bloodPressureSys?: number;
  bloodPressureDia?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  bloodSugarFasting?: number;
  bloodSugarPP?: number;
  bloodSugarRandom?: number;
  painScore?: number;
  chiefComplaints?: string;
  notes?: string;
  recordedBy?: string;
}

@Injectable()
export class VitalsRepository {
  private readonly logger = new Logger(VitalsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE VITALS ──────────────────────────────────────────────
  async create(data: CreateVitalsData) {
    return this.prisma.patientVitals.create({
      data: {
        tenantId: data.tenantId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        consultationId: data.consultationId,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        bmi: data.bmi,
        temperatureF: data.temperatureF,
        bloodPressureSys: data.bloodPressureSys,
        bloodPressureDia: data.bloodPressureDia,
        pulseRate: data.pulseRate,
        respiratoryRate: data.respiratoryRate,
        spo2: data.spo2,
        bloodSugarFasting: data.bloodSugarFasting,
        bloodSugarPP: data.bloodSugarPP,
        bloodSugarRandom: data.bloodSugarRandom,
        painScore: data.painScore,
        chiefComplaints: data.chiefComplaints,
        notes: data.notes,
        recordedBy: data.recordedBy,
      },
    });
  }

  // ─── FIND BY ID ─────────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    return this.prisma.patientVitals.findFirst({
      where: { id, tenantId },
    });
  }

  // ─── FIND BY APPOINTMENT ID ─────────────────────────────────────
  // Get vitals recorded for a specific appointment
  async findByAppointmentId(tenantId: string, appointmentId: string) {
    return this.prisma.patientVitals.findFirst({
      where: { tenantId, appointmentId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  // ─── FIND LATEST VITALS FOR PATIENT ─────────────────────────────
  // Most recent vitals for patient (used in doctor console)
  async findLatestByPatientId(tenantId: string, patientId: string) {
    return this.prisma.patientVitals.findFirst({
      where: { tenantId, patientId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  // ─── GET PATIENT VITALS HISTORY ──────────────────────────────────
  async getPatientHistory(
    tenantId: string,
    patientId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.patientVitals.findMany({
        where: { tenantId, patientId },
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patientVitals.count({
        where: { tenantId, patientId },
      }),
    ]);

    return { records, total };
  }

  // ─── UPDATE VITALS ──────────────────────────────────────────────
  async update(id: string, data: Partial<CreateVitalsData>) {
    return this.prisma.patientVitals.update({
      where: { id },
      data: {
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        bmi: data.bmi,
        temperatureF: data.temperatureF,
        bloodPressureSys: data.bloodPressureSys,
        bloodPressureDia: data.bloodPressureDia,
        pulseRate: data.pulseRate,
        respiratoryRate: data.respiratoryRate,
        spo2: data.spo2,
        bloodSugarFasting: data.bloodSugarFasting,
        bloodSugarPP: data.bloodSugarPP,
        bloodSugarRandom: data.bloodSugarRandom,
        painScore: data.painScore,
        chiefComplaints: data.chiefComplaints,
        notes: data.notes,
        consultationId: data.consultationId,
        appointmentId: data.appointmentId,
      },
    });
  }

  // ─── GET PATIENT ────────────────────────────────────────────────
  async getPatient(tenantId: string, patientId: string) {
    return this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, deletedAt: null },
    });
  }

  // ─── GET APPOINTMENT ────────────────────────────────────────────
  async getAppointment(tenantId: string, appointmentId: string) {
    return this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, deletedAt: null },
    });
  }

  // ─── GET VITALS TREND FOR PATIENT ───────────────────────────────
  // Returns last N vitals records for graphing trends
  async getVitalsTrend(
    tenantId: string,
    patientId: string,
    field: string,
    lastN: number = 10,
  ) {
    const records = await this.prisma.patientVitals.findMany({
      where: { tenantId, patientId },
      orderBy: { recordedAt: 'desc' },
      take: lastN,
      select: {
        recordedAt: true,
        heightCm: true,
        weightKg: true,
        bmi: true,
        temperatureF: true,
        bloodPressureSys: true,
        bloodPressureDia: true,
        pulseRate: true,
        spo2: true,
        bloodSugarFasting: true,
        bloodSugarPP: true,
        bloodSugarRandom: true,
      },
    });

    return records.reverse(); // Oldest first for chart
  }
}