import { Controller, Get, UseGuards } from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { WardRoomService } from '../services/ward-room.service';

@Controller('hospital/masters/ward-room')
@UseGuards(HospitalJwtAuthGuard)
export class WardRoomController {
  constructor(private readonly service: WardRoomService) {}

  /** Real-time Bed Occupancy Rate dashboard. */
  @Get('bor-dashboard')
  getBorDashboard(@CurrentTenant() tenantId: string) {
    return this.service.getBorDashboard(tenantId);
  }

  /** Housekeeping worklist — beds currently in HOUSEKEEPING, oldest first. */
  @Get('housekeeping-queue')
  getHousekeepingQueue(@CurrentTenant() tenantId: string) {
    return this.service.getHousekeepingQueue(tenantId);
  }
}
