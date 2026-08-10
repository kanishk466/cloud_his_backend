import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CancelBillDto } from './dto/cancel-bill.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalJwtStrategy } from '../../identity/strategies/hospital-jwt.strategy';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@Controller('opd/billing')
@UseGuards(HospitalJwtAuthGuard, HospitalJwtStrategy)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // POST /opd/billing — Generate bill
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async generateBill(
    @Body() dto: CreateBillDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billingService.generateBill(tenantId, user.userId, dto);
  }

  // GET /opd/billing — List bills
  @Get()
  async findMany(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('date') date?: string,
    @Query('billStatus') billStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.findMany(tenantId, {
      patientId,
      date,
      billStatus,
      paymentStatus,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // GET /opd/billing/daily-summary
  @Get('daily-summary')
  async getDailySummary(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.billingService.getDailySummary(tenantId, date);
  }

  // GET /opd/billing/appointment/:appointmentId
  @Get('appointment/:appointmentId')
  async findByAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.billingService.findByAppointmentId(tenantId, appointmentId);
    return { success: true, data: result, message: result ? undefined : 'No bill found' };
  }

  // GET /opd/billing/:id
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.billingService.findById(tenantId, id);
  }

  // POST /opd/billing/:id/payments — Collect payment
  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  async collectPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CollectPaymentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billingService.collectPayment(tenantId, id, user.userId, dto);
  }

  // PATCH /opd/billing/:id/discount — Apply discount
  @Patch(':id/discount')
  async applyDiscount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyDiscountDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.billingService.applyDiscount(tenantId, id, dto);
  }

  // PATCH /opd/billing/:id/cancel — Cancel bill
  @Patch(':id/cancel')
  async cancelBill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBillDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.billingService.cancelBill(tenantId, id, dto);
  }
}