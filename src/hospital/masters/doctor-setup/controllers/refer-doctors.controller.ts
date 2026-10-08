import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { ReferDoctorsService } from '../services/refer-doctors.service';
import { CreateReferDoctorDto } from '../dto/refer-doctor/create-refer-doctor.dto';
import { UpdateReferDoctorDto } from '../dto/refer-doctor/update-refer-doctor.dto';
import { FilterReferDoctorDto } from '../dto/refer-doctor/filter-refer-doctor.dto';
import { AssignProDto } from '../dto/refer-doctor/assign-pro.dto';

@Controller('hospital/masters/refer-doctors')
@UseGuards(HospitalJwtAuthGuard)
export class ReferDoctorsController {
  constructor(private readonly service: ReferDoctorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateReferDoctorDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterReferDoctorDto,
  ) {
    return this.service.findAll(tenantId, filters);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferDoctorDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  // ─── Reassign PRO (marketing) ownership ────────────────────────────────────
  @Patch(':id/assign-pro')
  assignPro(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProDto,
  ) {
    return this.service.assignPro(tenantId, id, dto.proUserId);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
