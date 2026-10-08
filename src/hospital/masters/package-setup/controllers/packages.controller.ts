import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { PackagesService } from '../services/packages.service';
import { CreatePackageDto } from '../dto/package/create-package.dto';
import { UpdatePackageDto } from '../dto/package/update-package.dto';
import { FilterPackageDto } from '../dto/package/filter-package.dto';
import { SyncPackageComponentsDto } from '../dto/component/sync-package-components.dto';
import { SyncPackageConsultsDto } from '../dto/consult/sync-package-consults.dto';
import { SyncPackageExclusionsDto } from '../dto/exclusion/sync-package-exclusions.dto';

@Controller('hospital/masters/packages')
@UseGuards(HospitalJwtAuthGuard)
export class PackagesController {
  constructor(private readonly service: PackagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePackageDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterPackageDto,
  ) {
    return this.service.findAll(tenantId, filters);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  /** Full breakdown: components, consults, exclusions, roomType, SKU. */
  @Get(':id/details')
  getDetails(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getDetails(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Put(':id/components')
  syncComponents(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncPackageComponentsDto,
  ) {
    return this.service.syncComponents(tenantId, id, dto);
  }

  @Put(':id/consults')
  syncConsults(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncPackageConsultsDto,
  ) {
    return this.service.syncConsults(tenantId, id, dto);
  }

  @Put(':id/exclusions')
  syncExclusions(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncPackageExclusionsDto,
  ) {
    return this.service.syncExclusions(tenantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
