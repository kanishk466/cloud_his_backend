import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PackageRepository }
from '../repositories/package.repository';

import { ModuleRepository }
from '../../catalog/repositories/module.repository';

import {CreatePackageDto} from '../dto/create-package.dto';

@Injectable()
export class PackageService {
  constructor(
    private readonly packageRepository:
      PackageRepository,

    private readonly moduleRepository:
      ModuleRepository,
  ) {}

  async createPackage(
  dto: CreatePackageDto,
) {
  const existingPackage =
    await this.packageRepository
      .findByName(dto.name);

  if (existingPackage) {
    throw new ConflictException(
      'Package name already exists',
    );
  }

  return this.packageRepository.create(dto);
}


async getPackages() {
  return this.packageRepository.findAll();
}

async getPackageById(
  id: string,
) {
  const pkg =
    await this.packageRepository.findById(
      id,
    );

  if (!pkg) {
    throw new NotFoundException(
      'Package not found',
    );
  }

  return pkg;
}   


async attachModule(
  packageId: string,
  moduleId: string,
) {
  const pkg =
    await this.packageRepository.findById(
      packageId,
    );

  if (!pkg) {
    throw new NotFoundException(
      'Package not found',
    );
  }

  const module =
    await this.moduleRepository.findById(
      moduleId,
    );

  if (!module) {
    throw new NotFoundException(
      'Module not found',
    );
  }

  if (!module.isActive) {
    throw new BadRequestException(
      'Module is inactive',
    );
  }

  const alreadyAttached =
    pkg.modules.some(
      item => item.moduleId === moduleId,
    );

  if (alreadyAttached) {
    throw new ConflictException(
      'Module already attached',
    );
  }

  return this.packageRepository.attachModule(
    packageId,
    moduleId,
  );
}

}