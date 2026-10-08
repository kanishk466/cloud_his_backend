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
import { ReportCommentsService } from '../services/report-comments.service';
import {
  COMMENT_CATEGORIES,
  CreateReportCommentDto,
} from '../dto/report-comment/create-report-comment.dto';
import { UpdateReportCommentDto } from '../dto/report-comment/update-report-comment.dto';

@Controller('hospital/masters/report-comments')
@UseGuards(HospitalJwtAuthGuard)
export class ReportCommentsController {
  constructor(private readonly service: ReportCommentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateReportCommentDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('labDepartmentId') labDepartmentId?: string,
    @Query('category') category?: (typeof COMMENT_CATEGORIES)[number],
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    const isActive =
      typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll(tenantId, {
      labDepartmentId,
      category,
      search,
      isActive,
    });
  }

  // NOTE: 'quick' declared before @Get(':id')
  /** Quick lookup by shortcut code: ?shortcut=HEM */
  @Get('quick')
  getByShortcut(
    @CurrentTenant() tenantId: string,
    @Query('shortcut') shortcut: string,
  ) {
    return this.service.getByShortcut(tenantId, shortcut);
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
    @Body() dto: UpdateReportCommentDto,
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
