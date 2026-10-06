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
import { InvestigationService } from './investigation.service';
import { CreateInvestigationDto } from './dto/create-investigation.dto';
import { UpdateInvestigationDto } from './dto/update-investigation.dto';
import { QueryInvestigationDto } from './dto/query-investigation.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Investigation')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/investigations')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class InvestigationController {
  constructor(private readonly service: InvestigationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('INVESTIGATION_CREATE')
  @ApiOperation({ summary: 'Create an investigation (test SKU) linked to a service' })
  @ApiResponse({ status: 201, description: 'Investigation created' })
  @ApiResponse({ status: 400, description: 'Invalid refs / serviceId missing' })
  @ApiResponse({ status: 409, description: 'Service or code already used' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateInvestigationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('INVESTIGATION_VIEW')
  @ApiOperation({ summary: 'List investigations' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryInvestigationDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('INVESTIGATION_VIEW')
  @ApiOperation({ summary: 'Lightweight investigation list for dropdowns' })
  dropdown(
    @CurrentTenant() tenantId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.dropdown(tenantId, departmentId);
  }

  @Get(':id')
  @RequirePermissions('INVESTIGATION_VIEW')
  @ApiOperation({ summary: 'Get an investigation by id (with observations + templates)' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('INVESTIGATION_EDIT')
  @ApiOperation({ summary: 'Update an investigation' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('INVESTIGATION_DELETE')
  @ApiOperation({ summary: 'Soft delete an investigation' })
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
