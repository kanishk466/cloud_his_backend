import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { BedsService } from '../services/beds.service';
import { BedStatusService } from '../services/bed-status.service';
import { CreateBedDto } from '../dto/bed/create-bed.dto';
import { BulkCreateBedsDto } from '../dto/bed/bulk-create-beds.dto';
import { UpdateBedStatusDto } from '../dto/bed/update-bed-status.dto';
import { FilterBedDto } from '../dto/bed/filter-bed.dto';

@Controller('hospital/masters/beds')
@UseGuards(HospitalJwtAuthGuard)
export class BedsController {
  constructor(
    private readonly service: BedsService,
    private readonly bedStatusService: BedStatusService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateBedDto) {
    return this.service.create(tenantId, dto);
  }

  // NOTE: 'bulk' declared before @Get(':id')
  /** Bulk generator: { roomId, startNumber: 1, endNumber: 10 } → beds 01…10. */
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkCreateBedsDto,
  ) {
    return this.service.bulkCreate(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() filters: FilterBedDto) {
    return this.service.findAll(tenantId, filters);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  // ─── Bed status state machine ──────────────────────────────────────────────

  @Post(':bedId/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('bedId', ParseUUIDPipe) bedId: string,
    @Body() dto: UpdateBedStatusDto,
  ) {
    return this.bedStatusService.changeStatus(tenantId, bedId, dto, userId);
  }

  @Get(':bedId/status-history')
  getStatusHistory(
    @CurrentTenant() tenantId: string,
    @Param('bedId', ParseUUIDPipe) bedId: string,
  ) {
    return this.bedStatusService.getStatusHistory(tenantId, bedId);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
