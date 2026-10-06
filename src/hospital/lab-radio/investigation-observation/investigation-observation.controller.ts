import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvestigationObservationService } from './investigation-observation.service';
import { SetInvestigationObservationsDto } from './dto/set-investigation-observations.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Investigation Observations')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/investigations/:investigationId/observations')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class InvestigationObservationController {
  constructor(private readonly service: InvestigationObservationService) {}

  @Get()
  @RequirePermissions('INVESTIGATION_VIEW')
  @ApiOperation({ summary: 'List observations mapped to an investigation' })
  list(
    @CurrentTenant() tenantId: string,
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
  ) {
    return this.service.list(tenantId, investigationId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('INVESTIGATION_EDIT')
  @ApiOperation({ summary: 'Replace the observation set for an investigation' })
  @ApiResponse({ status: 200, description: 'Observations mapped' })
  set(
    @CurrentTenant() tenantId: string,
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Body() dto: SetInvestigationObservationsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.set(tenantId, investigationId, dto, this.actor(user));
  }

  @Delete(':observationId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('INVESTIGATION_EDIT')
  @ApiOperation({ summary: 'Remove one observation from an investigation' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Param('observationId', ParseUUIDPipe) observationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(tenantId, investigationId, observationId, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
