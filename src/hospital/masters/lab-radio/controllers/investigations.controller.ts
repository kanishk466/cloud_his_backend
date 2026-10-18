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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { InvestigationsService } from '../services/investigations.service';
import { CreateInvestigationDto } from '../dto/investigation/create-investigation.dto';
import { UpdateInvestigationDto } from '../dto/investigation/update-investigation.dto';
import { FilterInvestigationDto } from '../dto/investigation/filter-investigation.dto';
import { AssignObservationsDto } from '../dto/observation/assign-observation.dto';

@Controller('hospital/masters/investigations')
@UseGuards(HospitalJwtAuthGuard)
export class InvestigationsController {
  constructor(private readonly service: InvestigationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateInvestigationDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterInvestigationDto,
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

  /** Full detail: dept + service + ordered observations + reference ranges. */
  @Get(':id/details')
  getDetails(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getDetails(tenantId, id);
  }

  /** Atomic replace of the investigation's observation set (ordered). */
  @Put(':id/observations')
  assignObservations(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignObservationsDto,
  ) {
    return this.service.assignObservations(tenantId, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationDto,
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
