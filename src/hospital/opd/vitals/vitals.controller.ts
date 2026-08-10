import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VitalsService } from './vitals.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { UpdateVitalsDto } from './dto/update-vitals.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import {HospitalJwtStrategy } from '../../identity/strategies/hospital-jwt.strategy';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@Controller('opd/vitals')
@UseGuards(HospitalJwtAuthGuard, HospitalJwtStrategy)
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  // ─── POST /opd/vitals ───────────────────────────────────────────
  // Record patient vitals (by nurse/staff)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async recordVitals(
    @Body() dto: CreateVitalsDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vitalsService.recordVitals(tenantId, user.userId, dto);
  }

  // ─── GET /opd/vitals/appointment/:appointmentId ─────────────────
  // Get vitals for a specific appointment
  // Used by doctor when viewing patient
  @Get('appointment/:appointmentId')
  async findByAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.vitalsService.findByAppointmentId(
      tenantId,
      appointmentId,
    );

    return {
      success: true,
      data: result,
      message: result ? undefined : 'No vitals recorded for this appointment',
    };
  }

  // ─── GET /opd/vitals/patient/:patientId/latest ──────────────────
  // Get most recent vitals for patient
  @Get('patient/:patientId/latest')
  async findLatest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.vitalsService.findLatestByPatientId(
      tenantId,
      patientId,
    );

    return {
      success: true,
      data: result,
      message: result ? undefined : 'No vitals history found',
    };
  }

  // ─── GET /opd/vitals/patient/:patientId/history ─────────────────
  // Get all vitals history for patient (paginated)
  @Get('patient/:patientId/history')
  async getHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentTenant() tenantId: string,
  ) {
    return this.vitalsService.getPatientHistory(
      tenantId,
      patientId,
      parseInt(page),
      parseInt(limit),
    );
  }

  // ─── GET /opd/vitals/patient/:patientId/trend ──────────────────
  // Get vitals trend data for charts
  @Get('patient/:patientId/trend')
  async getTrend(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('lastN') lastN: string = '10',
    @CurrentTenant() tenantId: string,
  ) {
    return this.vitalsService.getVitalsTrend(
      tenantId,
      patientId,
      parseInt(lastN),
    );
  }

  // ─── GET /opd/vitals/:id ───────────────────────────────────────
  // Get specific vitals record
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vitalsService.findById(tenantId, id);
  }

  // ─── PATCH /opd/vitals/:id ──────────────────────────────────────
  // Update vitals record
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVitalsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vitalsService.updateVitals(tenantId, id, dto);
  }
}