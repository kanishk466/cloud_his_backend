import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';

import { PackageService } from '../services/package.service';

import { CreatePackageDto } from '../dto/create-package.dto';

@Controller('packages')
@UseGuards(JwtAuthGuard)
export class PackageController {
  constructor(
    private readonly packageService: PackageService,
  ) {}

  @Post()
  createPackage(
    @Body() dto: CreatePackageDto,
  ) {
    return this.packageService.createPackage(
      dto,
    );
  }

  @Get()
  getPackages() {
    return this.packageService.getPackages();
  }

  @Get(':id')
  getPackageById(
    @Param('id') id: string,
  ) {
    return this.packageService.getPackageById(
      id,
    );
  }

  @Post(
    ':packageId/modules/:moduleId',
  )
  attachModule(
    @Param('packageId')
    packageId: string,

    @Param('moduleId')
    moduleId: string,
  ) {
    return this.packageService.attachModule(
      packageId,
      moduleId,
    );
  }
}