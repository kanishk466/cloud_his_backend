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
import { LabDepartmentService } from './lab-department.service';
import { CreateLabDepartmentDto } from './dto/create-lab-department.dto';
import { UpdateLabDepartmentDto } from './dto/update-lab-department.dto';
import { QueryLabDepartmentDto } from './dto/query-lab-department.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Department')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/departments')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class LabDepartmentController {
  constructor(private readonly service: LabDepartmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('LAB_DEPARTMENT_CREATE')
  @ApiOperation({ summary: 'Create a lab/radio department' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateLabDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('LAB_DEPARTMENT_VIEW')
  @ApiOperation({ summary: 'List lab/radio departments' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryLabDepartmentDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('LAB_DEPARTMENT_VIEW')
  @ApiOperation({ summary: 'Lightweight department list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string, @Query('category') category?: string) {
    return this.service.dropdown(tenantId, category);
  }

  @Get(':id')
  @RequirePermissions('LAB_DEPARTMENT_VIEW')
  @ApiOperation({ summary: 'Get a department by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('LAB_DEPARTMENT_EDIT')
  @ApiOperation({ summary: 'Update a department' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('LAB_DEPARTMENT_DELETE')
  @ApiOperation({ summary: 'Soft delete a department' })
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
