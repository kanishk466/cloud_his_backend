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
  ParseIntPipe,
  Optional,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { GetSlotsDto } from './dto/get-slots.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalJwtStrategy } from '../../identity/strategies/hospital-jwt.strategy';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@Controller('opd/appointments')
@UseGuards(HospitalJwtAuthGuard, HospitalJwtStrategy)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

  // ─── POST /opd/appointments ─────────────────────────────────────
  // Book new appointment (walk-in or scheduled)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async book(
    @Body() dto: CreateAppointmentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.book(tenantId, user.userId, dto);
  }

  // ─── GET /opd/appointments ──────────────────────────────────────
  // List / filter appointments
  @Get()
  async findMany(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
    @Query('doctorProfileId') doctorProfileId?: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('appointmentType') appointmentType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appointmentsService.findMany(tenantId, {
      date,
      doctorProfileId,
      patientId,
      status,
      appointmentType,
      departmentId: departmentId ? parseInt(departmentId) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ─── GET /opd/appointments/slots ────────────────────────────────
  // Get available slots for a doctor on a date
  // Must come BEFORE /:id route
  @Get('slots')
  async getSlots(
    @Query() dto: GetSlotsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.getAvailableSlots(tenantId, dto);
  }

  // ─── GET /opd/appointments/today ────────────────────────────────
  // Today's appointments for logged-in doctor
  @Get('today')
  async getToday(
    @CurrentTenant() tenantId: string,
    @Query('doctorProfileId') doctorProfileId: string,
  ) {
    return this.appointmentsService.getTodayAppointments(
      tenantId,
      doctorProfileId,
    );
  }

  // ─── GET /opd/appointments/:id ──────────────────────────────────
  // Get single appointment detail
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.findById(tenantId, id);
  }

  // ─── PATCH /opd/appointments/:id/check-in ───────────────────────
  // Check-in patient at reception
  @Patch(':id/check-in')
  async checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.checkIn(
      tenantId,
      id,
      user.userId,
    );
  }

  // ─── PATCH /opd/appointments/:id/cancel ─────────────────────────
  // Cancel appointment
  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.cancel(
      tenantId,
      id,
      dto,
      user.userId,
    );
  }
}