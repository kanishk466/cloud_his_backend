import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Hospital } from '@prisma/client';
import { HospitalRepository } from '../repositories/hospital.repository';
import { AssignedPackageRepository } from '../repositories/assigned-package.repository';
import { PackageRepository } from '../../package/repositories/package.repository';
import { CreateHospitalDto } from '../dto/create-hospital.dto';
import { AssignPackageDto } from '../dto/assign-package.dto';
import { HospitalAdminProvisioningService } from './hospital-admin-provisioning.service';
import { AuditService } from '../../audit/audit.service';
import { AuditActor } from '../../audit/audit-actor';
import { MailService } from '../../mail/mail.service';

/**
 * The schema models hospital state as a `status` enum (DRAFT | ACTIVE |
 * SUSPENDED). The platform API exposes it as a boolean `isActive`, so map at
 * the boundary rather than duplicating state in the database.
 */
function withIsActive<T extends Hospital>(hospital: T) {
  return { ...hospital, isActive: hospital.status === 'ACTIVE' };
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly hospitalRepository: HospitalRepository,
    private readonly assignedPackageRepository: AssignedPackageRepository,
    private readonly packageRepository: PackageRepository,
    private readonly hospitalAdminProvisioningService: HospitalAdminProvisioningService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async createHospital(dto: CreateHospitalDto, actor?: AuditActor) {
    const existingCode = await this.hospitalRepository.findByCode(dto.code);
    if (existingCode) {
      throw new ConflictException('Hospital code already exists');
    }

    const existingEmail = await this.hospitalRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Hospital email already exists');
    }

    const hospital = await this.hospitalRepository.create(dto);

    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'HOSPITAL_CREATED',
        targetType: 'Hospital',
        targetName: hospital.name,
        detail: `Hospital created with code ${hospital.code}`,
      });
    }

    return withIsActive(hospital);
  }

  async getHospitals() {
    const hospitals = await this.hospitalRepository.findAll();
    return hospitals.map(withIsActive);
  }

  async getHospitalById(id: number) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    return withIsActive(hospital);
  }

  async suspendHospital(id: number, actor?: AuditActor) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    if (hospital.status === 'SUSPENDED') {
      throw new ConflictException('Hospital is already suspended');
    }

    // A DRAFT hospital was never active, so "already suspended" would be
    // misleading — say what is actually wrong.
    if (hospital.status !== 'ACTIVE') {
      throw new ConflictException(
        'Hospital is not active yet and cannot be suspended',
      );
    }

    const updated = await this.hospitalRepository.updateStatus(
      id,
      'SUSPENDED',
    );

    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'HOSPITAL_SUSPENDED',
        targetType: 'Hospital',
        targetName: updated.name,
        detail: `Hospital ${updated.code} suspended`,
      });
    }

    return withIsActive(updated);
  }

  async reactivateHospital(id: number, actor?: AuditActor) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    if (hospital.status === 'ACTIVE') {
      throw new ConflictException('Hospital is already active');
    }

    const updated = await this.hospitalRepository.updateStatus(
      id,
      'ACTIVE',
    );

    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'HOSPITAL_REACTIVATED',
        targetType: 'Hospital',
        targetName: updated.name,
        detail: `Hospital ${updated.code} reactivated`,
      });
    }

    return withIsActive(updated);
  }

  // Assign a package to a hospital. A hospital can have only one active package at a time.
  async assignPackage(id: number, dto: AssignPackageDto) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    const pkg = await this.packageRepository.findById(dto.packageId);
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    if (!pkg.isActive) {
      throw new BadRequestException('Package is inactive');
    }

    const activePackage =
      await this.assignedPackageRepository.findActiveByHospital(id);
    if (activePackage) {
      throw new ConflictException('Hospital already has an active package');
    }

    return this.assignedPackageRepository.create({
      tenantId: hospital.tenantId,
      packageId: dto.packageId,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  async activateHospital(id: number) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    const activePackage =
      await this.assignedPackageRepository.findActiveByHospital(id);
    if (!activePackage) {
      throw new BadRequestException('Assign a package before activation');
    }

    const updatedHospital = await this.hospitalRepository.updateStatus(
      id,
      'ACTIVE',
    );

    const provisionResult =
      await this.hospitalAdminProvisioningService.provisionIfNotExists({
        tenantId: hospital.tenantId,
        email: hospital.email,
        code:hospital.code,
        hospitalName: hospital.name,
      });

    if (provisionResult.created && provisionResult.admin.password) {
      this.mailService
        .sendHospitalActivation({
          to: hospital.email,
          hospitalName: hospital.name,
          hospitalCode: updatedHospital.code,
          adminEmail: hospital.email,
          adminPassword: provisionResult.admin.password,
          loginUrl:
            process.env.HOSPITAL_LOGIN_URL ?? 'https://his.mediops.in/login',
        })
        .catch((err) => this.logger.error('Activation email failed', err));
    }

    return {
      hospital: withIsActive(updatedHospital),
      ...provisionResult,
    };
  }
}
