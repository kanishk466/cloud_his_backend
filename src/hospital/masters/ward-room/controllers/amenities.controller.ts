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
import { AmenitiesService } from '../services/amenities.service';
import { CreateAmenityDto } from '../dto/amenity/create-amenity.dto';

@Controller('hospital/masters/bed-amenities')
@UseGuards(HospitalJwtAuthGuard)
export class AmenitiesController {
  constructor(private readonly service: AmenitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateAmenityDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
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
    @Body() dto: Partial<CreateAmenityDto>,
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
