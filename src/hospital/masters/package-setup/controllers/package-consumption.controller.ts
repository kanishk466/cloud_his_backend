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
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { PackageConsumptionEngineService } from '../services/package-consumption-engine.service';
import { RecordConsumptionDto } from '../dto/consumption/record-consumption.dto';

@Controller('hospital/masters/package-consumption')
@UseGuards(HospitalJwtAuthGuard)
export class PackageConsumptionController {
  constructor(private readonly engine: PackageConsumptionEngineService) {}

  /** Is this item covered by the patient's package? (pre-billing check) */
  @Get('evaluate')
  evaluate(
    @CurrentTenant() tenantId: string,
    @Query('patientId', ParseUUIDPipe) patientId: string,
    @Query('packageId', ParseUUIDPipe) packageId: string,
    @Query('serviceId') serviceId?: string,
    @Query('doctorProfileId') doctorProfileId?: string,
  ) {
    return this.engine.evaluateConsumption(tenantId, patientId, packageId, {
      serviceId,
      doctorProfileId,
    });
  }

  /** Write the consumption ledger row (covered or extra-billed). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(@CurrentTenant() tenantId: string, @Body() dto: RecordConsumptionDto) {
    return this.engine.recordConsumption(tenantId, dto);
  }

  /** Usage history for a patient in one package. */
  @Get('usage/:packageId/:patientId')
  getUsage(
    @CurrentTenant() tenantId: string,
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.engine.getUsage(tenantId, packageId, patientId);
  }
}
