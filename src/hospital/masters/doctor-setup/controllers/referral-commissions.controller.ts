import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { ReferralCommissionsService } from '../services/referral-commissions.service';
import { FilterCommissionsDto } from '../dto/commission/filter-commissions.dto';
import { SettleCommissionDto } from '../dto/commission/settle-commission.dto';
import { BulkSettleCommissionsDto } from '../dto/commission/bulk-settle-commissions.dto';

// ⚠️ ROUTE ORDER: this controller MUST be registered before
// ReferDoctorsController in DoctorSetupModule — otherwise
// 'commissions' is swallowed by ReferDoctorsController's @Get(':id').
@Controller('hospital/masters/refer-doctors/commissions')
@UseGuards(HospitalJwtAuthGuard)
export class ReferralCommissionsController {
  constructor(private readonly service: ReferralCommissionsService) {}

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterCommissionsDto,
  ) {
    return this.service.findAll(tenantId, filters);
  }

  // NOTE: declared before @Patch(':id')-style dynamic routes
  @Get('summary')
  getSummary(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterCommissionsDto,
  ) {
    return this.service.getSummary(tenantId, filters);
  }

  @Post('bulk-settle')
  @HttpCode(HttpStatus.OK)
  bulkSettle(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: BulkSettleCommissionsDto,
  ) {
    return this.service.bulkSettle(tenantId, dto, userId);
  }

  @Patch(':id/settle')
  settle(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleCommissionDto,
  ) {
    return this.service.settle(tenantId, id, dto, userId);
  }
}
