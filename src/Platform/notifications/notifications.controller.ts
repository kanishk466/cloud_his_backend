import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Platform notifications: pending activations and expiring packages',
  })
  @ApiResponse({ status: 200, description: 'Notification feed' })
  getNotifications() {
    return this.notificationsService.getNotifications();
  }
}
