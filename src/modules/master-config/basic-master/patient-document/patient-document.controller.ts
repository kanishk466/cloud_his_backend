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
import { PatientDocumentService } from './patient-document.service';
import { CreatePatientDocumentDto } from './dto/create-patient-document.dto';
import { UpdatePatientDocumentDto } from './dto/update-patient-document.dto';
import { QueryPatientDocumentDto } from './dto/query-patient-document.dto';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { PermissionsGuard } from '../../../../hospital/core/permissions/permissions.guard';
import { RequirePermissions } from '../../../../hospital/core/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../../../hospital/core/decorators/current-tenant.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

@ApiTags('Basic Master — Patient Document')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/patient-documents')
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
export class PatientDocumentController {
  constructor(private readonly service: PatientDocumentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('BASIC_MASTER_PATIENT_DOC_CREATE')
  @ApiOperation({ summary: 'Create a patient document type' })
  @ApiResponse({ status: 201, description: 'Document created' })
  @ApiResponse({ status: 409, description: 'Document already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePatientDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(tenantId, dto, this.actor(user));
  }

  @Get()
  @RequirePermissions('BASIC_MASTER_PATIENT_DOC_VIEW')
  @ApiOperation({ summary: 'List patient documents' })
  @ApiResponse({ status: 200, description: 'Documents returned' })
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryPatientDocumentDto,
  ) {
    return this.service.list(tenantId, query);
  }

  @Get('dropdown')
  @RequirePermissions('BASIC_MASTER_PATIENT_DOC_VIEW')
  @ApiOperation({ summary: 'Lightweight document list for form dropdowns' })
  @ApiResponse({ status: 200, description: 'Dropdown values returned' })
  dropdown(
    @CurrentTenant() tenantId: string,
    @Query('applicableFor') applicableFor?: string,
  ) {
    return this.service.dropdown(tenantId, applicableFor);
  }

  @Get(':id')
  @RequirePermissions('BASIC_MASTER_PATIENT_DOC_VIEW')
  @ApiOperation({ summary: 'Get a patient document by id' })
  @ApiResponse({ status: 200, description: 'Document returned' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('BASIC_MASTER_PATIENT_DOC_EDIT')
  @ApiOperation({ summary: 'Update a patient document' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(tenantId, id, dto, this.actor(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('BASIC_MASTER_PATIENT_DOC_DELETE')
  @ApiOperation({ summary: 'Soft delete a patient document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
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
