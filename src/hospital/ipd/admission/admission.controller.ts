import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { AdmissionService } from './admission.service';
import { AdmissionWorkflowService } from './admission-workflow.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { AssignBedDto } from './dto/assign-bed.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';
import { InitiateDischargeDto } from './dto/initiate-discharge.dto';
import { FilterAdmissionDto } from './dto/filter-admission.dto';

@Controller('ipd/admissions')
@UseGuards(HospitalJwtAuthGuard)
export class AdmissionController {
  constructor(
    private readonly service: AdmissionService,
    private readonly workflow: AdmissionWorkflowService,
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  admit(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAdmissionDto,
  ) {
    return this.workflow.admitPatient(tenantId, dto, userId);
  }

  @Post(':id/assign-bed')
  @HttpCode(HttpStatus.OK)
  assignBed(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignBedDto,
  ) {
    return this.workflow.assignBed(tenantId, id, dto, userId);
  }

  @Post(':id/transfer-bed')
  @HttpCode(HttpStatus.OK)
  transferBed(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferBedDto,
  ) {
    return this.workflow.transferBed(tenantId, id, dto, userId);
  }

  @Post(':id/initiate-discharge')
  @HttpCode(HttpStatus.OK)
  initiateDischarge(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitiateDischargeDto,
  ) {
    return this.workflow.initiateDischarge(tenantId, id, dto, userId);
  }

  @Post(':id/complete-discharge')
  @HttpCode(HttpStatus.OK)
  completeDischarge(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflow.completeDischarge(tenantId, id, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.workflow.cancelAdmission(tenantId, id, reason, userId);
  }

  // ─── Reads ─────────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterAdmissionDto,
  ) {
    return this.service.findAll(tenantId, filters);
  }

  // NOTE: declared before @Get(':id')
  /** Shorthand: status IN (ADMITTED, DISCHARGE_ORDERED). */
  @Get('active')
  findActive(@CurrentTenant() tenantId: string) {
    return this.service.findActive(tenantId);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }
}
