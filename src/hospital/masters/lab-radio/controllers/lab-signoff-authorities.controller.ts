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
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { LabSignoffAuthoritiesService } from '../services/lab-signoff-authorities.service';
import { CreateSignoffAuthorityDto } from '../dto/signoff-authority/create-signoff-authority.dto';
import { UpdateSignoffAuthorityDto } from '../dto/signoff-authority/update-signoff-authority.dto';
import { VerifyPermissionDto } from '../dto/signoff-authority/verify-permission.dto';

@Controller('hospital/masters/lab-signoff-authorities')
@UseGuards(HospitalJwtAuthGuard)
export class LabSignoffAuthoritiesController {
  constructor(private readonly service: LabSignoffAuthoritiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSignoffAuthorityDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('labDepartmentId') labDepartmentId?: string,
    @Query('hospitalUserId') hospitalUserId?: string,
    @Query('active') active?: string,
  ) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, {
      labDepartmentId,
      hospitalUserId,
      isActive,
    });
  }

  // NOTE: 'verify-permission' declared before @Get(':id')
  /** Permission guard for the LIS reporting engine (VERIFY / APPROVE_LOCK). */
  @Post('verify-permission')
  @HttpCode(HttpStatus.OK)
  verifyPermission(
    @CurrentTenant() tenantId: string,
    @Body() dto: VerifyPermissionDto,
  ) {
    return this.service.verifyPermission(tenantId, dto);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSignoffAuthorityDto,
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
