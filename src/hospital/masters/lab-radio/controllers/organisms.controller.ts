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
import { OrganismType } from '@prisma/client';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { OrganismsService } from '../services/organisms.service';
import { CreateOrganismDto } from '../dto/organism/create-organism.dto';
import { UpdateOrganismDto } from '../dto/organism/update-organism.dto';
import { SyncOrganismAntibioticsDto } from '../dto/organism-antibiotic-mapping/sync-organism-antibiotics.dto';

@Controller('hospital/masters/organisms')
@UseGuards(HospitalJwtAuthGuard)
export class OrganismsController {
  constructor(private readonly service: OrganismsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateOrganismDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('organismType') organismType?: OrganismType,
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, { organismType, search, isActive });
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  /** Ordered AST battery: first-line drugs first (for result entry). */
  @Get(':id/ast-battery')
  getAstBattery(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getAstBattery(tenantId, id);
  }

  /** Atomic replace of the organism's standard antibiotic panel. */
  @Put(':id/antibiotic-panel')
  syncAntibioticPanel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncOrganismAntibioticsDto,
  ) {
    return this.service.syncAntibioticPanel(tenantId, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganismDto,
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
