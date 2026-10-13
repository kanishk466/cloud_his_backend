import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdmissionWorkflowService } from '../admission/admission-workflow.service';

/** Statuses in which the clinical chart + running bill still accept writes. */
export const CLINICAL_OPEN_STATUSES = ['ADMITTED', 'DISCHARGE_ORDERED'] as const;

export interface ClinicalAdmissionContext {
  id: string;
  admissionNo: string;
  status: string;
  patientId: string;
  panelId: string | null;
  bedId: string | null;
  bedIdentifier: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  /** Per-day room rent of the stay's current room type (null without a bed). */
  defaultRate: number | null;
  /** Per-day nursing charge of the same room type. */
  nursingCharge: number | null;
}

/**
 * Shared admission context for the clinical (vitals/rounds/medications/diet)
 * and billing modules.
 *
 * Every write and read of those modules is admission-scoped, so resolving the
 * admission (tenant-validated) and deciding whether the chart is still
 * writable happens in exactly one place:
 *
 *   ADMITTED / DISCHARGE_ORDERED  -> writable
 *   DISCHARGED / CANCELLED        -> read-only (400 ADMISSION_CLOSED)
 *
 * The lookup itself is NOT re-implemented here: it delegates to the admission
 * module's exported `AdmissionWorkflowService.getAdmissionOrThrow`, whose
 * `ADMISSION_INCLUDE` already loads the patient, panel and the bed -> room ->
 * roomType chain with `defaultRate` / `nursingCharge` — exactly what the
 * clinical + billing projections below need. Its plain 404 is re-thrown as the
 * coded `ADMISSION_NOT_FOUND` response the IPD API contract documents.
 */
@Injectable()
export class ClinicalContextService {
  constructor(private readonly admissions: AdmissionWorkflowService) {}

  /** Tenant's admission or a coded 404 — never leaks another hospital's row. */
  async requireAdmission(
    tenantId: string,
    admissionId: string,
  ): Promise<ClinicalAdmissionContext> {
    let admission;
    try {
      admission = await this.admissions.getAdmissionOrThrow(
        tenantId,
        admissionId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          code: 'ADMISSION_NOT_FOUND',
          message: 'Admission not found in this hospital',
        });
      }
      throw error;
    }

    const roomType = admission.bed?.room?.roomType ?? null;

    return {
      id: admission.id,
      admissionNo: admission.admissionNo,
      status: admission.status,
      patientId: admission.patientId,
      panelId: admission.panelId,
      bedId: admission.bedId,
      bedIdentifier: admission.bed?.bedIdentifier ?? null,
      roomTypeId: roomType?.id ?? null,
      roomTypeName: roomType?.name ?? null,
      defaultRate: roomType ? Number(roomType.defaultRate) : null,
      nursingCharge: roomType ? Number(roomType.nursingCharge) : null,
    };
  }

  /** Closed admission -> the chart/bill is history; writes are refused. */
  assertOpen(admission: ClinicalAdmissionContext, action: string): void {
    if ((CLINICAL_OPEN_STATUSES as readonly string[]).includes(admission.status))
      return;

    throw new BadRequestException({
      code: 'ADMISSION_CLOSED',
      message: `Cannot ${action}: admission ${admission.admissionNo} is ${admission.status}`,
      details: {
        currentStatus: admission.status,
        writableStatuses: CLINICAL_OPEN_STATUSES,
      },
    });
  }
}
