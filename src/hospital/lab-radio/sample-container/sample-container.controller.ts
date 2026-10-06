import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SampleContainerService } from './sample-container.service';
import { CreateSampleContainerDto } from './dto/create-sample-container.dto';
import { UpdateSampleContainerDto } from './dto/update-sample-container.dto';
import { QuerySampleContainerDto } from './dto/query-sample-container.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Sample Container')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/sample-containers')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class SampleContainerController {
  constructor(private readonly service: SampleContainerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('SAMPLE_CONTAINER_CREATE')
  @ApiOperation({ summary: 'Create a sample container' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateSampleContainerDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('SAMPLE_CONTAINER_VIEW')
  @ApiOperation({ summary: 'List sample containers' })
  list(@CurrentTenant() tenantId: string, @Query() query: QuerySampleContainerDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('SAMPLE_CONTAINER_VIEW')
  @ApiOperation({ summary: 'Lightweight container list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.dropdown(tenantId);
  }

  @Get(':id')
  @RequirePermissions('SAMPLE_CONTAINER_VIEW')
  @ApiOperation({ summary: 'Get a sample container by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('SAMPLE_CONTAINER_EDIT')
  @ApiOperation({ summary: 'Update a sample container' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSampleContainerDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('SAMPLE_CONTAINER_DELETE')
  @ApiOperation({ summary: 'Soft delete a sample container' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
