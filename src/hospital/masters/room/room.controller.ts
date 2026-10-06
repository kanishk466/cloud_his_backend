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
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Room')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/rooms')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class RoomController {
  constructor(private readonly service: RoomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('ROOM_CREATE')
  @ApiOperation({ summary: 'Create a room under a room type' })
  @ApiResponse({ status: 201, description: 'Room created' })
  @ApiResponse({ status: 400, description: 'Invalid roomTypeId' })
  @ApiResponse({ status: 409, description: 'Room no already exists on floor' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('ROOM_VIEW')
  @ApiOperation({ summary: 'List rooms' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryRoomDto) {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('ROOM_VIEW')
  @ApiOperation({ summary: 'Get a room by id (with beds)' })
  findOne(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('ROOM_EDIT')
  @ApiOperation({ summary: 'Update a room' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ROOM_DELETE')
  @ApiOperation({ summary: 'Soft delete a room' })
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
