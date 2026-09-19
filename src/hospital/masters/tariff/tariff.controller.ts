import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TariffService } from './tariff.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { SetServiceRateDto } from './dto/set-service-rate.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';

@Controller('hospital/masters/tariffs')
@UseGuards(HospitalJwtAuthGuard)
export class TariffController {
  constructor(private readonly service: TariffService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateTariffDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query('search') search?: string) {
    return this.service.list(tenantId, search);
  }

  @Get('dropdown')
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.getDropdown(tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTariffDto>,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(tenantId, id);
  }

  // ─── Rate mapping endpoints ───
  @Post(':id/rates')
  setRate(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetServiceRateDto,
  ) {
    return this.service.setServiceRate(tenantId, id, dto);
  }

  @Post(':id/rates/bulk')
  bulkSetRates(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('rates') rates: SetServiceRateDto[],
  ) {
    return this.service.bulkSetRates(tenantId, id, rates);
  }

  @Delete(':id/rates/:serviceId')
  removeRate(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.service.removeServiceRate(tenantId, id, serviceId);
  }
}