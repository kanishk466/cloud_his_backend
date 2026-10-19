import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

/**
 * Payments hang off the admission (`/api/ipd/admissions/:id/payments`) — the
 * same base path the admission controller uses; routes do not overlap.
 */
@Controller('ipd/admissions')
@UseGuards(HospitalJwtAuthGuard)
export class IpdPaymentsController {
  constructor(private readonly service: BillingService) {}

  /** POST /api/ipd/admissions/:id/payments — record a receipt. */
  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  record(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.service.recordPayment(tenantId, userId, id, dto);
  }

  /** GET /api/ipd/admissions/:id/payments — receipts, newest first. */
  @Get(':id/payments')
  findAll(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listPayments(tenantId, id);
  }
}
