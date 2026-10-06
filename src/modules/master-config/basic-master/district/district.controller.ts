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
import { DistrictService } from './district.service';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { QueryDistrictDto } from './dto/query-district.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — District')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/districts')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class DistrictController {
  constructor(private readonly service: DistrictService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_DISTRICT_CREATE')
  @ApiOperation({ summary: 'Create a district (global master) under a state' })
  @ApiResponse({ status: 201, description: 'District created' })
  @ApiResponse({ status: 400, description: 'Invalid stateId' })
  @ApiResponse({ status: 409, description: 'District code exists' })
  create(@Body() dto: CreateDistrictDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_DISTRICT_VIEW')
  @ApiOperation({ summary: 'List districts' })
  @ApiResponse({ status: 200, description: 'Districts returned' })
  list(@Query() query: QueryDistrictDto) {
    return this.service.list(query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_DISTRICT_VIEW')
  @ApiOperation({ summary: 'Lightweight district list for form dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown(@Query('stateId') stateId?: string) {
    return this.service.dropdown(stateId);
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_DISTRICT_VIEW')
  @ApiOperation({ summary: 'Get a district by id' })
  @ApiResponse({ status: 200, description: 'District returned' })
  @ApiResponse({ status: 404, description: 'District not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_DISTRICT_EDIT')
  @ApiOperation({ summary: 'Update a district' })
  @ApiResponse({ status: 200, description: 'District updated' })
  @ApiResponse({ status: 404, description: 'District not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistrictDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_DISTRICT_DELETE')
  @ApiOperation({ summary: 'Delete a district' })
  @ApiResponse({ status: 200, description: 'District deleted' })
  @ApiResponse({ status: 409, description: 'District has child cities' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
