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
import { ServiceItemTypeService } from './service-item-type.service';
import { CreateServiceItemTypeDto } from './dto/create-service-item-type.dto';
import { UpdateServiceItemTypeDto } from './dto/update-service-item-type.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Service Item Type')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/service-item-types')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ServiceItemTypeController {
  constructor(private readonly service: ServiceItemTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('SERVICE_ITEM_TYPE_CREATE')
  @ApiOperation({ summary: 'Create a service item type (global)' })
  @ApiResponse({ status: 201, description: 'Item type created' })
  @ApiResponse({ status: 409, description: 'Item type exists' })
  create(@Body() dto: CreateServiceItemTypeDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('SERVICE_ITEM_TYPE_VIEW')
  @ApiOperation({ summary: 'List service item types' })
  list(@Query('search') search?: string) {
    return this.service.list(search);
  }

  @Get(':id')
  @RequirePermissions('SERVICE_ITEM_TYPE_VIEW')
  @ApiOperation({ summary: 'Get a service item type by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('SERVICE_ITEM_TYPE_EDIT')
  @ApiOperation({ summary: 'Update a service item type' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceItemTypeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('SERVICE_ITEM_TYPE_DELETE')
  @ApiOperation({ summary: 'Delete a service item type' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
