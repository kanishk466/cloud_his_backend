import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { ServiceItemsService } from '../services/service-items.service';
import { BulkImportService } from '../services/bulk-import.service';
import { CreateServiceItemDto } from '../dto/service-item/create-service-item.dto';
import { UpdateServiceItemDto } from '../dto/service-item/update-service-item.dto';
import { FilterServiceItemDto } from '../dto/service-item/filter-service-item.dto';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('hospital/masters/service-items')
@UseGuards(HospitalJwtAuthGuard)
export class ServiceItemsController {
  constructor(
    private readonly service: ServiceItemsService,
    private readonly bulkImportService: BulkImportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateServiceItemDto) {
    return this.service.create(tenantId, dto);
  }

  // ─── Phase 2.1B: Bulk import service items from CSV / Excel ──────────────
  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  bulkImport(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('duplicateStrategy') duplicateStrategy?: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send a .csv or .xlsx file as multipart field "file".',
      );
    }

    const name = file.originalname.toLowerCase();
    const fileType = name.endsWith('.csv')
      ? ('csv' as const)
      : name.endsWith('.xlsx')
        ? ('xlsx' as const)
        : null;

    if (!fileType) {
      throw new BadRequestException(
        'Unsupported file type. Only .csv and .xlsx files are accepted.',
      );
    }

    return this.bulkImportService.importServicesFromFile(
      tenantId,
      file.buffer,
      fileType,
      {
        duplicateStrategy: duplicateStrategy === 'update' ? 'update' : 'skip',
      },
    );
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: FilterServiceItemDto,
  ) {
    return this.service.findAll(tenantId, filters);
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
    @Body() dto: UpdateServiceItemDto,
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
