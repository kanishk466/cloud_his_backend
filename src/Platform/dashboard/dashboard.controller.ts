import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform dashboard aggregate statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
    schema: {
      example: {
        totalHospitals: 12,
        activeHospitals: 9,
        totalRevenue: 71982,
        revenueByMonth: [
          { month: '2026-02', revenue: 0 },
          { month: '2026-07', revenue: 15998 },
        ],
        hospitalHealthSnapshot: [
          {
            id: 3,
            name: 'Apollo Clinic',
            isActive: true,
            packageName: 'PREMIUM',
          },
        ],
        recentActivity: [
          {
            id: 10,
            action: 'HOSPITAL_SUSPENDED',
            actorId: '5f1c...',
            actorEmail: 'admin@platform.com',
            targetType: 'Hospital',
            targetName: 'Apollo Clinic',
            detail: null,
            createdAt: '2026-07-26T10:12:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats() {
    return this.dashboardService.getStats();
  }
}
