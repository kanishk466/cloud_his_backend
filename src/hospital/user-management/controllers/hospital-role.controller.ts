import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

  @Post()
  create(@Req() req: any, @Body() dto: CreateHospitalRoleDto) {
    return this.service.create(req.user.hospitalId, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.service.findAll(req.user.hospitalId);
  }

  @Get('entitlements/modules')
  getEntitledModules(@Req() req: any) {
    return this.service.getEntitledModules(req.user.hospitalId);
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.findByIdOrThrow(req.user.hospitalId, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHospitalRoleDto,
  ) {
    return this.service.update(req.user.hospitalId, id, dto);
  }

  @Post(':id/toggle')
  toggle(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.service.toggle(req.user.hospitalId, id, dto.isActive);
  }

  @Put(':id/permissions')
  setPermissions(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.service.setPermissions(req.user.hospitalId, id, dto);
  }

  @Get(':id/permissions')
  getPermissions(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.getPermissions(req.user.hospitalId, id);
  }
}