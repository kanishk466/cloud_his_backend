import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { TenantService } from '../services/tenant.service';
import { CreateHospitalDto } from '../dto/create-hospital.dto';
import { AssignPackageDto } from '../dto/assign-package.dto';
import { actorFromRequest } from '../../audit/audit-actor';

@ApiTags('Hospitals')
@ApiBearerAuth('access-token')
@Controller('hospitals')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a hospital (tenant)' })
  @ApiResponse({ status: 201, description: 'Hospital created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Hospital code or email exists' })
  createHospital(@Request() req: any, @Body() dto: CreateHospitalDto) {
    return this.tenantService.createHospital(dto, actorFromRequest(req));
  }

  @Get()
  @ApiOperation({ summary: 'List all hospitals' })
  @ApiResponse({ status: 200, description: 'Hospitals returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getHospitals() {
    return this.tenantService.getHospitals();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hospital by id' })
  @ApiResponse({ status: 200, description: 'Hospital returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Hospital not found' })
  getHospitalById(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getHospitalById(id);
  }

  @Post(':id/packages')
  @ApiOperation({ summary: 'Assign a package to a hospital' })
  @ApiResponse({ status: 201, description: 'Package assigned' })
  @ApiResponse({ status: 400, description: 'Package is inactive' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Hospital or package not found' })
  @ApiResponse({ status: 409, description: 'Hospital already has an active package' })
  assignPackage(
    @Param('id', ParseIntPipe) hospitalId: number,
    @Body() dto: AssignPackageDto,
  ) {
    return this.tenantService.assignPackage(hospitalId, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a hospital and provision its admin user' })
  @ApiResponse({ status: 201, description: 'Hospital activated' })
  @ApiResponse({ status: 400, description: 'No package assigned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Hospital not found' })
  activateHospital(@Param('id', ParseIntPipe) hospitalId: number) {
    return this.tenantService.activateHospital(hospitalId);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend an active hospital' })
  @ApiResponse({ status: 201, description: 'Hospital suspended' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Hospital not found' })
  @ApiResponse({ status: 409, description: 'Hospital is already suspended' })
  suspendHospital(
    @Request() req: any,
    @Param('id', ParseIntPipe) hospitalId: number,
  ) {
    return this.tenantService.suspendHospital(
      hospitalId,
      actorFromRequest(req),
    );
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended hospital' })
  @ApiResponse({ status: 201, description: 'Hospital reactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Hospital not found' })
  @ApiResponse({ status: 409, description: 'Hospital is already active' })
  reactivateHospital(
    @Request() req: any,
    @Param('id', ParseIntPipe) hospitalId: number,
  ) {
    return this.tenantService.reactivateHospital(
      hospitalId,
      actorFromRequest(req),
    );
  }
}
