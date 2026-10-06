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
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { QueryCountryDto } from './dto/query-country.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — Country')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/countries')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class CountryController {
  constructor(private readonly service: CountryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_COUNTRY_CREATE')
  @ApiOperation({ summary: 'Create a country (global master)' })
  @ApiResponse({ status: 201, description: 'Country created' })
  @ApiResponse({ status: 409, description: 'Country already exists' })
  create(
    @Body() dto: CreateCountryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_COUNTRY_VIEW')
  @ApiOperation({ summary: 'List countries' })
  @ApiResponse({ status: 200, description: 'Countries returned' })
  list(@Query() query: QueryCountryDto) {
    return this.service.list(query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_COUNTRY_VIEW')
  @ApiOperation({ summary: 'Lightweight country list for form dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown() {
    return this.service.dropdown();
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_COUNTRY_VIEW')
  @ApiOperation({ summary: 'Get a country by id' })
  @ApiResponse({ status: 200, description: 'Country returned' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_COUNTRY_EDIT')
  @ApiOperation({ summary: 'Update a country' })
  @ApiResponse({ status: 200, description: 'Country updated' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCountryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_COUNTRY_DELETE')
  @ApiOperation({ summary: 'Delete a country' })
  @ApiResponse({ status: 200, description: 'Country deleted' })
  @ApiResponse({ status: 409, description: 'Country has child states' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
