import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { HospitalRepository } from '../repositories/hospital.repository';
import { AssignedPackageRepository } from '../repositories/assigned-package.repository';

import { PackageRepository } from '../../package/repositories/package.repository';

import { CreateHospitalDto } from '../dto/create-hospital.dto';
import { AssignPackageDto } from '../dto/assign-package.dto';
import { HospitalAdminProvisioningService } from './hospital-admin-provisioning.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly hospitalRepository: HospitalRepository,

    private readonly assignedPackageRepository:
      AssignedPackageRepository,

    private readonly packageRepository:
      PackageRepository,

       private readonly hospitalAdminProvisioningService: HospitalAdminProvisioningService,
  ) {}

  async createHospital(
  dto: CreateHospitalDto,
) {
  const existingCode =
    await this.hospitalRepository.findByCode(
      dto.code,
    );

  if (existingCode) {
    throw new ConflictException(
      'Hospital code already exists',
    );
  }

  const existingEmail =
    await this.hospitalRepository.findByEmail(
      dto.email,
    );

  if (existingEmail) {
    throw new ConflictException(
      'Hospital email already exists',
    );
  }

  return this.hospitalRepository.create(
    dto,
  );
}

async getHospitals() {
  return this.hospitalRepository.findAll();
}

async getHospitalById(
  id: string,
) {
  const hospital =
    await this.hospitalRepository.findById(
      id,
    );

  if (!hospital) {
    throw new NotFoundException(
      'Hospital not found',
    );
  }

  return hospital;
}

async assignPackage(
  hospitalId: string,
  dto: AssignPackageDto,
) {
  const hospital =
    await this.hospitalRepository.findById(
      hospitalId,
    );

  if (!hospital) {
    throw new NotFoundException(
      'Hospital not found',
    );
  }

  const pkg =
    await this.packageRepository.findById(
      dto.packageId,
    );

  if (!pkg) {
    throw new NotFoundException(
      'Package not found',
    );
  }

  if (!pkg.isActive) {
    throw new BadRequestException(
      'Package is inactive',
    );
  }

  const activePackage =
    await this.assignedPackageRepository
      .findActiveByHospital(
        hospitalId,
      );

  if (activePackage) {
    throw new ConflictException(
      'Hospital already has an active package',
    );
  }

  return this.assignedPackageRepository.create({
    hospitalId,
    packageId: dto.packageId,
    startDate: new Date(
      dto.startDate,
    ),
    endDate: dto.endDate
      ? new Date(dto.endDate)
      : undefined,
  });
}


async activateHospital(hospitalId: string) {
  const hospital = await this.hospitalRepository.findById(hospitalId);

  if (!hospital) {
    throw new NotFoundException('Hospital not found');
  }

  const activePackage =
    await this.assignedPackageRepository.findActiveByHospital(hospitalId);

  if (!activePackage) {
    throw new BadRequestException('Assign a package before activation');
  }

  // Activate hospital
  const updatedHospital = await this.hospitalRepository.updateStatus(
    hospitalId,
    'ACTIVE',
  );

  // Provision hospital admin (email = hospital.email)
const provisionResult =
  await this.hospitalAdminProvisioningService.provisionIfNotExists({
    hospitalId,
    email: hospital.email,
    hospitalName: hospital.name,
  });
  // Normal API response
  return {
    hospital: updatedHospital,
    ...provisionResult, // { created, admin }
  };
}



}