import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { RoleNameService } from '../services/role-name.service';
import { CreateRoleNameDto } from '../dto/create-role-name.dto';
import { SearchRoleNameDto } from '../dto/search-role-name.dto';

@Controller('hospital/role-names')
@UseGuards(HospitalJwtAuthGuard)
export class RoleNameController {
  constructor(private readonly service: RoleNameService) {}

  @Get()
  list(@Query() query: SearchRoleNameDto) {
    return this.service.findAll(query.search);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateRoleNameDto) {
    return this.service.create(req.user.hospitalId, dto);
  }
}