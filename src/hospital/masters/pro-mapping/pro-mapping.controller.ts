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
import { ProMappingService } from './pro-mapping.service';
import { CreateProMappingDto } from './dto/create-pro-mapping.dto';
import { UpdateProMappingDto } from './dto/update-pro-mapping.dto';
import { QueryProMappingDto } from './dto/query-pro-mapping.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — PRO Mapping')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/pro-mappings')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ProMappingController {
  constructor(private readonly service: ProMappingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('PRO_MAPPING_CREATE')
  @ApiOperation({ summary: 'Map a PRO to a refer doctor' })
  @ApiResponse({ status: 201, description: 'PRO mapping created' })
  @ApiResponse({ status: 400, description: 'Invalid refs' })
  @ApiResponse({ status: 409, description: 'Already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProMappingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('PRO_MAPPING_VIEW')
  @ApiOperation({ summary: 'List PRO mappings' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryProMappingDto) {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('PRO_MAPPING_VIEW')
  @ApiOperation({ summary: 'Get a PRO mapping by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('PRO_MAPPING_EDIT')
  @ApiOperation({ summary: 'Update a PRO mapping' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProMappingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('PRO_MAPPING_DELETE')
  @ApiOperation({ summary: 'Soft delete a PRO mapping' })
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
