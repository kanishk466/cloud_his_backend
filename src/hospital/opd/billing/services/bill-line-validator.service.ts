import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { SERVICE_VALIDATION_ERRORS } from '../constants/billing.constants';

export interface BillLineValidationResult {
  isValid: true;
  serviceDetails: {
    id: string;
    name: string;
    code: string;
    baseRate: number;
    rateEditable: boolean;
    discountable: boolean;
    category: string | null;
    subCategory: string | null;
  };
}

/**
 * Phase 2.1B — Billing Enforcement.
 *
 * Validates every bill line item against the linked ServiceMaster rules
 * BEFORE the item is saved: active service, gender restriction, age
 * restriction, rate-editability and discount eligibility.
 */
@Injectable()
export class BillLineValidatorService {
  private readonly logger = new Logger(BillLineValidatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateBillLine(
    tenantId: string,
    patientId: string,
    serviceId: string,
    unitPrice: number,
    discountPercent: number,
    quantity: number,
    options?: { skipRateCheck?: boolean },
  ): Promise<BillLineValidationResult> {
    // ─── 1. Service existence & active ─────────────────────────────────────
    const service = await this.prisma.serviceMaster.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      include: {
        categoryRel: { select: { id: true, name: true, code: true } },
        subCategoryRel: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    if (!service || !service.isActive) {
      throw new BadRequestException({
        ...SERVICE_VALIDATION_ERRORS.SERVICE_NOT_FOUND,
        details: { serviceId },
      });
    }

    // Patient is needed for gender / age checks — fetch once
    const needsPatient =
      service.genderRestriction != null ||
      service.minAgeYears != null ||
      service.maxAgeYears != null;

    const patient = needsPatient
      ? await this.prisma.patient.findFirst({
          where: { id: patientId, tenantId },
          select: {
            id: true,
            gender: true,
            dateOfBirth: true,
            ageAtRegistration: true,
            ageUnit: true,
          },
        })
      : null;

    // ─── 2. Gender restriction ─────────────────────────────────────────────
    if (service.genderRestriction && patient) {
      if (patient.gender !== service.genderRestriction) {
        throw new BadRequestException({
          ...SERVICE_VALIDATION_ERRORS.SERVICE_GENDER_MISMATCH,
          message: `This service (${service.serviceName}) is restricted to ${service.genderRestriction} patients only.`,
          details: {
            serviceId,
            patientGender: patient.gender,
            requiredGender: service.genderRestriction,
          },
        });
      }
    }

    // ─── 3. Age restriction ────────────────────────────────────────────────
    if (
      (service.minAgeYears != null || service.maxAgeYears != null) &&
      patient
    ) {
      const ageYears = this.computePatientAgeYears(patient);

      if (ageYears == null) {
        // Data-quality gap: patient has neither DOB nor age-at-registration.
        // We allow the line (billing must not stop) but flag it loudly.
        this.logger.warn(
          `Age validation skipped for service ${service.serviceCode}: patient ${patientId} has no DOB / age recorded`,
        );
      } else {
        if (service.minAgeYears != null && ageYears < service.minAgeYears) {
          throw new BadRequestException({
            ...SERVICE_VALIDATION_ERRORS.SERVICE_AGE_MISMATCH,
            message: `This service (${service.serviceName}) is allowed only for patients aged ${service.minAgeYears}+ years. Patient age: ${Math.floor(ageYears)} years.`,
            details: { serviceId, patientAgeYears: ageYears },
          });
        }
        if (service.maxAgeYears != null && ageYears > service.maxAgeYears) {
          throw new BadRequestException({
            ...SERVICE_VALIDATION_ERRORS.SERVICE_AGE_MISMATCH,
            message: `This service (${service.serviceName}) is allowed only for patients up to ${service.maxAgeYears} years. Patient age: ${Math.floor(ageYears)} years.`,
            details: { serviceId, patientAgeYears: ageYears },
          });
        }
      }
    }

    // ─── 4. Rate editable check ────────────────────────────────────────────
    // Skipped for system-generated lines (fee engine output is authoritative;
    // the flag guards against manual counter edits, not the engine itself).
    const baseRate = Number(service.baseRate);
    if (
      !options?.skipRateCheck &&
      !service.rateEditable &&
      Number(unitPrice) !== baseRate
    ) {
      throw new BadRequestException({
        ...SERVICE_VALIDATION_ERRORS.RATE_NOT_EDITABLE,
        message: `Rate for ${service.serviceName} is fixed at ₹${baseRate} and cannot be modified.`,
        details: { serviceId, baseRate, attemptedRate: unitPrice },
      });
    }

    // ─── 5. Discountable check ─────────────────────────────────────────────
    if (!service.discountable && discountPercent > 0) {
      throw new BadRequestException({
        ...SERVICE_VALIDATION_ERRORS.SERVICE_NOT_DISCOUNTABLE,
        message: `Discount is not allowed on ${service.serviceName}.`,
        details: { serviceId, attemptedDiscountPercent: discountPercent },
      });
    }

    // ─── 6. All good ───────────────────────────────────────────────────────
    return {
      isValid: true,
      serviceDetails: {
        id: service.id,
        name: service.serviceName,
        code: service.serviceCode,
        baseRate,
        rateEditable: service.rateEditable,
        discountable: service.discountable,
        category: service.categoryRel?.name ?? null,
        subCategory:
          service.subCategoryRel?.displayName ??
          service.subCategoryRel?.name ??
          null,
      },
    };
  }

  // ─── Age computation (DOB preferred, fallback to registration age) ────────
  private computePatientAgeYears(patient: {
    dateOfBirth: Date | null;
    ageAtRegistration: number | null;
    ageUnit: string | null;
  }): number | null {
    if (patient.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    }

    if (patient.ageAtRegistration != null) {
      const unit = (patient.ageUnit ?? 'years').toLowerCase();
      switch (unit) {
        case 'months':
          return patient.ageAtRegistration / 12;
        case 'weeks':
          return patient.ageAtRegistration / 52;
        case 'days':
          return patient.ageAtRegistration / 365;
        default:
          return patient.ageAtRegistration; // 'years'
      }
    }

    return null;
  }
}
