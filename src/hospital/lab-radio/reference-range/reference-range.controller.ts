import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferenceRangeService } from './reference-range.service';
import { CreateReferenceRangeDto } from './dto/create-reference-range.dto';
import { UpdateReferenceRangeDto } from './dto/update-reference-range.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Reference Range')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/observations/:observationId/reference-ranges')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ReferenceRangeController {
  constructor(private readonly service: ReferenceRangeService) {}

  @Get()
  @RequirePermissions('OBSERVATION_VIEW')
  @ApiOperation({ summary: 'List reference ranges for an observation' })
  list(
    @CurrentTenant() tenantId: string,
    @Param('observationId', ParseUUIDPipe) observationId: string,
  ) {
    return this.service.list(tenantId, observationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('OBSERVATION_EDIT')
  @ApiOperation({ summary: 'Add a reference range to an observation' })
  create(
    @CurrentTenant() tenantId: string,
    @Param('observationId', ParseUUIDPipe) observationId: string,
    @Body() dto: CreateReferenceRangeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, observationId, dto, this.actor(user));
  }

  @Patch(':id')
  @RequirePermissions('OBSERVATION_EDIT')
  @ApiOperation({ summary: 'Update a reference range' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('observationId', ParseUUIDPipe) observationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferenceRangeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, observationId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('OBSERVATION_EDIT')
  @ApiOperation({ summary: 'Soft delete a reference range' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('observationId', ParseUUIDPipe) observationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(tenantId, observationId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
