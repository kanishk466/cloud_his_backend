import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { InterpretationsService } from '../services/interpretations.service';
import { CreateInterpretationDto } from '../dto/interpretation/create-interpretation.dto';
import { BulkCreateInterpretationsDto } from '../dto/interpretation/bulk-create-interpretations.dto';

@Controller('hospital/masters/lab-interpretations')
@UseGuards(HospitalJwtAuthGuard)
export class InterpretationsController {
  constructor(private readonly service: InterpretationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateInterpretationDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  /** Replace ALL interpretation rules of an observation atomically. */
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulkCreate(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkCreateInterpretationsDto,
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

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateInterpretationDto>,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
