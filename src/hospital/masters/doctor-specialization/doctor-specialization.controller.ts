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
import { DoctorSpecializationService } from './doctor-specialization.service';
import { CreateDoctorSpecializationDto } from './dto/create-doctor-specialization.dto';
import { UpdateDoctorSpecializationDto } from './dto/update-doctor-specialization.dto';
import { QueryDoctorSpecializationDto } from './dto/query-doctor-specialization.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Doctor Specialization')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/doctor-specializations')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class DoctorSpecializationController {
  constructor(private readonly service: DoctorSpecializationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('DOCTOR_SPECIALIZATION_CREATE')
  @ApiOperation({ summary: 'Create a doctor specialization under a clinical department' })
  @ApiResponse({ status: 201, description: 'Specialization created' })
  @ApiResponse({ status: 400, description: 'Invalid clinicalDepartmentId' })
  @ApiResponse({ status: 409, description: 'Already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDoctorSpecializationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('DOCTOR_SPECIALIZATION_VIEW')
  @ApiOperation({ summary: 'List doctor specializations' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryDoctorSpecializationDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('DOCTOR_SPECIALIZATION_VIEW')
  @ApiOperation({ summary: 'Lightweight specialization list for dropdowns' })
  dropdown(
    @CurrentTenant() tenantId: string,
    @Query('clinicalDepartmentId') clinicalDepartmentId?: string,
  ) {
    return this.service.dropdown(tenantId, clinicalDepartmentId);
  }

  @Get(':id')
  @RequirePermissions('DOCTOR_SPECIALIZATION_VIEW')
  @ApiOperation({ summary: 'Get a specialization by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('DOCTOR_SPECIALIZATION_EDIT')
  @ApiOperation({ summary: 'Update a specialization' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorSpecializationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('DOCTOR_SPECIALIZATION_DELETE')
  @ApiOperation({ summary: 'Soft delete a specialization' })
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
