import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InterpretationService } from './interpretation.service';
import { CreateInterpretationDto } from './dto/create-interpretation.dto';
import { UpdateInterpretationDto } from './dto/update-interpretation.dto';
import { QueryInterpretationDto } from './dto/query-interpretation.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Interpretation')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/interpretations')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class InterpretationController {
  constructor(private readonly service: InterpretationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('INTERPRETATION_CREATE')
  @ApiOperation({ summary: 'Create an interpretation' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateInterpretationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('INTERPRETATION_VIEW')
  @ApiOperation({ summary: 'List interpretations' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryInterpretationDto) {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('INTERPRETATION_VIEW')
  @ApiOperation({ summary: 'Get an interpretation by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('INTERPRETATION_EDIT')
  @ApiOperation({ summary: 'Update an interpretation' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterpretationDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('INTERPRETATION_DELETE')
  @ApiOperation({ summary: 'Soft delete an interpretation' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
