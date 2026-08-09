import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalJwtStrategy } from '../../identity/strategies/hospital-jwt.strategy';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';

@Controller('opd/queue')
@UseGuards(HospitalJwtAuthGuard, HospitalJwtStrategy)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  // ─── POST /opd/queue/generate ───────────────────────────────────
  // Generate token for an appointment
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateToken(
    @Body() dto: CreateTokenDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.generateToken(tenantId, dto);
  }

  // ─── GET /opd/queue/doctor/:doctorProfileId ─────────────────────
  // Get full queue for a doctor (with stats)
  @Get('doctor/:doctorProfileId')
  async getDoctorQueue(
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @Query('date') date: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.getDoctorQueue(
      tenantId,
      doctorProfileId,
      date,
    );
  }

  // ─── GET /opd/queue/stats/:doctorProfileId ──────────────────────
  // Get queue statistics only
  @Get('stats/:doctorProfileId')
  async getStats(
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @Query('date') date: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.getStats(tenantId, doctorProfileId, date);
  }

  // ─── GET /opd/queue/display-board ───────────────────────────────
  // OPD display board — all doctors current tokens
  @Get('display-board')
  async getDisplayBoard(@CurrentTenant() tenantId: string) {
    return this.queueService.getDisplayBoard(tenantId);
  }

  // ─── GET /opd/queue/token/:id ───────────────────────────────────
  // Get single token detail
  @Get('token/:id')
  async getToken(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.getTokenById(tenantId, id);
  }

  // ─── PATCH /opd/queue/call-next/:doctorProfileId ────────────────
  // Doctor calls next patient (auto-picks highest priority waiting)
  @Patch('call-next/:doctorProfileId')
  async callNext(
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.queueService.callNext(
      tenantId,
      doctorProfileId,
    );

    if (!result) {
      return {
        success: true,
        data: null,
        message: 'No more patients waiting in queue',
      };
    }

    return result;
  }

  // ─── PATCH /opd/queue/:tokenId/call ─────────────────────────────
  // Doctor calls a specific token (out of order)
  @Patch(':tokenId/call')
  async callToken(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.callToken(tenantId, tokenId);
  }

  // ─── PATCH /opd/queue/:tokenId/skip ─────────────────────────────
  // Skip patient (not present)
  @Patch(':tokenId/skip')
  async skipToken(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.skipToken(tenantId, tokenId);
  }

  // ─── PATCH /opd/queue/:tokenId/requeue ──────────────────────────
  // Put skipped patient back in queue
  @Patch(':tokenId/requeue')
  async requeueToken(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.requeueToken(tenantId, tokenId);
  }

  // ─── PATCH /opd/queue/:tokenId/complete ─────────────────────────
  // Doctor completes consultation
  @Patch(':tokenId/complete')
  async completeToken(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.completeToken(tenantId, tokenId);
  }

  // ─── PATCH /opd/queue/:tokenId/cancel ───────────────────────────
  // Cancel token
  @Patch(':tokenId/cancel')
  async cancelToken(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.queueService.cancelToken(tenantId, tokenId);
  }
}