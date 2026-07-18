import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalRoleService } from '../services/hospital-role.service';
import { CreateHospitalRoleDto } from '../dto/create-hospital-role.dto';
import { UpdateHospitalRoleDto } from '../dto/update-hospital-role.dto';
import { SetRolePermissionsDto } from '../dto/set-role-permissions.dto';
import { ToggleActiveDto } from '../../masters/dto/toggle-active.dto';

@Controller('hospital/roles')
@UseGuards(HospitalJwtAuthGuard)
export class HospitalRoleController {
  constructor(private readonly service: HospitalRoleService) {}

  // Create role
  @Post()
  create(@Req() req: any, @Body() dto: CreateHospitalRoleDto) {
    return this.service.create(req.user.hospitalId, dto);
  }

  // List roles
  @Get()
  list(@Req() req: any) {
    return this.service.findAll(req.user.hospitalId);
  }

  // Get role by id
  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.service.findByIdOrThrow(req.user.hospitalId, id);
  }

  // Update role
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateHospitalRoleDto,
  ) {
    return this.service.update(req.user.hospitalId, id, dto);
  }

  // Toggle active/inactive
  @Post(':id/toggle')
  toggle(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.service.toggle(req.user.hospitalId, id, dto.isActive);
  }

  // Set permissions (replace all)
  @Put(':id/permissions')
  setPermissions(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.service.setPermissions(req.user.hospitalId, id, dto);
  }

  // Get permissions
  @Get(':id/permissions')
  getPermissions(@Req() req: any, @Param('id') id: string) {
    return this.service.getPermissions(req.user.hospitalId, id);
  }

  // Get entitled modules (for UI dropdowns in Step 2/3)
  @Get('entitlements/modules')
  getEntitledModules(@Req() req: any) {
    return this.service.getEntitledModules(req.user.hospitalId);
  }
}