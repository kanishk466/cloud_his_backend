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
import { RateSchedulesService } from '../services/rate-schedules.service';
import { RateResolverService } from '../services/rate-resolver.service';
import { CreateRateScheduleDto } from '../dto/rate-schedule/create-rate-schedule.dto';
import { UpdateRateScheduleDto } from '../dto/rate-schedule/update-rate-schedule.dto';
import { ResolveScheduleDto } from '../dto/rate-schedule/resolve-schedule.dto';

@Controller('hospital/masters/rate-schedules')
@UseGuards(HospitalJwtAuthGuard)
export class RateSchedulesController {
  constructor(
    private readonly service: RateSchedulesService,
    private readonly resolver: RateResolverService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRateScheduleDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
  }

  // NOTE: static/multi-segment routes before @Get(':id')

  /** Effective-date tariff resolution (used by billing engines). */
  @Get('resolve')
  resolve(
    @CurrentTenant() tenantId: string,
    @Query() query: ResolveScheduleDto,
  ) {
    return this.resolver.resolveActiveTariff(
      tenantId,
      query.panelId,
      query.targetDate ?? new Date(),
      query.context ?? 'OPD',
    );
  }

  /** All schedules for a panel, newest revision first. */
  @Get('panel/:panelId')
  findByPanel(
    @CurrentTenant() tenantId: string,
    @Param('panelId', ParseUUIDPipe) panelId: string,
  ) {
    return this.service.findByPanel(tenantId, panelId);
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
    @Body() dto: UpdateRateScheduleDto,
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
