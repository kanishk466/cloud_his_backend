import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BedStatusService } from './bed-status.service';
import { ChangeBedStatusDto } from './dto/change-bed-status.dto';
import { QueryBedStatusDto } from './dto/query-bed-status.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('IPD — Bed Status')
@ApiBearerAuth('access-token')
@Controller('ipd/bed-statuses')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class BedStatusController {
  constructor(private readonly service: BedStatusService) {}

  @Get()
  @RequirePermissions('BED_STATUS_VIEW')
  @ApiOperation({ summary: 'List bed statuses (BOR board)' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryBedStatusDto) {
    return this.service.list(tenantId, query);
  }

  @Get('summary')
  @RequirePermissions('BED_STATUS_VIEW')
  @ApiOperation({ summary: 'Occupancy summary by status' })
  summary(
    @CurrentTenant() tenantId: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    return this.service.summary(tenantId, roomTypeId);
  }

  @Get(':bedId')
  @RequirePermissions('BED_STATUS_VIEW')
  @ApiOperation({ summary: 'Get a bed\'s current status' })
  getStatus(
    @CurrentTenant() tenantId: string,
    @Param('bedId', ParseUUIDPipe) bedId: string,
  ) {
    return this.service.getStatus(tenantId, bedId);
  }

  @Post(':bedId/change')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BED_STATUS_CHANGE')
  @ApiOperation({ summary: 'Change a bed\'s status (state-machine validated)' })
  @ApiResponse({ status: 200, description: 'Status changed' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing patientId' })
  changeStatus(
    @CurrentTenant() tenantId: string,
    @Param('bedId', ParseUUIDPipe) bedId: string,
    @Body() dto: ChangeBedStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.changeStatus(tenantId, bedId, dto, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
