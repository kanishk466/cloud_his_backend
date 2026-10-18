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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TemplateType } from '@prisma/client';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { TemplatesService } from '../services/templates.service';
import { CreateTemplateDto } from '../dto/template/create-template.dto';
import { UpdateTemplateDto } from '../dto/template/update-template.dto';

@Controller('hospital/masters/lab-templates')
@UseGuards(HospitalJwtAuthGuard)
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateTemplateDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('labDepartmentId') labDepartmentId?: string,
    @Query('investigationId') investigationId?: string,
    @Query('templateType') templateType?: TemplateType,
    @Query('active') active?: string,
  ) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, {
      labDepartmentId,
      investigationId,
      templateType,
      isActive,
    });
  }

  // NOTE: 'resolve' declared before @Get(':id')
  /** Template resolution: investigation → department → global default. */
  @Get('resolve')
  resolve(
    @CurrentTenant() tenantId: string,
    @Query('investigationId', ParseUUIDPipe) investigationId: string,
  ) {
    return this.service.resolve(tenantId, investigationId);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  /** Mark this template as the default for its scope. */
  @Put(':id/set-default')
  setDefault(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.setDefault(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
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
