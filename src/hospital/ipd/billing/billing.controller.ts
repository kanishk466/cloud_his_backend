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
import { BillingService } from './billing.service';
import { CreateChargeDto, FilterChargesDto } from './dto/create-charge.dto';
import { DailyAccrualDto } from './dto/daily-accrual.dto';

@Controller('ipd/billing')
@UseGuards(HospitalJwtAuthGuard)
export class BillingController {
  constructor(private readonly service: BillingService) {}

  /** POST /api/ipd/billing/charges — post a running-bill line. */
  @Post('charges')
  @HttpCode(HttpStatus.CREATED)
  addCharge(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.service.addCharge(tenantId, userId, dto);
  }

  /** GET /api/ipd/billing/charges?admissionId=…&limit=… */
  @Get('charges')
  listCharges(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterChargesDto,
  ) {
    return this.service.listCharges(tenantId, filters.admissionId, filters.limit);
  }

  // NOTE: static routes before ':admissionId' reads
  /** POST /api/ipd/billing/daily-accrual — room + nursing for a day. */
  @Post('daily-accrual')
  @HttpCode(HttpStatus.OK)
  runDailyAccrual(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: DailyAccrualDto,
  ) {
    return this.service.runDailyAccrual(tenantId, userId, dto);
  }

  /** GET /api/ipd/billing/provisional/:admissionId — the running bill. */
  @Get('provisional/:admissionId')
  provisional(
    @CurrentTenant() tenantId: string,
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
  ) {
    return this.service.provisional(tenantId, admissionId);
  }
}
