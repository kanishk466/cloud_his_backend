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
import { CityService } from './city.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { QueryCityDto } from './dto/query-city.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — City')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/cities')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class CityController {
  constructor(private readonly service: CityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_CITY_CREATE')
  @ApiOperation({ summary: 'Create a city (global master) under a district' })
  @ApiResponse({ status: 201, description: 'City created' })
  @ApiResponse({ status: 400, description: 'Invalid districtId' })
  @ApiResponse({ status: 409, description: 'City code exists' })
  create(@Body() dto: CreateCityDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_CITY_VIEW')
  @ApiOperation({ summary: 'List cities' })
  @ApiResponse({ status: 200, description: 'Cities returned' })
  list(@Query() query: QueryCityDto) {
    return this.service.list(query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_CITY_VIEW')
  @ApiOperation({ summary: 'Lightweight city list for form dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown(@Query('districtId') districtId?: string) {
    return this.service.dropdown(districtId);
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_CITY_VIEW')
  @ApiOperation({ summary: 'Get a city by id' })
  @ApiResponse({ status: 200, description: 'City returned' })
  @ApiResponse({ status: 404, description: 'City not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_CITY_EDIT')
  @ApiOperation({ summary: 'Update a city' })
  @ApiResponse({ status: 200, description: 'City updated' })
  @ApiResponse({ status: 404, description: 'City not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_CITY_DELETE')
  @ApiOperation({ summary: 'Delete a city' })
  @ApiResponse({ status: 200, description: 'City deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
