import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { PlatformUsersService } from './platform-users.service';
import { ListPlatformUsersDto } from './dto/list-platform-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { actorFromRequest } from '../audit/audit-actor';

@ApiTags('Platform Users')
@ApiBearerAuth('access-token')
@Controller('platform-users')
@UseGuards(JwtAuthGuard)
export class PlatformUsersController {
  constructor(private readonly platformUsersService: PlatformUsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List platform users (never returns password hashes)',
  })
  @ApiQuery({ name: 'role', required: false, enum: PlatformRole })
  @ApiResponse({
    status: 200,
    description: 'Platform users returned',
    schema: {
      example: [
        {
          id: '2f6c0f2a-1f5e-4a1d-9b2e-6c1f0a3d4e5f',
          name: 'Platform Admin',
          email: 'admin@platform.com',
          role: 'PLATFORM_ADMIN',
          isActive: true,
          createdAt: '2026-07-26T10:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid role filter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: ListPlatformUsersDto) {
    return this.platformUsersService.findAll(query);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable a platform user' })
  @ApiResponse({ status: 201, description: 'User disabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Platform user not found' })
  @ApiResponse({ status: 409, description: 'User is already disabled' })
  disable(@Param('id') id: string) {
    return this.platformUsersService.disable(id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable a platform user' })
  @ApiResponse({ status: 201, description: 'User enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Platform user not found' })
  @ApiResponse({ status: 409, description: 'User is already active' })
  enable(@Param('id') id: string) {
    return this.platformUsersService.enable(id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: "Reset a platform user's password" })
  @ApiResponse({
    status: 201,
    description: 'Password reset',
    schema: { example: { message: 'Password reset successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Password must be at least 8 characters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Platform user not found' })
  resetPassword(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.platformUsersService.resetPassword(
      id,
      dto,
      actorFromRequest(req),
    );
  }
}
