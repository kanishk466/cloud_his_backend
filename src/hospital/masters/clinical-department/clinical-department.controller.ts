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
import { ClinicalDepartmentService } from './clinical-department.service';
import { CreateClinicalDepartmentDto } from './dto/create-clinical-department.dto';
import { UpdateClinicalDepartmentDto } from './dto/update-clinical-department.dto';
import { QueryClinicalDepartmentDto } from './dto/query-clinical-department.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Clinical Department')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/clinical-departments')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ClinicalDepartmentController {
  constructor(private readonly service: ClinicalDepartmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('CLINICAL_DEPARTMENT_CREATE')
  @ApiOperation({ summary: 'Create a clinical department' })
  @ApiResponse({ status: 201, description: 'Clinical department created' })
  @ApiResponse({ status: 409, description: 'Already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateClinicalDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('CLINICAL_DEPARTMENT_VIEW')
  @ApiOperation({ summary: 'List clinical departments' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryClinicalDepartmentDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('CLINICAL_DEPARTMENT_VIEW')
  @ApiOperation({ summary: 'Lightweight clinical department list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.dropdown(tenantId);
  }

  @Get(':id')
  @RequirePermissions('CLINICAL_DEPARTMENT_VIEW')
  @ApiOperation({ summary: 'Get a clinical department by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('CLINICAL_DEPARTMENT_EDIT')
  @ApiOperation({ summary: 'Update a clinical department' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicalDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('CLINICAL_DEPARTMENT_DELETE')
  @ApiOperation({ summary: 'Soft delete a clinical department' })
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
