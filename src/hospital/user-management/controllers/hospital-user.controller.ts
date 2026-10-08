import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { HospitalUserService } from '../services/hospital-user.service';
import { CreateHospitalUserDto } from '../dto/create-hospital-user.dto';
import { UpdateHospitalUserProfileDto } from '../dto/update-hospital-user-profile.dto';
import { ListUsersDto } from '../dto/list-users.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { SetUserDepartmentsDto } from '../dto/set-user-departments.dto';
import { SetUserRolesDto } from '../dto/set-user-roles.dto';

@Controller('hospital/users')
@UseGuards(HospitalJwtAuthGuard)
export class HospitalUserController {
  constructor(private readonly service: HospitalUserService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Body() dto: CreateHospitalUserDto,
  ) {
    return this.service.create(tenantId, dto, performedBy);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListUsersDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  getById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findByIdOrThrow(tenantId, id);
  }

  @Patch(':id/profile')
  updateProfile(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
    @Body() dto: UpdateHospitalUserProfileDto,
  ) {
    return this.service.updateProfile(tenantId, id, dto, performedBy);
  }

  // ─── Phase 1.3: Status toggle (INACTIVE revokes sessions + refresh token) ──
  @Patch(':id/status')
  updateStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.service.updateStatus(tenantId, id, dto.status, performedBy);
  }

  // ─── Phase 1.3: Bulk department mapping (atomic replace) ───────────────────
  @Put(':id/departments')
  setDepartments(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
    @Body() dto: SetUserDepartmentsDto,
  ) {
    return this.service.setDepartments(tenantId, id, dto, performedBy);
  }

  // ─── Phase 1.3: Bulk role assignment (atomic replace, exactly one primary) ──
  @Put(':id/roles')
  setRoles(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
    @Body() dto: SetUserRolesDto,
  ) {
    return this.service.setRoles(tenantId, id, dto, performedBy);
  }

  @Get(':id/effective-permissions')
  getEffectivePermissions(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.getEffectivePermissions(tenantId, id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
  ) {
    return this.service.deactivate(tenantId, id, performedBy);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
  ) {
    return this.service.activate(tenantId, id, performedBy);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
  ) {
    return this.service.resetPassword(tenantId, id, performedBy);
  }

  // ─── Phase 1.3: Soft delete (revokes sessions + refresh token) ─────────────
  @Delete(':id')
  softDelete(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') performedBy: string,
    @Param('id') id: string,
  ) {
    return this.service.softDelete(tenantId, id, performedBy);
  }
}
