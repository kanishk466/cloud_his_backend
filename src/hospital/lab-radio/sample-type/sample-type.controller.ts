import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SampleTypeService } from './sample-type.service';
import { CreateSampleTypeDto } from './dto/create-sample-type.dto';
import { UpdateSampleTypeDto } from './dto/update-sample-type.dto';
import { QuerySampleTypeDto } from './dto/query-sample-type.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Sample Type')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/sample-types')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class SampleTypeController {
  constructor(private readonly service: SampleTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('SAMPLE_TYPE_CREATE')
  @ApiOperation({ summary: 'Create a sample type under a container' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateSampleTypeDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('SAMPLE_TYPE_VIEW')
  @ApiOperation({ summary: 'List sample types' })
  list(@CurrentTenant() tenantId: string, @Query() query: QuerySampleTypeDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('SAMPLE_TYPE_VIEW')
  @ApiOperation({ summary: 'Lightweight sample type list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string, @Query('containerId') containerId?: string) {
    return this.service.dropdown(tenantId, containerId);
  }

  @Get(':id')
  @RequirePermissions('SAMPLE_TYPE_VIEW')
  @ApiOperation({ summary: 'Get a sample type by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('SAMPLE_TYPE_EDIT')
  @ApiOperation({ summary: 'Update a sample type' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSampleTypeDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('SAMPLE_TYPE_DELETE')
  @ApiOperation({ summary: 'Soft delete a sample type' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
