import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { ReferenceRangesService } from '../services/reference-ranges.service';
import { CreateReferenceRangeDto } from '../dto/reference-range/create-reference-range.dto';
import { BulkCreateReferenceRangesDto } from '../dto/reference-range/bulk-create-reference-ranges.dto';

@Controller('hospital/masters/reference-ranges')
@UseGuards(HospitalJwtAuthGuard)
export class ReferenceRangesController {
  constructor(private readonly service: ReferenceRangesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateReferenceRangeDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  /** Replace ALL ranges of an observation atomically. */
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulkCreate(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkCreateReferenceRangesDto,
  ) {
    return this.service.bulkCreate(tenantId, dto);
  }

  @Get('observation/:observationId')
  findForObservation(
    @CurrentTenant() tenantId: string,
    @Param('observationId', ParseUUIDPipe) observationId: string,
  ) {
    return this.service.findForObservation(tenantId, observationId);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
