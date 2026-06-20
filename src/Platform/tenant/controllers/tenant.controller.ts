import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';

import { TenantService } from '../services/tenant.service';

import { CreateHospitalDto } from '../dto/create-hospital.dto';
import { AssignPackageDto } from '../dto/assign-package.dto';

@Controller('hospitals')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  createHospital(
    @Body() dto: CreateHospitalDto,
  ) {
    return this.tenantService.createHospital(
      dto,
    );
  }

  @Get()
  getHospitals() {
    return this.tenantService.getHospitals();
  }

  @Get(':id')
  getHospitalById(
    @Param('id') id: string,
  ) {
    return this.tenantService.getHospitalById(
      id,
    );
  }

  @Post(':id/packages')
  assignPackage(
    @Param('id') hospitalId: string,

    @Body()
    dto: AssignPackageDto,
  ) {
    return this.tenantService.assignPackage(
      hospitalId,
      dto,
    );
  }

  @Post(':id/activate')
  activateHospital(
    @Param('id') hospitalId: string,
  ) {
    return this.tenantService.activateHospital(
      hospitalId,
    );
  }
}