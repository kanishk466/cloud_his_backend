import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LabCommentService } from './lab-comment.service';
import { CreateLabCommentDto } from './dto/create-lab-comment.dto';
import { UpdateLabCommentDto } from './dto/update-lab-comment.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Lab/Radio — Lab Comment')
@ApiBearerAuth('access-token')
@Controller('hospital/lab-radio/lab-comments')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class LabCommentController {
  constructor(private readonly service: LabCommentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('LAB_COMMENT_CREATE')
  @ApiOperation({ summary: 'Create a lab comment' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateLabCommentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('LAB_COMMENT_VIEW')
  @ApiOperation({ summary: 'List lab comments' })
  list(@CurrentTenant() tenantId: string, @Query('investigationId') investigationId?: string) {
    return this.service.list(tenantId, investigationId);
  }

  @Get(':id')
  @RequirePermissions('LAB_COMMENT_VIEW')
  @ApiOperation({ summary: 'Get a lab comment by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('LAB_COMMENT_EDIT')
  @ApiOperation({ summary: 'Update a lab comment' })
  update(
    @CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabCommentDto, @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('LAB_COMMENT_DELETE')
  @ApiOperation({ summary: 'Soft delete a lab comment' })
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(tenantId, id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) { return { actorId: user.userId, actorEmail: user.email }; }
}
