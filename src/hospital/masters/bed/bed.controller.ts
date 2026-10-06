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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BedService } from './bed.service';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedDto } from './dto/update-bed.dto';
import { QueryBedDto } from './dto/query-bed.dto';
import { BulkCreateBedsDto } from './dto/bulk-create-beds.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Bed')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/beds')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class BedController {
  constructor(private readonly service: BedService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BED_CREATE')
  @ApiOperation({ summary: 'Create a bed under a room' })
  @ApiResponse({ status: 201, description: 'Bed created' })
  @ApiResponse({ status: 409, description: 'Bed no already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBedDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BED_CREATE')
  @ApiOperation({ summary: 'Bulk create beds (count or explicit bed numbers)' })
  @ApiResponse({ status: 201, description: 'Beds created' })
  @ApiResponse({ status: 409, description: 'Some bed numbers already exist' })
  bulkCreate(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkCreateBedsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.bulkCreate(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BED_VIEW')
  @ApiOperation({ summary: 'List beds' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryBedDto) {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('BED_VIEW')
  @ApiOperation({ summary: 'Get a bed by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('BED_EDIT')
  @ApiOperation({ summary: 'Update a bed (incl. amenity assignment)' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBedDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BED_DELETE')
  @ApiOperation({ summary: 'Soft delete a bed (blocked if OCCUPIED)' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
