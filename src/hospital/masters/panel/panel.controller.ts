import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { PanelService } from './panel.service';
import { CreatePanelDto } from './dto/create-panel.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';
import { ListPanelQueryDto } from './dto/list-panel-query.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';

@Controller('hospital/masters/panels')
@UseGuards(HospitalJwtAuthGuard)
export class PanelController {
  constructor(private readonly service: PanelService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePanelDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListPanelQueryDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.getDropdown(tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePanelDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(tenantId, id);
  }
}