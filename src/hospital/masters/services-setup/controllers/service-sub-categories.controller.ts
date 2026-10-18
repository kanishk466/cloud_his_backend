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
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { ServiceSubCategoriesService } from '../services/service-sub-categories.service';
import { CreateServiceSubCategoryDto } from '../dto/sub-category/create-service-sub-category.dto';
import { UpdateServiceSubCategoryDto } from '../dto/sub-category/update-service-sub-category.dto';

@Controller('hospital/masters/service-sub-categories')
@UseGuards(HospitalJwtAuthGuard)
export class ServiceSubCategoriesController {
  constructor(private readonly service: ServiceSubCategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServiceSubCategoryDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
  }

  // ─── Dropdown source: sub-categories of one category ──────────────────────
  // NOTE: declared before @Get(':id') so 'by-category' is not parsed as an id.
  @Get('by-category/:categoryId')
  findByCategory(
    @CurrentTenant() tenantId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query('active') active?: string,
  ) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findByCategory(tenantId, categoryId, isActive);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceSubCategoryDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
