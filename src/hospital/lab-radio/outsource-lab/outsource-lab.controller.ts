import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OutsourceLabService } from './outsource-lab.service';
import { CreateOutsourceLabDto } from './dto/create-outsource-lab.dto';
import { UpdateOutsourceLabDto } from './dto/update-outsource-lab.dto';
import { QueryOutsourceLabDto } from './dto/query-outsource-lab.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Outsource Lab')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/outsource-labs')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class OutsourceLabController {
  constructor(private readonly service: OutsourceLabService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('OUTSOURCE_LAB_CREATE')
  @ApiOperation({ summary: 'Create an outsource lab' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateOutsourceLabDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('OUTSOURCE_LAB_VIEW')
  @ApiOperation({ summary: 'List outsource labs' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryOutsourceLabDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('OUTSOURCE_LAB_VIEW')
  @ApiOperation({ summary: 'Lightweight outsource lab list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.dropdown(tenantId);
  }

  @Get(':id')
  @RequirePermissions('OUTSOURCE_LAB_VIEW')
  @ApiOperation({ summary: 'Get an outsource lab by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('OUTSOURCE_LAB_EDIT')
  @ApiOperation({ summary: 'Update an outsource lab' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOutsourceLabDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('OUTSOURCE_LAB_DELETE')
  @ApiOperation({ summary: 'Soft delete an outsource lab' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
