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
import { ObservationHelpsService } from '../services/observation-helps.service';
import { CreateObservationHelpDto } from '../dto/observation-help/create-observation-help.dto';
import { UpdateObservationHelpDto } from '../dto/observation-help/update-observation-help.dto';

@Controller('hospital/masters/observation-helps')
@UseGuards(HospitalJwtAuthGuard)
export class ObservationHelpsController {
  constructor(private readonly service: ObservationHelpsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateObservationHelpDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
  }

  @Get('observation/:observationId')
  findForObservation(
    @CurrentTenant() tenantId: string,
    @Param('observationId', ParseUUIDPipe) observationId: string,
  ) {
    return this.service.findForObservation(tenantId, observationId);
  }

  /** Aggregated help for every observation in an investigation (entry screen). */
  @Get('investigation/:investigationId')
  findForInvestigation(
    @CurrentTenant() tenantId: string,
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
  ) {
    return this.service.findForInvestigation(tenantId, investigationId);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateObservationHelpDto,
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
