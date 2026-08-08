import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { ToggleActiveDto } from '../dto/toggle-active.dto';

@Controller('hospital/masters/departments')
@UseGuards(HospitalJwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateDepartmentDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Get()
  list(@Req() req: any, @Query('active') active?: string) {
    const activeBool =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(req.user.hospitalId, activeBool);
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.findByIdOrThrow(req.user.hospitalId, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
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
}