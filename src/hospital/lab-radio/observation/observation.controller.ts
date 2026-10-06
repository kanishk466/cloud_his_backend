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
import { ObservationService } from './observation.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';
import { QueryObservationDto } from './dto/query-observation.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Observation')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/observations')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ObservationController {
  constructor(private readonly service: ObservationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('OBSERVATION_CREATE')
  @ApiOperation({ summary: 'Create an observation (analyte)' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateObservationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('OBSERVATION_VIEW')
  @ApiOperation({ summary: 'List observations' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryObservationDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('OBSERVATION_VIEW')
  @ApiOperation({ summary: 'Lightweight observation list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.dropdown(tenantId);
  }

  @Get(':id')
  @RequirePermissions('OBSERVATION_VIEW')
  @ApiOperation({ summary: 'Get an observation by id (with ranges/help)' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('OBSERVATION_EDIT')
  @ApiOperation({ summary: 'Update an observation' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateObservationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('OBSERVATION_DELETE')
  @ApiOperation({ summary: 'Soft delete an observation' })
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
