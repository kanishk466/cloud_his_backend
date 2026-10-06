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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DiscountReasonService } from './discount-reason.service';
import { CreateDiscountReasonDto } from './dto/create-discount-reason.dto';
import { UpdateDiscountReasonDto } from './dto/update-discount-reason.dto';
import { QueryDiscountReasonDto } from './dto/query-discount-reason.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../../../hospital/core/decorators/current-tenant.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — Discount Reason')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/discount-reasons')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class DiscountReasonController {
  constructor(private readonly service: DiscountReasonService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_DISCOUNT_REASON_CREATE')
  @ApiOperation({ summary: 'Create a discount reason' })
  @ApiResponse({ status: 201, description: 'Discount reason created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDiscountReasonDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_DISCOUNT_REASON_VIEW')
  @ApiOperation({ summary: 'List discount reasons' })
  @ApiResponse({ status: 200, description: 'Discount reasons returned' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryDiscountReasonDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_DISCOUNT_REASON_VIEW')
  @ApiOperation({ summary: 'Lightweight discount reason list for dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown(
    @CurrentTenant() tenantId: string,
    @Query('applicableType') applicableType?: string,
  ) {
    return this.service.dropdown(tenantId, applicableType);
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_DISCOUNT_REASON_VIEW')
  @ApiOperation({ summary: 'Get a discount reason by id' })
  @ApiResponse({ status: 200, description: 'Discount reason returned' })
  @ApiResponse({ status: 404, description: 'Discount reason not found' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_DISCOUNT_REASON_EDIT')
  @ApiOperation({ summary: 'Update a discount reason' })
  @ApiResponse({ status: 200, description: 'Discount reason updated' })
  @ApiResponse({ status: 404, description: 'Discount reason not found' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscountReasonDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_DISCOUNT_REASON_DELETE')
  @ApiOperation({ summary: 'Soft delete a discount reason' })
  @ApiResponse({ status: 200, description: 'Discount reason deleted' })
  @ApiResponse({ status: 404, description: 'Discount reason not found' })
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
