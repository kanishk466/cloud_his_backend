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
import { ShiftsService } from '../services/shifts.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';
import { ToggleActiveDto } from '../dto/toggle-active.dto';

@Controller('hospital/masters/shifts')
@UseGuards(HospitalJwtAuthGuard)
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateShiftDto) {
    return this.service.create(req.user.hospitalId, dto);
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
    @Body() dto: UpdateShiftDto,
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