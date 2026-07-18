import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalUserService } from '../services/hospital-user.service';
import { CreateHospitalUserDto } from '../dto/create-hospital-user.dto';
import { UpdateHospitalUserProfileDto } from '../dto/update-hospital-user-profile.dto';
import { SetUserPermissionsDto } from '../dto/set-user-permissions.dto';
import { ListUsersDto } from '../dto/list-users.dto';

@Controller('hospital/users')
@UseGuards(HospitalJwtAuthGuard)
export class HospitalUserController {
  constructor(private readonly service: HospitalUserService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateHospitalUserDto) {
    return this.service.create(req.user.hospitalId, dto);
  }

  @Get()
  list(@Req() req: any, @Query() query: ListUsersDto) {
    return this.service.findAll(req.user.hospitalId, query);
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.service.findByIdOrThrow(req.user.hospitalId, id);
  }

  @Patch(':id/profile')
  updateProfile(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateHospitalUserProfileDto,
  ) {
    return this.service.updateProfile(req.user.hospitalId, id, dto);
  }

  @Put(':id/permissions')
  setPermissions(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SetUserPermissionsDto,
  ) {
    return this.service.setPermissions(req.user.hospitalId, id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Req() req: any, @Param('id') id: string) {
    return this.service.deactivate(req.user.hospitalId, id);
  }

  @Post(':id/activate')
  activate(@Req() req: any, @Param('id') id: string) {
    return this.service.activate(req.user.hospitalId, id);
  }

  @Post(':id/reset-password')
  resetPassword(@Req() req: any, @Param('id') id: string) {
    return this.service.resetPassword(req.user.hospitalId, id);
  }
}