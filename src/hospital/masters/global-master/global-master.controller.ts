import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GlobalMasterService } from './global-master.service';
import { CreateGlobalMasterDto } from './dto/create-global-master.dto';
import { UpdateGlobalMasterDto } from './dto/update-global-master.dto';
import { MasterValueType } from '@prisma/client';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';

@Controller('hospital/masters/global')
@UseGuards(HospitalJwtAuthGuard)
export class GlobalMasterController {
  constructor(private readonly service: GlobalMasterService) {}

  // ────────────────────────────────────────────────────────────
  // POST /hospital/masters/global
  // Add a new master value
  // ────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateGlobalMasterDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  // ────────────────────────────────────────────────────────────
  // GET /hospital/masters/global/sidebar
  // Get left sidebar categories with counts
  // ────────────────────────────────────────────────────────────
  @Get('sidebar')
  getSidebarTree(@CurrentTenant() tenantId: string) {
    return this.service.getSidebarTree(tenantId);
  }

  // ────────────────────────────────────────────────────────────
  // GET /hospital/masters/global/type/:type
  // Get all values by type (for right-side table)
  // Query: ?search=cash
  // ────────────────────────────────────────────────────────────
  @Get('type/:type')
  getValuesByType(
    @CurrentTenant() tenantId: string,
    @Param('type') type: MasterValueType,
    @Query('search') search?: string,
  ) {
    return this.service.getValuesByType(tenantId, type, search);
  }

  // ────────────────────────────────────────────────────────────
  // GET /hospital/masters/global/dropdown/:type
  // Get lightweight dropdown values (only id + value)
  // Used in Panel Form, Billing Form etc.
  // ────────────────────────────────────────────────────────────
  @Get('dropdown/:type')
  getDropdownValues(
    @CurrentTenant() tenantId: string,
    @Param('type') type: MasterValueType,
  ) {
    return this.service.getDropdownValues(tenantId, type);
  }

  // ────────────────────────────────────────────────────────────
  // PATCH /hospital/masters/global/:id
  // Update value or toggle active
  // ────────────────────────────────────────────────────────────
  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGlobalMasterDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  // ────────────────────────────────────────────────────────────
  // DELETE /hospital/masters/global/:id
  // Soft delete a value
  // ────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }

  // ────────────────────────────────────────────────────────────
  // POST /hospital/masters/global/reorder/:type
  // Bulk reorder (drag & drop UI)
  // Body: { orderedIds: ['uuid1', 'uuid2', ...] }
  // ────────────────────────────────────────────────────────────
  @Post('reorder/:type')
  @HttpCode(HttpStatus.OK)
  reorder(
    @CurrentTenant() tenantId: string,
    @Param('type') type: MasterValueType,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.service.reorder(tenantId, type, orderedIds);
  }
}