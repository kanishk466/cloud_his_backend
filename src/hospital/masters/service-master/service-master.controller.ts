import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ServiceMasterService } from './service-master.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';


@Controller('hospital/masters/services')
@UseGuards(HospitalJwtAuthGuard)
export class ServiceMasterController {
  constructor(private readonly service: ServiceMasterService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateServiceDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  list(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.service.list(tenantId, search, category);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(tenantId, id);
  }
}