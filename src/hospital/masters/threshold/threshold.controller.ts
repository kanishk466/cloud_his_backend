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
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { ThresholdService } from './threshold.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

@Controller('hospital/masters/thresholds')
@UseGuards(HospitalJwtAuthGuard)
export class ThresholdController {
  constructor(private readonly service: ThresholdService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateThresholdDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
  }

  // NOTE: declared before @Get(':id')
  /** All thresholds for a panel (general + room-specific). */
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
    @Body() dto: UpdateThresholdDto,
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
