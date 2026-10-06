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
import { BankService } from './bank.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { QueryBankDto } from './dto/query-bank.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../../../hospital/core/decorators/current-tenant.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — Bank')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/banks')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class BankController {
  constructor(private readonly service: BankService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_BANK_CREATE')
  @ApiOperation({ summary: 'Create a bank' })
  @ApiResponse({ status: 201, description: 'Bank created' })
  @ApiResponse({ status: 409, description: 'Bank already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBankDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_BANK_VIEW')
  @ApiOperation({ summary: 'List banks' })
  @ApiResponse({ status: 200, description: 'Banks returned' })
  list(@CurrentTenant() tenantId: string, @Query() query: QueryBankDto) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_BANK_VIEW')
  @ApiOperation({ summary: 'Lightweight bank list for form dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown(@CurrentTenant() tenantId: string) {
    return this.service.dropdown(tenantId);
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_BANK_VIEW')
  @ApiOperation({ summary: 'Get a bank by id' })
  @ApiResponse({ status: 200, description: 'Bank returned' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_BANK_EDIT')
  @ApiOperation({ summary: 'Update a bank' })
  @ApiResponse({ status: 200, description: 'Bank updated' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_BANK_DELETE')
  @ApiOperation({ summary: 'Soft delete a bank' })
  @ApiResponse({ status: 200, description: 'Bank deleted' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
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
