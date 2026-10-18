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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { PanelDocumentsService } from '../services/panel-documents.service';
import { CreatePanelDocumentDto } from '../dto/panel-document/create-panel-document.dto';
import { UpdatePanelDocumentDto } from '../dto/panel-document/update-panel-document.dto';
import { MAX_PANEL_TEMPLATE_SIZE } from '../../../../common/utils/file-upload.util';

@Controller('hospital/masters/panel-documents')
@UseGuards(HospitalJwtAuthGuard)
export class PanelDocumentsController {
  constructor(private readonly service: PanelDocumentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePanelDocumentDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('active') active?: string) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, isActive);
  }

  /** Claim checklist for a panel; ?module=OPD|IPD scopes it. */
  @Get('panel/:panelId')
  findByPanel(
    @CurrentTenant() tenantId: string,
    @Param('panelId', ParseUUIDPipe) panelId: string,
    @Query('module') module?: 'OPD' | 'IPD',
  ) {
    return this.service.findByPanel(tenantId, panelId, module);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  /** Upload the blank printable template (PDF/PNG/JPG ≤ 10 MB). */
  @Post(':id/template')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('template', {
      limits: { fileSize: MAX_PANEL_TEMPLATE_SIZE },
    }),
  )
  uploadTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadTemplate(tenantId, id, file);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePanelDocumentDto,
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
