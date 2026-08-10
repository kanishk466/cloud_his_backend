import {
  Controller, Post, Get, Patch, Delete,
  Body, Param, Query, UseGuards,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { AddPrescriptionDto } from './dto/add-prescription.dto';
import { AddInvestigationDto } from './dto/add-investigation.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalJwtStrategy } from '../../identity/strategies/hospital-jwt.strategy';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';

@Controller('opd/consultations')
@UseGuards(HospitalJwtAuthGuard, HospitalJwtStrategy)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  // POST /opd/consultations — Start consultation
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async start(
    @Body() dto: CreateConsultationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.startConsultation(tenantId, dto);
  }

  // GET /opd/consultations/appointment/:appointmentId
  @Get('appointment/:appointmentId')
  async findByAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.consultationsService.findByAppointmentId(tenantId, appointmentId);
    return { success: true, data: result, message: result ? undefined : 'No consultation found' };
  }

  // GET /opd/consultations/patient/:patientId/history
  @Get('patient/:patientId/history')
  async getPatientHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit: string = '5',
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.getPatientHistory(tenantId, patientId, parseInt(limit));
  }

  // GET /opd/consultations/:id
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.findById(tenantId, id);
  }

  // PATCH /opd/consultations/:id — Update/auto-save consultation
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConsultationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.update(tenantId, id, dto);
  }

  // PATCH /opd/consultations/:id/complete — Complete consultation
  @Patch(':id/complete')
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.complete(tenantId, id);
  }

  // POST /opd/consultations/:id/prescriptions — Add prescription
  @Post(':id/prescriptions')
  @HttpCode(HttpStatus.CREATED)
  async addPrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPrescriptionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.addPrescription(tenantId, id, dto);
  }

  // DELETE /opd/consultations/:id/prescriptions/:rxId
  @Delete(':id/prescriptions/:rxId')
  async removePrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rxId', ParseUUIDPipe) rxId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.removePrescription(tenantId, id, rxId);
  }

  // POST /opd/consultations/:id/investigations — Add investigation
  @Post(':id/investigations')
  @HttpCode(HttpStatus.CREATED)
  async addInvestigation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInvestigationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.addInvestigation(tenantId, id, dto);
  }

  // DELETE /opd/consultations/:id/investigations/:invId
  @Delete(':id/investigations/:invId')
  async removeInvestigation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invId', ParseUUIDPipe) invId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consultationsService.removeInvestigation(tenantId, id, invId);
  }
}