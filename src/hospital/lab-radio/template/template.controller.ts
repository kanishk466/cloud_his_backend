import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Template')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/investigations/:investigationId/templates')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class TemplateController {
  constructor(private readonly service: TemplateService) {}

  @Get()
  @RequirePermissions('INVESTIGATION_VIEW')
  @ApiOperation({ summary: 'List templates for an investigation' })
  list(@CurrentTenant() tenantId: string, @Param('investigationId', ParseUUIDPipe) investigationId: string) {
    return this.service.list(tenantId, investigationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('INVESTIGATION_EDIT')
  @ApiOperation({ summary: 'Create a template (requires department.allowTemplates)' })
  create(
    @CurrentTenant() tenantId: string,
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, investigationId, dto, this.actor(user));
  }

  @Patch(':id')
  @RequirePermissions('INVESTIGATION_EDIT')
  @ApiOperation({ summary: 'Update a template' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, investigationId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('INVESTIGATION_EDIT')
  @ApiOperation({ summary: 'Soft delete a template' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(tenantId, investigationId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
