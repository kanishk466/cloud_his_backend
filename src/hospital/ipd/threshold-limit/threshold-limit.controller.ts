import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThresholdLimitService } from './threshold-limit.service';
import { ThresholdCheckService } from './threshold-check.service';
import { CreateThresholdLimitDto } from './dto/create-threshold-limit.dto';
import { UpdateThresholdLimitDto } from './dto/update-threshold-limit.dto';
import { QueryThresholdLimitDto } from './dto/query-threshold-limit.dto';
import { CheckThresholdDto } from './dto/check-threshold.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('IPD — Threshold Limit')
@ApiBearerAuth('access-token')
@Controller('hospital/ipd/threshold-limits')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ThresholdLimitController {
  constructor(
    private readonly service: ThresholdLimitService,
    private readonly checkService: ThresholdCheckService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('THRESHOLD_LIMIT_CREATE')
  @ApiOperation({ summary: 'Create a threshold limit for a panel + room type' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateThresholdLimitDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('THRESHOLD_LIMIT_VIEW')
  @ApiOperation({ summary: 'List threshold limits' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryThresholdLimitDto) {
    return this.service.list(tenantId, query);
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('THRESHOLD_LIMIT_VIEW')
  @ApiOperation({
    summary: 'Check a running bill against threshold (OK / WARNING / BLOCKED)',
    description: 'Reusable by IPD billing. Fires alerts on first crossing.',
  })
  @ApiResponse({ status: 200, description: 'Threshold check result' })
  check(
    @CurrentTenant() tenantId: string,
    @Body() dto: CheckThresholdDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.checkService.check(tenantId, dto, this.actor(user));
  }

  @Get(':id')
  @RequirePermissions('THRESHOLD_LIMIT_VIEW')
  @ApiOperation({ summary: 'Get a threshold limit by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('THRESHOLD_LIMIT_EDIT')
  @ApiOperation({ summary: 'Update a threshold limit' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateThresholdLimitDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('THRESHOLD_LIMIT_DELETE')
  @ApiOperation({ summary: 'Soft delete a threshold limit' })
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
