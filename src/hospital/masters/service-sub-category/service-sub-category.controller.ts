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
import { ServiceSubCategoryService } from './service-sub-category.service';
import { CreateServiceSubCategoryDto } from './dto/create-service-sub-category.dto';
import { UpdateServiceSubCategoryDto } from './dto/update-service-sub-category.dto';
import { QueryServiceSubCategoryDto } from './dto/query-service-sub-category.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../core/permissions/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../core/decorators/current-user.decorator';

@ApiTags('Masters — Service Sub Category')
@ApiBearerAuth('access-token')
@Controller('hospital/masters/service-sub-categories')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class ServiceSubCategoryController {
  constructor(private readonly service: ServiceSubCategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('SERVICE_SUB_CATEGORY_CREATE')
  @ApiOperation({ summary: 'Create a service sub-category under a category' })
  @ApiResponse({ status: 201, description: 'Sub-category created' })
  @ApiResponse({ status: 400, description: 'Invalid categoryId' })
  @ApiResponse({ status: 409, description: 'Sub-category exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServiceSubCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('SERVICE_SUB_CATEGORY_VIEW')
  @ApiOperation({ summary: 'List service sub-categories' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryServiceSubCategoryDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('SERVICE_SUB_CATEGORY_VIEW')
  @ApiOperation({ summary: 'Lightweight sub-category list for dropdowns' })
  dropdown(
    @CurrentTenant() tenantId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.dropdown(tenantId, categoryId);
  }

  @Get(':id')
  @RequirePermissions('SERVICE_SUB_CATEGORY_VIEW')
  @ApiOperation({ summary: 'Get a service sub-category by id' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('SERVICE_SUB_CATEGORY_EDIT')
  @ApiOperation({ summary: 'Update a service sub-category' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceSubCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('SERVICE_SUB_CATEGORY_DELETE')
  @ApiOperation({ summary: 'Soft delete a service sub-category' })
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
