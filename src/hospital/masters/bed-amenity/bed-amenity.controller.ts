import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BedAmenityService } from './bed-amenity.service';
import { CreateBedAmenityDto } from './dto/create-bed-amenity.dto';
import { UpdateBedAmenityDto } from './dto/update-bed-amenity.dto';
import { QueryBedAmenityDto } from './dto/query-bed-amenity.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Bed Amenity')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/bed-amenities')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class BedAmenityController {
  constructor(private readonly service: BedAmenityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BED_AMENITY_CREATE')
  @ApiOperation({ summary: 'Create a bed amenity' })
  @ApiResponse({ status: 201, description: 'Amenity created' })
  @ApiResponse({ status: 409, description: 'Already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBedAmenityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BED_AMENITY_VIEW')
  @ApiOperation({ summary: 'List bed amenities' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryBedAmenityDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('BED_AMENITY_VIEW')
  @ApiOperation({ summary: 'Lightweight amenity list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.dropdown(tenantId);
  }

  @Get(':id')
  @RequirePermissions('BED_AMENITY_VIEW')
  @ApiOperation({ summary: 'Get a bed amenity by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('BED_AMENITY_EDIT')
  @ApiOperation({ summary: 'Update a bed amenity' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBedAmenityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BED_AMENITY_DELETE')
  @ApiOperation({ summary: 'Soft delete a bed amenity' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
