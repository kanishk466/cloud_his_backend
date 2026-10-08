import { Injectable, NotFoundException } from '@nestjs/common';
import { PackageConsumptionRepository } from '../repositories/package-consumption.repository';
import { RecordConsumptionDto } from '../dto/consumption/record-consumption.dto';

export interface ConsumptionEvaluation {
  isCovered: boolean;
  remainingQuota: number;
  chargeAmount: number;
  reason?: string;
  allowedQuantity?: number;
  consumedSoFar?: number;
}

/**
 * Phase 3.2 — Package Consumption Engine.
 *
 * Billing engines ask before charging: "is this item covered by the
 * patient's package?" — inside quota → ₹0 line; quota exhausted → standard
 * tariff rate with PACKAGE_QUOTA_EXHAUSTED. recordConsumption then writes
 * the ledger row (covered or extra-billed).
 */
@Injectable()
export class PackageConsumptionEngineService {
  constructor(private readonly repo: PackageConsumptionRepository) {}

  async evaluateConsumption(
    tenantId: string,
    patientId: string,
    packageId: string,
    item: { serviceId?: string; doctorProfileId?: string },
  ): Promise<ConsumptionEvaluation> {
    const pkg = await this.repo.findPackage(tenantId, packageId);
    if (!pkg) throw new NotFoundException('Package not found (or inactive)');

    const patient = await this.repo.findPatient(tenantId, patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    // ─── Service item path ──────────────────────────────────────────────────
    if (item.serviceId) {
      const component = await this.repo.findComponent(
        tenantId,
        packageId,
        item.serviceId,
      );

      if (!component) {
        const service = await this.repo.findService(tenantId, item.serviceId);
        return {
          isCovered: false,
          remainingQuota: 0,
          chargeAmount: Number(service?.baseRate ?? 0),
          reason: 'NOT_IN_PACKAGE',
        };
      }

      const consumed = await this.repo.getConsumedQuantity(
        tenantId,
        packageId,
        patientId,
        item.serviceId,
      );

      if (consumed < component.quantity) {
        return {
          isCovered: true,
          remainingQuota: component.quantity - consumed - 1,
          chargeAmount: 0,
          allowedQuantity: component.quantity,
          consumedSoFar: consumed,
        };
      }

      return {
        isCovered: false,
        remainingQuota: 0,
        chargeAmount: Number(component.service.baseRate),
        reason: 'PACKAGE_QUOTA_EXHAUSTED',
        allowedQuantity: component.quantity,
        consumedSoFar: consumed,
      };
    }

    // ─── Doctor consultation path ────────────────────────────────────────────
    if (item.doctorProfileId) {
      const doctor = await this.repo.findDoctor(tenantId, item.doctorProfileId);
      if (!doctor) {
        throw new NotFoundException('Doctor profile not found (or inactive)');
      }

      const allowance = await this.repo.findConsultAllowance(
        tenantId,
        packageId,
        item.doctorProfileId,
        doctor.clinicalDepartmentId,
      );

      if (!allowance) {
        return {
          isCovered: false,
          remainingQuota: 0,
          chargeAmount: Number(doctor.consultationFee),
          reason: 'NOT_IN_PACKAGE',
        };
      }

      const consumed = await this.repo.getConsumedVisits(
        tenantId,
        packageId,
        patientId,
        item.doctorProfileId,
      );

      if (consumed < allowance.maxVisits) {
        return {
          isCovered: true,
          remainingQuota: allowance.maxVisits - consumed - 1,
          chargeAmount: 0,
          allowedQuantity: allowance.maxVisits,
          consumedSoFar: consumed,
        };
      }

      return {
        isCovered: false,
        remainingQuota: 0,
        chargeAmount: Number(doctor.consultationFee),
        reason: 'PACKAGE_QUOTA_EXHAUSTED',
        allowedQuantity: allowance.maxVisits,
        consumedSoFar: consumed,
      };
    }

    return {
      isCovered: false,
      remainingQuota: 0,
      chargeAmount: 0,
      reason: 'NOT_IN_PACKAGE',
    };
  }

  /** Write the consumption ledger row (covered or extra-billed). */
  async recordConsumption(tenantId: string, dto: RecordConsumptionDto) {
    const pkg = await this.repo.findPackage(tenantId, dto.packageId);
    if (!pkg) throw new NotFoundException('Package not found (or inactive)');

    const patient = await this.repo.findPatient(tenantId, dto.patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    return this.repo.record(tenantId, dto);
  }

  /** Usage history for a patient in one package (billing screen). */
  async getUsage(tenantId: string, packageId: string, patientId: string) {
    const pkg = await this.repo.findPackage(tenantId, packageId);
    if (!pkg) throw new NotFoundException('Package not found (or inactive)');
    return this.repo.findUsage(tenantId, packageId, patientId);
  }
}
