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
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalJwtStrategy } from '../../identity/strategies/hospital-jwt.strategy';
import {
  CurrentTenant,
} from '../../core/decorators/current-tenant.decorator';
import * as currentUserDecorator from '../../core/decorators/current-user.decorator';

@Controller('opd/patients')
@UseGuards(HospitalJwtAuthGuard, HospitalJwtStrategy)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  ) {}

  // ─── POST /opd/patients ──────────────────────────────────────────
  // Register new patient
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: CreatePatientDto,
    @CurrentTenant() tenantId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.patientsService.register(
      tenantId,
      user.userId,
      dto,
    );
  }

  // ─── GET /opd/patients ───────────────────────────────────────────
  // Search / list patients
  @Get()
  async search(
    @Query() dto: SearchPatientDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.search(tenantId, dto);
  }

  // ─── GET /opd/patients/uhid/:uhid ────────────────────────────────
  // Get patient by UHID (used at reception)
  @Get('uhid/:uhid')
  async findByUhid(
    @Param('uhid') uhid: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.findByUhid(tenantId, uhid);
  }

  // ─── GET /opd/patients/:id ───────────────────────────────────────
  // Get patient by ID
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.findById(tenantId, id);
  }

  // ─── PATCH /opd/patients/:id ─────────────────────────────────────
  // Update patient info
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.update(tenantId, id, dto);
  }

  // ─── GET /opd/patients/:id/history ──────────────────────────────
  // Get patient visit history
  @Get(':id/history')
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getVisitHistory(
      tenantId,
      id,
      page,
      limit,
    );
  }
}