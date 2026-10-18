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
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { ClinicalFilterDto } from './dto/clinical-filter.dto';

@Controller('ipd/rounds')
@UseGuards(HospitalJwtAuthGuard)
export class RoundsController {
  constructor(private readonly service: RoundsService) {}

  /** POST /api/ipd/rounds — add a round note. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRoundDto,
  ) {
    return this.service.record(tenantId, userId, dto);
  }

  /** GET /api/ipd/rounds?admissionId=…&limit=… — newest first. */
  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: ClinicalFilterDto,
  ) {
    return this.service.list(tenantId, filters);
  }
}
