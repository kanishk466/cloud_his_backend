import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { VitalsService } from './vitals.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { ClinicalFilterDto } from './dto/clinical-filter.dto';

@Controller('ipd/vitals')
@UseGuards(HospitalJwtAuthGuard)
export class VitalsController {
  constructor(private readonly service: VitalsService) {}

  /** POST /api/ipd/vitals — record an observation set. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVitalsDto,
  ) {
    return this.service.record(tenantId, userId, dto);
  }

  /** GET /api/ipd/vitals?admissionId=…&limit=… — newest first. */
  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: ClinicalFilterDto,
  ) {
    return this.service.list(tenantId, filters);
  }
}
