import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HelpObservationService } from './help-observation.service';
import { CreateHelpObservationDto } from './dto/create-help-observation.dto';
import { UpdateHelpObservationDto } from './dto/update-help-observation.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Help Observation')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/help-observations')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class HelpObservationController {
  constructor(private readonly service: HelpObservationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('HELP_OBSERVATION_CREATE')
  @ApiOperation({ summary: 'Create help text for an observation' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateHelpObservationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('HELP_OBSERVATION_VIEW')
  @ApiOperation({ summary: 'List help observations' })
  list(@CurrentTenant() tenantId: string, @Query('observationId') observationId?: string) {
    return this.service.list(tenantId, observationId);
  }

  @Get(':id')
  @RequirePermissions('HELP_OBSERVATION_VIEW')
  @ApiOperation({ summary: 'Get help observation by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('HELP_OBSERVATION_EDIT')
  @ApiOperation({ summary: 'Update help text' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHelpObservationDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('HELP_OBSERVATION_DELETE')
  @ApiOperation({ summary: 'Soft delete help text' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
