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
import { ServiceCategoryService } from './service-category.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { QueryServiceCategoryDto } from './dto/query-service-category.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Service Category')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/service-categories')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ServiceCategoryController {
  constructor(private readonly service: ServiceCategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('SERVICE_CATEGORY_CREATE')
  @ApiOperation({ summary: 'Create a service category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 409, description: 'Category exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServiceCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('SERVICE_CATEGORY_VIEW')
  @ApiOperation({ summary: 'List service categories' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryServiceCategoryDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('SERVICE_CATEGORY_VIEW')
  @ApiOperation({ summary: 'Lightweight category list for dropdowns' })
  dropdown(
    @CurrentTenant() tenantId: string,
    @Query('configType') configType?: string,
  ) {
    return this.service.dropdown(tenantId, configType);
  }

  @Get(':id')
  @RequirePermissions('SERVICE_CATEGORY_VIEW')
  @ApiOperation({ summary: 'Get a service category by id' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('SERVICE_CATEGORY_EDIT')
  @ApiOperation({ summary: 'Update a service category' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('SERVICE_CATEGORY_DELETE')
  @ApiOperation({ summary: 'Soft delete a service category' })
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
