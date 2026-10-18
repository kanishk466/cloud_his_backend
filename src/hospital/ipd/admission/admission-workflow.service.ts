import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AdmissionRepository } from './admission.repository';
import { BedStatusService } from '../../masters/ward-room/services/bed-status.service';
import { ThresholdCheckService } from '../../masters/threshold/threshold-check.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { AssignBedDto } from './dto/assign-bed.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';
import { InitiateDischargeDto } from './dto/initiate-discharge.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * IPD Admission workflow — orchestrates the admission lifecycle and drives
 * the bed state machine (Phase 2.3) through it:
 *
 *   admit → assignBed (bed → OCCUPIED)
 *         → transferBed (old → HOUSEKEEPING*, new → OCCUPIED)
 *         → initiateDischarge (bed → DISCHARGE_PENDING)
 *         → completeDischarge (bed → HOUSEKEEPING)
 *
 * *via the legal OCCUPIED → DISCHARGE_PENDING → HOUSEKEEPING path.
 */
@Injectable()
export class AdmissionWorkflowService {
  private readonly logger = new Logger(AdmissionWorkflowService.name);

  constructor(
    private readonly repo: AdmissionRepository,
    private readonly bedStatusService: BedStatusService,
    private readonly thresholdCheckService: ThresholdCheckService,
  ) {}

  // ─── 1. ADMIT ───────────────────────────────────────────────────────────────

  async admitPatient(
    tenantId: string,
    dto: CreateAdmissionDto,
    userId: string,
  ) {
    // Tenant validations
    const patient = await this.repo.findPatient(tenantId, dto.patientId);
    if (!patient)
      throw new NotFoundException('Patient not found in this hospital');

    const doctor = await this.repo.findDoctorProfile(
      tenantId,
      dto.doctorProfileId,
    );
    if (!doctor)
      throw new NotFoundException('Doctor profile not found in this hospital');

    if (dto.panelId) {
      const panel = await this.repo.findPanel(tenantId, dto.panelId);
      if (!panel)
        throw new NotFoundException('Panel not found in this hospital');
    }

    if (dto.referDoctorId) {
      const referDoctor = await this.repo.findReferDoctor(
        tenantId,
        dto.referDoctorId,
      );
      if (!referDoctor)
        throw new NotFoundException('Refer doctor not found or inactive');
    }

    // DAYCARE → expected discharge capped at +24h
    if (dto.admissionType === 'DAYCARE' && !dto.expectedDischargeDate) {
      dto.expectedDischargeDate = new Date(Date.now() + DAY_MS);
    }

    const admissionNo = await this.repo.generateAdmissionNo(tenantId);
    const admission = await this.repo.create(tenantId, admissionNo, dto);

    // Panel threshold check (informational at admission — bill total is 0)
    if (dto.panelId) {
      const threshold = await this.thresholdCheckService.checkThreshold(
        tenantId,
        dto.panelId,
        null,
        0,
      );
      this.logger.log(
        `Threshold check on admission ${admissionNo}: ${threshold.status}${threshold.message ? ` — ${threshold.message}` : ''}`,
      );
    }

    // Bed requested at admission time → assign immediately
    if (dto.bedId) {
      return this.assignBed(
        tenantId,
        admission.id,
        { bedId: dto.bedId },
        userId,
      );
    }

    this.logger.log(
      `Admission ${admissionNo} created for patient ${dto.patientId}`,
    );
    return admission;
  }

  // ─── 2. ASSIGN BED ──────────────────────────────────────────────────────────

  async assignBed(
    tenantId: string,
    admissionId: string,
    dto: AssignBedDto,
    userId: string,
  ) {
    const admission = await this.getAdmissionOrThrow(tenantId, admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException(
        `Cannot assign bed: admission is ${admission.status}`,
      );
    }
    if (admission.bedId) {
      throw new BadRequestException(
        'Bed already assigned — use transfer-bed to move the patient',
      );
    }

    await this.assertBedAssignable(tenantId, dto.bedId, admission.patient, [
      'AVAILABLE',
      'RESERVED',
    ]);

    const updated = await this.repo.update(tenantId, admissionId, {
      bedId: dto.bedId,
    });

    // Drive the state machine: bed → OCCUPIED with admission linkage
    await this.bedStatusService.changeStatus(
      tenantId,
      dto.bedId,
      {
        status: 'OCCUPIED',
        patientId: admission.patientId,
        ipdAdmissionId: admissionId,
        reason: `IPD Admission ${admission.admissionNo}`,
      },
      userId,
    );

    this.logger.log(
      `Bed ${dto.bedId} assigned to admission ${admission.admissionNo}`,
    );
    return updated;
  }

  // ─── 3. TRANSFER BED ────────────────────────────────────────────────────────

  async transferBed(
    tenantId: string,
    admissionId: string,
    dto: TransferBedDto,
    userId: string,
  ) {
    const admission = await this.getAdmissionOrThrow(tenantId, admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException(
        `Cannot transfer: admission is ${admission.status}`,
      );
    }
    if (!admission.bedId) {
      throw new BadRequestException(
        'No bed assigned yet — use assign-bed first',
      );
    }
    if (admission.bedId === dto.newBedId) {
      throw new BadRequestException('Patient is already in this bed');
    }

    const oldBedId = admission.bedId;

    await this.assertBedAssignable(tenantId, dto.newBedId, admission.patient, [
      'AVAILABLE',
    ]);

    // Release the old bed through the LEGAL path (OCCUPIED cannot jump
    // straight to HOUSEKEEPING in the state machine)
    await this.bedStatusService.changeStatus(
      tenantId,
      oldBedId,
      {
        status: 'DISCHARGE_PENDING',
        reason: `Transfer out of ${admission.admissionNo}`,
      },
      userId,
    );
    await this.bedStatusService.changeStatus(
      tenantId,
      oldBedId,
      {
        status: 'HOUSEKEEPING',
        reason: dto.reason ?? `Transfer out of ${admission.admissionNo}`,
      },
      userId,
    );

    // Occupy the new bed with the admission linkage
    await this.bedStatusService.changeStatus(
      tenantId,
      dto.newBedId,
      {
        status: 'OCCUPIED',
        patientId: admission.patientId,
        ipdAdmissionId: admissionId,
        reason: dto.reason ?? `Transfer in for ${admission.admissionNo}`,
      },
      userId,
    );

    const updated = await this.repo.update(tenantId, admissionId, {
      bedId: dto.newBedId,
    });

    this.logger.log(
      `Admission ${admission.admissionNo}: bed ${oldBedId} → ${dto.newBedId}`,
    );
    return updated;
  }

  // ─── 4. INITIATE DISCHARGE ──────────────────────────────────────────────────

  async initiateDischarge(
    tenantId: string,
    admissionId: string,
    dto: InitiateDischargeDto,
    userId: string,
  ) {
    const admission = await this.getAdmissionOrThrow(tenantId, admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException(
        `Cannot initiate discharge: admission is ${admission.status}`,
      );
    }

    const updated = await this.repo.update(tenantId, admissionId, {
      status: 'DISCHARGE_ORDERED',
      dischargeDate: new Date(),
      dischargeType: dto.dischargeType,
      dischargeSummary: dto.dischargeSummary,
      dischargedBy: userId,
    });

    if (admission.bedId) {
      await this.bedStatusService.changeStatus(
        tenantId,
        admission.bedId,
        {
          status: 'DISCHARGE_PENDING',
          reason: `Discharge ordered for ${admission.admissionNo}`,
        },
        userId,
      );
    }

    return updated;
  }

  // ─── 5. COMPLETE DISCHARGE ──────────────────────────────────────────────────

  async completeDischarge(
    tenantId: string,
    admissionId: string,
    userId: string,
  ) {
    const admission = await this.getAdmissionOrThrow(tenantId, admissionId);

    if (admission.status !== 'DISCHARGE_ORDERED') {
      throw new BadRequestException(
        `Cannot complete discharge: admission is ${admission.status} (initiate discharge first)`,
      );
    }

    const updated = await this.repo.update(tenantId, admissionId, {
      status: 'DISCHARGED',
      isActive: false,
    });

    if (admission.bedId) {
      await this.bedStatusService.changeStatus(
        tenantId,
        admission.bedId,
        {
          status: 'HOUSEKEEPING',
          reason: `Post-discharge cleaning (${admission.admissionNo})`,
        },
        userId,
      );
    }

    this.logger.log(`Admission ${admission.admissionNo} discharged`);
    return updated;
  }

  // ─── 6. CANCEL ──────────────────────────────────────────────────────────────

  async cancelAdmission(
    tenantId: string,
    admissionId: string,
    reason: string | undefined,
    userId: string,
  ) {
    const admission = await this.getAdmissionOrThrow(tenantId, admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException(
        `Cannot cancel: admission is ${admission.status}`,
      );
    }
    if (admission.bedId) {
      throw new BadRequestException(
        'Cannot cancel an admission with an assigned bed — discharge the patient properly',
      );
    }

    const updated = await this.repo.update(tenantId, admissionId, {
      status: 'CANCELLED',
      isActive: false,
      reasonForAdmission: admission.reasonForAdmission
        ? `${admission.reasonForAdmission}\n[CANCELLED: ${reason ?? 'no reason given'}]`
        : `[CANCELLED: ${reason ?? 'no reason given'}]`,
    });

    this.logger.log(
      `Admission ${admission.admissionNo} cancelled by ${userId}`,
    );
    return updated;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async getAdmissionOrThrow(tenantId: string, admissionId: string) {
    const admission = await this.repo.findById(tenantId, admissionId);
    if (!admission) throw new NotFoundException('Admission not found');
    return admission;
  }

  /** Bed must exist, be in an assignable status, and gender-compatible. */
  private async assertBedAssignable(
    tenantId: string,
    bedId: string,
    patient: {
      gender: string;
      dateOfBirth: Date | null;
      ageAtRegistration: number | null;
      ageUnit: string | null;
    },
    allowedStatuses: string[],
  ) {
    const bed = await this.repo.findBedWithStatus(tenantId, bedId);
    if (!bed) throw new NotFoundException('Bed not found in this hospital');

    const currentStatus = bed.statusHistory[0]?.status ?? 'AVAILABLE';
    if (!allowedStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        `Bed ${bed.bedIdentifier} is currently ${currentStatus} — only ${allowedStatuses.join('/')} beds can be assigned`,
      );
    }

    // Gender ward enforcement
    const roomGender = bed.room.gender;
    if (roomGender === 'MALE_ONLY' && patient.gender !== 'MALE') {
      throw new BadRequestException(
        `Bed ${bed.bedIdentifier} is in a MALE_ONLY ward — patient is ${patient.gender}`,
      );
    }
    if (roomGender === 'FEMALE_ONLY' && patient.gender !== 'FEMALE') {
      throw new BadRequestException(
        `Bed ${bed.bedIdentifier} is in a FEMALE_ONLY ward — patient is ${patient.gender}`,
      );
    }
    if (roomGender === 'PEDIATRIC') {
      const age = this.computeAge(patient);
      if (age != null && age >= 18) {
        throw new BadRequestException(
          `Bed ${bed.bedIdentifier} is in a PEDIATRIC ward — patient is ${Math.floor(age)} years old`,
        );
      }
    }

    return bed;
  }

  private computeAge(patient: {
    dateOfBirth: Date | null;
    ageAtRegistration: number | null;
    ageUnit: string | null;
  }): number | null {
    if (patient.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      return age;
    }
    if (patient.ageAtRegistration != null) {
      const unit = (patient.ageUnit ?? 'years').toLowerCase();
      if (unit === 'months') return patient.ageAtRegistration / 12;
      if (unit === 'weeks') return patient.ageAtRegistration / 52;
      if (unit === 'days') return patient.ageAtRegistration / 365;
      return patient.ageAtRegistration;
    }
    return null;
  }
}
