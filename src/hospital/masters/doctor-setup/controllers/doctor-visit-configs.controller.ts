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
import { DoctorVisitConfigsService } from '../services/doctor-visit-configs.service';
import { CreateVisitConfigDto } from '../dto/visit-config/create-visit-config.dto';
import { UpdateVisitConfigDto } from '../dto/visit-config/update-visit-config.dto';
import { CalculateVisitFeeDto } from '../dto/visit-config/calculate-visit-fee.dto';

@Controller('hospital/masters/doctor-visit-configs')
@UseGuards(HospitalJwtAuthGuard)
export class DoctorVisitConfigsController {
  constructor(private readonly service: DoctorVisitConfigsService) {}

  /** Upsert: creates or updates the rule for (doctorProfileId, panelId|null). */
  @Post()
  @HttpCode(HttpStatus.OK)
  upsert(@CurrentTenant() tenantId: string, @Body() dto: CreateVisitConfigDto) {
    return this.service.upsert(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
  }

  // NOTE: static/multi-segment routes declared before @Get(':id')
  @Get('calculate')
  calculate(
    @CurrentTenant() tenantId: string,
    @Query() query: CalculateVisitFeeDto,
  ) {
    return this.service.calculateVisitFee(tenantId, query);
  }

  @Get('doctor/:doctorProfileId')
  findForDoctor(
    @CurrentTenant() tenantId: string,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
  ) {
    return this.service.findForDoctor(tenantId, doctorProfileId);
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
    @Body() dto: UpdateVisitConfigDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
