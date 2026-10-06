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
import { StateService } from './state.service';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { QueryStateDto } from './dto/query-state.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — State')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/states')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class StateController {
  constructor(private readonly service: StateService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_STATE_CREATE')
  @ApiOperation({ summary: 'Create a state (global master) under a country' })
  @ApiResponse({ status: 201, description: 'State created' })
  @ApiResponse({ status: 400, description: 'Invalid countryId' })
  @ApiResponse({ status: 409, description: 'State code exists' })
  create(@Body() dto: CreateStateDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_STATE_VIEW')
  @ApiOperation({ summary: 'List states' })
  @ApiResponse({ status: 200, description: 'States returned' })
  list(@Query() query: QueryStateDto) {
    return this.service.list(query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_STATE_VIEW')
  @ApiOperation({ summary: 'Lightweight state list for form dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown(@Query('countryId') countryId?: string) {
    return this.service.dropdown(countryId);
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_STATE_VIEW')
  @ApiOperation({ summary: 'Get a state by id' })
  @ApiResponse({ status: 200, description: 'State returned' })
  @ApiResponse({ status: 404, description: 'State not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_STATE_EDIT')
  @ApiOperation({ summary: 'Update a state' })
  @ApiResponse({ status: 200, description: 'State updated' })
  @ApiResponse({ status: 404, description: 'State not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_STATE_DELETE')
  @ApiOperation({ summary: 'Delete a state' })
  @ApiResponse({ status: 200, description: 'State deleted' })
  @ApiResponse({ status: 409, description: 'State has child districts' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(id, this.actor(user));
  }

  private actor(user: CurrentUserPayload) {
    return { actorId: user.userId, actorEmail: user.email };
  }
}
