import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RecordConsumptionDto } from '../dto/consumption/record-consumption.dto';

@Injectable()
export class PackageConsumptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Quota lookups ──────────────────────────────────────────────────────────

  /** Total consumed (non-extra-billed) quantity of a service in a package. */
  async getConsumedQuantity(
    tenantId: string,
    packageId: string,
    patientId: string,
    serviceId: string,
  ): Promise<number> {
    const result = await this.prisma.packageConsumption.aggregate({
      where: {
        tenantId,
        packageId,
        patientId,
        serviceId,
        isExtraBilled: false,
      },
      _sum: { consumedQuantity: true },
    });
    return result._sum.consumedQuantity ?? 0;
  }

  /** Total consumed (non-extra-billed) visits with a doctor in a package. */
  async getConsumedVisits(
    tenantId: string,
    packageId: string,
    patientId: string,
    doctorProfileId: string,
  ): Promise<number> {
    const result = await this.prisma.packageConsumption.aggregate({
      where: {
        tenantId,
        packageId,
        patientId,
        doctorProfileId,
        isExtraBilled: false,
      },
      _sum: { consumedQuantity: true },
    });
    return result._sum.consumedQuantity ?? 0;
  }

  // ─── Package structure lookups for evaluation ────────────────────────────────

  findComponent(tenantId: string, packageId: string, serviceId: string) {
    return this.prisma.packageComponent.findFirst({
      where: { tenantId, packageId, serviceId },
      include: {
        service: { select: { id: true, serviceName: true, baseRate: true } },
      },
    });
  }

  /** Consult allowance for a doctor: exact doctor match first, else dept-level. */
  async findConsultAllowance(
    tenantId: string,
    packageId: string,
    doctorProfileId: string,
    clinicalDepartmentId: string | null,
  ) {
    const exact = await this.prisma.packageDoctorConsult.findFirst({
      where: { tenantId, packageId, doctorProfileId },
    });
    if (exact) return exact;

    if (clinicalDepartmentId) {
      return this.prisma.packageDoctorConsult.findFirst({
        where: {
          tenantId,
          packageId,
          clinicalDepartmentId,
          doctorProfileId: null,
        },
      });
    }

    // Generic allowance (both null) — applies to any doctor
    return this.prisma.packageDoctorConsult.findFirst({
      where: {
        tenantId,
        packageId,
        doctorProfileId: null,
        clinicalDepartmentId: null,
      },
    });
  }

  findService(tenantId: string, serviceId: string) {
    return this.prisma.serviceMaster.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      select: { id: true, serviceName: true, baseRate: true },
    });
  }

  findPackage(tenantId: string, packageId: string) {
    return this.prisma.packageMaster.findFirst({
      where: { id: packageId, tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, code: true },
    });
  }

  findPatient(tenantId: string, patientId: string) {
    return this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }

  findDoctor(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id: doctorProfileId, tenantId, isActive: true },
      select: {
        id: true,
        consultationFee: true,
        clinicalDepartmentId: true,
      },
    });
  }

  // ─── Write ───────────────────────────────────────────────────────────────────

  record(tenantId: string, dto: RecordConsumptionDto) {
    return this.prisma.packageConsumption.create({
      data: {
        tenantId,
        packageId: dto.packageId,
        patientId: dto.patientId,
        serviceId: dto.serviceId ?? null,
        doctorProfileId: dto.doctorProfileId ?? null,
        consumedQuantity: dto.consumedQuantity ?? 1,
        isExtraBilled: dto.isExtraBilled ?? false,
        billId: dto.billId ?? null,
        notes: dto.notes,
      },
    });
  }

  /** Usage history for a patient in one package (for the billing screen). */
  findUsage(tenantId: string, packageId: string, patientId: string) {
    return this.prisma.packageConsumption.findMany({
      where: { tenantId, packageId, patientId },
      include: {
        service: { select: { id: true, serviceName: true, serviceCode: true } },
        doctorProfile: {
          select: {
            id: true,
            hospitalUser: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { consumedAt: 'desc' },
    });
  }
}
