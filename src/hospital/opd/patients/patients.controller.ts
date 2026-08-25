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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../core/decorators/current-user.decorator';

@Controller('opd/patients')
@UseGuards(HospitalJwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // ─── POST /opd/patients ──────────────────────────────────────────
  // Register new patient
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // ✅ Fixed: Order now matches (tenantId, dto, userId)
    return this.patientsService.register(tenantId, dto, user.userId);
  }

  // ─── GET /opd/patients ───────────────────────────────────────────
  // Search / list patients
  @Get()
  async search(
    @CurrentTenant() tenantId: string,
    @Query() dto: SearchPatientDto,
  ) {
    return this.patientsService.search(tenantId, dto);
  }

  // ─── GET /opd/patients/uhid/:uhid ────────────────────────────────
  // Get patient by UHID (used at reception)
  @Get('uhid/:uhid')
  async findByUhid(
    @CurrentTenant() tenantId: string,
    @Param('uhid') uhid: string,
  ) {
    return this.patientsService.findByUhid(tenantId, uhid);
  }

  // ─── GET /opd/patients/:id ───────────────────────────────────────
  // Get patient by ID
  @Get(':id')
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findById(tenantId, id);
  }

  // ─── PATCH /opd/patients/:id ─────────────────────────────────────
  // Update patient info
  @Patch(':id')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(tenantId, id, dto);
  }

  // ─── GET /opd/patients/:id/history ──────────────────────────────
  // Get patient visit history
  @Get(':id/history')
  async getHistory(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.patientsService.getVisitHistory(tenantId, id, page, limit);
  }
}