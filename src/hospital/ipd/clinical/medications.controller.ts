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
import { MedicationsService } from './medications.service';
import {
  CreateMedicationDto,
  StopMedicationDto,
} from './dto/create-medication.dto';
import { ClinicalFilterDto } from './dto/clinical-filter.dto';
import { IsIn, IsOptional } from 'class-validator';

/** `GET /ipd/medications?admissionId=…&status=ACTIVE|STOPPED`. */
class FilterMedicationsDto extends ClinicalFilterDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'STOPPED'])
  status?: string;
}

@Controller('ipd/medications')
@UseGuards(HospitalJwtAuthGuard)
export class MedicationsController {
  constructor(private readonly service: MedicationsService) {}

  /** POST /api/ipd/medications — order a drug. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  order(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.service.order(tenantId, userId, dto);
  }

  /** GET /api/ipd/medications?admissionId=…&status=… */
  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterMedicationsDto,
  ) {
    return this.service.list(tenantId, filters.admissionId, filters.status);
  }

  /** POST /api/ipd/medications/:id/stop */
  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stop(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StopMedicationDto,
  ) {
    return this.service.stop(tenantId, userId, id, dto);
  }
}
