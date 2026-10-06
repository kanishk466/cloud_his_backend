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
import { DiscountApprovalService } from './discount-approval.service';
import { CreateDiscountApprovalDto } from './dto/create-discount-approval.dto';
import { UpdateDiscountApprovalDto } from './dto/update-discount-approval.dto';
import { QueryDiscountApprovalDto } from './dto/query-discount-approval.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../../../hospital/core/decorators/current-tenant.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — Discount Approval')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/discount-approvals')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class DiscountApprovalController {
  constructor(private readonly service: DiscountApprovalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_DISCOUNT_APPROVAL_CREATE')
  @ApiOperation({ summary: 'Create a discount approval authority' })
  @ApiResponse({ status: 201, description: 'Discount approval created' })
  @ApiResponse({ status: 400, description: 'Invalid hospitalUserId' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDiscountApprovalDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_DISCOUNT_APPROVAL_VIEW')
  @ApiOperation({ summary: 'List discount approval authorities' })
  @ApiResponse({ status: 200, description: 'Discount approvals returned' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryDiscountApprovalDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_DISCOUNT_APPROVAL_VIEW')
  @ApiOperation({ summary: 'Lightweight approval list for dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown(
    @CurrentTenant() tenantId: string,
    @Query('applicableType') applicableType?: string,
  ) {
    return this.service.dropdown(tenantId, applicableType);
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_DISCOUNT_APPROVAL_VIEW')
  @ApiOperation({ summary: 'Get a discount approval by id' })
  @ApiResponse({ status: 200, description: 'Discount approval returned' })
  @ApiResponse({ status: 404, description: 'Discount approval not found' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_DISCOUNT_APPROVAL_EDIT')
  @ApiOperation({ summary: 'Update a discount approval authority' })
  @ApiResponse({ status: 200, description: 'Discount approval updated' })
  @ApiResponse({ status: 404, description: 'Discount approval not found' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscountApprovalDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_DISCOUNT_APPROVAL_DELETE')
  @ApiOperation({ summary: 'Soft delete a discount approval authority' })
  @ApiResponse({ status: 200, description: 'Discount approval deleted' })
  @ApiResponse({ status: 404, description: 'Discount approval not found' })
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
