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
import { ReferDoctorService } from './refer-doctor.service';
import { CreateReferDoctorDto } from './dto/create-refer-doctor.dto';
import { UpdateReferDoctorDto } from './dto/update-refer-doctor.dto';
import { QueryReferDoctorDto } from './dto/query-refer-doctor.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Refer Doctor')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/refer-doctors')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ReferDoctorController {
  constructor(private readonly service: ReferDoctorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('REFER_DOCTOR_CREATE')
  @ApiOperation({ summary: 'Create an external referring doctor' })
  @ApiResponse({ status: 201, description: 'Refer doctor created' })
  @ApiResponse({ status: 409, description: 'Already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateReferDoctorDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('REFER_DOCTOR_VIEW')
  @ApiOperation({ summary: 'List refer doctors' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryReferDoctorDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('REFER_DOCTOR_VIEW')
  @ApiOperation({ summary: 'Lightweight refer doctor list for dropdowns' })
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.dropdown(tenantId);
  }

  @Get(':id')
  @RequirePermissions('REFER_DOCTOR_VIEW')
  @ApiOperation({ summary: 'Get a refer doctor by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('REFER_DOCTOR_EDIT')
  @ApiOperation({ summary: 'Update a refer doctor' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferDoctorDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('REFER_DOCTOR_DELETE')
  @ApiOperation({ summary: 'Soft delete a refer doctor' })
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
