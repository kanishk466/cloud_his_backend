import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { format } from 'date-fns';
import { CONSULTATION_NO_CONFIG } from './constants/consultations.constants';

const consultationWithRelations = {
  patient: {
    select: {
      id: true, uhid: true, firstName: true, lastName: true,
      age: true, ageUnit: true, gender: true, allergies: true, chronicDiseases: true,
    },
  },
  doctorProfile: {
    select: {
      id: true, specialization: true,
      hospitalUser: { select: { firstName: true, lastName: true } },
    },
  },
  prescriptions: { orderBy: { sortOrder: 'asc' as const } },
  investigations: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class ConsultationsRepository {
  private readonly logger = new Logger(ConsultationsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── GENERATE CONSULTATION NUMBER ──────────────────────────────
  async generateConsultationNo(tenantId: string): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const today = format(new Date(), 'yyyyMMdd');
        const prefix = `${CONSULTATION_NO_CONFIG.PREFIX}-${today}-`;

        const result = await tx.$queryRaw<{ consultation_no: string }[]>`
          SELECT consultation_no FROM consultations
          WHERE tenant_id = ${tenantId} AND consultation_no LIKE ${`${prefix}%`}
          ORDER BY consultation_no DESC LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastNo = result[0]?.consultation_no;
        let seq = 1;
        if (lastNo) {
          const parts = lastNo.split('-');
          seq = parseInt(parts[parts.length - 1], 10) + 1;
        }

        return `${prefix}${seq.toString().padStart(CONSULTATION_NO_CONFIG.SEQUENCE_LENGTH, '0')}`;
      });
    } catch (error) {
      this.logger.error('Consultation number generation failed', error);
      throw new InternalServerErrorException({
        code: 'OPD_CON_000',
        message: 'Failed to generate consultation number',
      });
    }
  }

  // ─── CREATE ─────────────────────────────────────────────────────
  async create(data: {
    tenantId: string;
    consultationNo: string;
    appointmentId: string;
    patientId: string;
    doctorProfileId: string;
    chiefComplaints?: string;
  }) {
    return this.prisma.consultation.create({
      data: {
        tenantId: data.tenantId,
        consultationNo: data.consultationNo,
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        doctorProfileId: data.doctorProfileId,
        chiefComplaints: data.chiefComplaints,
        status: 'IN_PROGRESS',
      },
      include: consultationWithRelations,
    });
  }

  // ─── FIND BY ID ─────────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    return this.prisma.consultation.findFirst({
      where: { id, tenantId },
      include: consultationWithRelations,
    });
  }

  // ─── FIND BY APPOINTMENT ID ─────────────────────────────────────
  async findByAppointmentId(tenantId: string, appointmentId: string) {
    return this.prisma.consultation.findFirst({
      where: { tenantId, appointmentId },
      include: consultationWithRelations,
    });
  }

  // ─── UPDATE CONSULTATION ────────────────────────────────────────
  async update(id: string, data: Record<string, any>) {
    return this.prisma.consultation.update({
      where: { id },
      data,
      include: consultationWithRelations,
    });
  }

  // ─── ADD PRESCRIPTION ───────────────────────────────────────────
  async addPrescription(data: {
    tenantId: string;
    consultationId: string;
    medicineName: string;
    genericName?: string;
    medicineType?: string;
    dosage?: string;
    frequency: string;
    customFrequency?: string;
    route: string;
    mealRelation: string;
    durationDays?: number;
    durationWeeks?: number;
    quantity?: number;
    instructions?: string;
    isCritical?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.prescription.create({
      data: {
        tenantId: data.tenantId,
        consultationId: data.consultationId,
        medicineName: data.medicineName,
        genericName: data.genericName,
        medicineType: data.medicineType,
        dosage: data.dosage,
        frequency: data.frequency as any,
        customFrequency: data.customFrequency,
        route: data.route as any,
        mealRelation: data.mealRelation as any,
        durationDays: data.durationDays,
        durationWeeks: data.durationWeeks,
        quantity: data.quantity,
        instructions: data.instructions,
        isCritical: data.isCritical ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  // ─── DELETE PRESCRIPTION ────────────────────────────────────────
  async deletePrescription(tenantId: string, prescriptionId: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
    });
    if (!rx) return null;

    return this.prisma.prescription.delete({
      where: { id: prescriptionId },
    });
  }

  // ─── ADD INVESTIGATION ──────────────────────────────────────────
  async addInvestigation(data: {
    tenantId: string;
    consultationId: string;
    investigationName: string;
    investigationType: string;
    urgency: string;
    instructions?: string;
    clinicalNotes?: string;
    sortOrder?: number;
  }) {
    return this.prisma.investigationOrder.create({
      data: {
        tenantId: data.tenantId,
        consultationId: data.consultationId,
        investigationName: data.investigationName,
        investigationType: data.investigationType as any,
        urgency: data.urgency as any,
        instructions: data.instructions,
        clinicalNotes: data.clinicalNotes,
        sortOrder: data.sortOrder ?? 0,
        status: 'ORDERED',
      },
    });
  }

  // ─── DELETE INVESTIGATION ───────────────────────────────────────
  async deleteInvestigation(tenantId: string, investigationId: string) {
    const inv = await this.prisma.investigationOrder.findFirst({
      where: { id: investigationId, tenantId },
    });
    if (!inv) return null;

    return this.prisma.investigationOrder.delete({
      where: { id: investigationId },
    });
  }

  // ─── GET APPOINTMENT ────────────────────────────────────────────
  async getAppointment(tenantId: string, appointmentId: string) {
    return this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, deletedAt: null },
    });
  }

  // ─── UPDATE APPOINTMENT STATUS ──────────────────────────────────
  async updateAppointmentStatus(appointmentId: string, status: string) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: status as any },
    });
  }

  // ─── UPDATE TOKEN STATUS ────────────────────────────────────────
  async updateTokenStatus(appointmentId: string, status: string, extraData?: Record<string, any>) {
    const token = await this.prisma.opdToken.findFirst({
      where: { appointmentId },
    });

    if (token) {
      return this.prisma.opdToken.update({
        where: { id: token.id },
        data: { status: status as any, ...extraData },
      });
    }
    return null;
  }

  // ─── GET PATIENT HISTORY ────────────────────────────────────────
  async getPatientPastConsultations(tenantId: string, patientId: string, limit: number = 5) {
    return this.prisma.consultation.findMany({
      where: { tenantId, patientId, status: 'COMPLETED' },
      include: {
        prescriptions: { orderBy: { sortOrder: 'asc' } },
        investigations: { orderBy: { sortOrder: 'asc' } },
        doctorProfile: {
          select: {
            specialization: true,
            hospitalUser: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
  }
}