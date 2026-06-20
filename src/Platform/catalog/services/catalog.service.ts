import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRepository } from '../repositories/module.repository';
import { FeatureRepository } from '../repositories/feature.repository';
import { CreateModuleDto } from '../dto/create-module.dto';
import { CreateFeatureDto } from '../dto/create-feature.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly moduleRepository: ModuleRepository,
    private readonly featureRepository: FeatureRepository,
  ) {}



  async createModule(
  dto: CreateModuleDto,
) {
  const existingModule =
    await this.moduleRepository.findByCode(
      dto.code,
    );

  if (existingModule) {
    throw new ConflictException(
      'Module code already exists',
    );
  }

  if (dto.parentId) {
    const parentModule =
      await this.moduleRepository.findById(
        dto.parentId,
      );

    if (!parentModule) {
      throw new NotFoundException(
        'Parent module not found',
      );
    }
  }

  return this.moduleRepository.create(dto);
}


async createFeature(
  dto: CreateFeatureDto,
) {
  const existingFeature =
    await this.featureRepository.findByCode(
      dto.code,
    );

  if (existingFeature) {
    throw new ConflictException(
      'Feature code already exists',
    );
  }

  return this.featureRepository.create(dto);
}


async attachFeature(
  moduleId: string,
  featureId: string,
) {
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

  const feature =
    await this.featureRepository.findById(
      featureId,
    );

  if (!feature) {
    throw new NotFoundException(
      'Feature not found',
    );
  }

  const alreadyAttached =
    module.features.some(
      item =>
        item.featureId === featureId,
    );

  if (alreadyAttached) {
    throw new ConflictException(
      'Feature already attached',
    );
  }

  return this.moduleRepository.attachFeature(
    moduleId,
    featureId,
  );
}


async getModules() {
  return this.moduleRepository.findAll();
}

}