import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { DietOrdersService } from './diet-orders.service';
import { CreateDietOrderDto } from './dto/create-diet-order.dto';
import { ClinicalFilterDto } from './dto/clinical-filter.dto';

/** `GET /ipd/diet-orders/active?admissionId=…`. */
class ActiveDietQueryDto {
  @IsUUID()
  admissionId: string;
}

@Controller('ipd/diet-orders')
@UseGuards(HospitalJwtAuthGuard)
export class DietOrdersController {
  constructor(private readonly service: DietOrdersService) {}

  /** POST /api/ipd/diet-orders — set (or replace) the diet. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  order(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDietOrderDto,
  ) {
    return this.service.order(tenantId, userId, dto);
  }

  // NOTE: declared before any ':id' route
  /** GET /api/ipd/diet-orders/active?admissionId=… */
  @Get('active')
  active(
    @CurrentTenant() tenantId: string,
    @Query() query: ActiveDietQueryDto,
  ) {
    return this.service.active(tenantId, query.admissionId);
  }

  /** GET /api/ipd/diet-orders?admissionId=… — history, newest first. */
  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: ClinicalFilterDto,
  ) {
    return this.service.list(tenantId, filters);
  }

  /** POST /api/ipd/diet-orders/:id/stop */
  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stop(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.stop(tenantId, id);
  }
}
