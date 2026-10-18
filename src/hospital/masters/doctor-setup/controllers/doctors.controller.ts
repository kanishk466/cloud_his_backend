import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { DoctorsService } from '../services/doctors.service';
import { DoctorShareReportService } from '../services/doctor-share-report.service';
import { MAX_SIGNATURE_SIZE } from '../../../../common/utils/file-upload.util';

@Controller('hospital/masters/doctors')
@UseGuards(HospitalJwtAuthGuard)
export class DoctorsController {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly shareReportService: DoctorShareReportService,
  ) {}

  // ─── Doctor share report (Phase 2.2B) ─────────────────────────────────────
  @Get('share-report')
  getShareReport(
    @CurrentTenant() tenantId: string,
    @Query('doctorProfileId') doctorProfileId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.shareReportService.generateShareReport(tenantId, {
      doctorProfileId,
      departmentId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get(':doctorProfileId')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
  ) {
    return this.doctorsService.findOne(tenantId, doctorProfileId);
  }

  // ─── Digital signature ─────────────────────────────────────────────────────
  @Post(':doctorProfileId/signature')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('signature', {
      limits: { fileSize: MAX_SIGNATURE_SIZE },
    }),
  )
  uploadSignature(
    @CurrentTenant() tenantId: string,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.doctorsService.uploadSignature(tenantId, doctorProfileId, file);
  }

  @Delete(':doctorProfileId/signature')
  removeSignature(
    @CurrentTenant() tenantId: string,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
  ) {
    return this.doctorsService.removeSignature(tenantId, doctorProfileId);
  }
}
