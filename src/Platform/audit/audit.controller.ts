import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List platform audit logs (paginated, newest first)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'action',
    required: false,
    type: String,
    example: 'HOSPITAL_SUSPENDED',
  })
  @ApiQuery({
    name: 'actorEmail',
    required: false,
    type: String,
    example: 'admin@platform.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs',
    schema: {
      example: {
        data: [
          {
            id: 10,
            action: 'HOSPITAL_SUSPENDED',
            actorId: '5f1c...',
            actorEmail: 'admin@platform.com',
            targetType: 'Hospital',
            targetName: 'Apollo Clinic',
            detail: 'Suspended for non-payment',
            createdAt: '2026-07-26T10:12:00.000Z',
          },
        ],
        total: 42,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: ListAuditLogsDto) {
    return this.auditService.findAll(query);
  }
}
