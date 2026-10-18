import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { SpecializationsService } from '../services/specializations.service';
import { CreateSpecializationDto } from '../dto/specialization/create-specialization.dto';
import { UpdateSpecializationDto } from '../dto/specialization/update-specialization.dto';

@Controller('hospital/masters/specializations')
@UseGuards(HospitalJwtAuthGuard)
export class SpecializationsController {
  constructor(private readonly service: SpecializationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSpecializationDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
  }

  // ─── Dropdown source: specializations of one department ───────────────────
  // NOTE: declared before @Get(':id') so 'by-department' is not parsed as an id.
  @Get('by-department/:deptId')
  findByDepartment(
    @CurrentTenant() tenantId: string,
    @Param('deptId', ParseUUIDPipe) deptId: string,
    @Query('active') active?: string,
  ) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findByDepartment(tenantId, deptId, isActive);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpecializationDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
