import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MicroMasterService } from './micro-master.service';
import { CreateMicroMasterDto } from './dto/create-micro-master.dto';
import { UpdateMicroMasterDto } from './dto/update-micro-master.dto';
import { QueryMicroMasterDto } from './dto/query-micro-master.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Micro Master')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/micro-masters')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class MicroMasterController {
  constructor(private readonly service: MicroMasterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('MICRO_MASTER_CREATE')
  @ApiOperation({ summary: 'Create a micro master (organism/antibiotic/staining/colony count)' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateMicroMasterDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('MICRO_MASTER_VIEW')
  @ApiOperation({ summary: 'List micro masters' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryMicroMasterDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('MICRO_MASTER_VIEW')
  @ApiOperation({ summary: 'Lightweight micro master list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string, @Query('type') type?: string) {
    return this.service.dropdown(tenantId, type);
  }

  @Get(':id')
  @RequirePermissions('MICRO_MASTER_VIEW')
  @ApiOperation({ summary: 'Get a micro master by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('MICRO_MASTER_EDIT')
  @ApiOperation({ summary: 'Update a micro master' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMicroMasterDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('MICRO_MASTER_DELETE')
  @ApiOperation({ summary: 'Soft delete a micro master' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
