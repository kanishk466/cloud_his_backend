import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LabApprovalRightService } from './lab-approval-right.service';
import { CreateLabApprovalRightDto } from './dto/create-approval-right.dto';
import { UpdateLabApprovalRightDto } from './dto/update-approval-right.dto';
import { QueryLabApprovalRightDto } from './dto/query-approval-right.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Approval Rights')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/approval-rights')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class LabApprovalRightController {
  constructor(private readonly service: LabApprovalRightService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('LAB_APPROVAL_RIGHT_CREATE')
  @ApiOperation({ summary: 'Grant report-signing rights to a user' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateLabApprovalRightDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('LAB_APPROVAL_RIGHT_VIEW')
  @ApiOperation({ summary: 'List approval rights' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryLabApprovalRightDto) {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('LAB_APPROVAL_RIGHT_VIEW')
  @ApiOperation({ summary: 'Get an approval right by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('LAB_APPROVAL_RIGHT_EDIT')
  @ApiOperation({ summary: 'Update an approval right' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabApprovalRightDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('LAB_APPROVAL_RIGHT_DELETE')
  @ApiOperation({ summary: 'Revoke an approval right' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
