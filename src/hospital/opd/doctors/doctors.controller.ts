import {
  Controller, Post, Get, Patch, Delete,
  Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { CreateLeaveBlockDto } from './dto/create-leave-block.dto';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalJwtStrategy } from '../../identity/strategies/hospital-jwt.strategy';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';

@Controller('opd/doctors')
@UseGuards(HospitalJwtAuthGuard, HospitalJwtStrategy)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // ═══════════════════════════════════════════════════════════════
  //  DOCTOR PROFILE
  // ═══════════════════════════════════════════════════════════════

  // POST /opd/doctors — Create doctor profile
  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Body() dto: CreateDoctorProfileDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.doctorsService.createProfile(tenantId, dto);
  }

  // GET /opd/doctors — List all doctors
  @Get('/list')
  async findMany(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('specialization') specialization?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.doctorsService.findMany(tenantId, {
      search,
      specialization,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // GET /opd/doctors/:id — Get doctor detail
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.doctorsService.findById(tenantId, id);
  }

  // PATCH /opd/doctors/:id — Update doctor
  @Patch(':id')
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorProfileDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.doctorsService.updateProfile(tenantId, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  //  AVAILABILITY
  // ═══════════════════════════════════════════════════════════════

  // PUT /opd/doctors/:id/availability — Set weekly schedule
  @Post(':id/availability')
  //@HttpCode(HttpStatus.OK)
  async setAvailability(
    @Body() dto: SetAvailabilityDto,
    @Req() req: any, @Param('id') id: string
  ) {
    return this.doctorsService.setAvailability(req.user.tenantId, id, dto);
  }

  // GET /opd/doctors/:id/availability — Get weekly schedule
  @Get(':id/availability')
  async getAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.doctorsService.getAvailability(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════
  //  LEAVE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  // POST /opd/doctors/:id/leaves — Create leave
  @Post(':id/leaves')
  @HttpCode(HttpStatus.CREATED)
  async createLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLeaveBlockDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.doctorsService.createLeave(tenantId, id, dto);
  }

  // GET /opd/doctors/:id/leaves — List leaves
  @Get(':id/leaves')
  async listLeaves(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.doctorsService.listLeaves(tenantId, id, {
      fromDate,
      toDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // DELETE /opd/doctors/:id/leaves/:leaveId — Cancel leave
  @Delete(':id/leaves/:leaveId')
  async deleteLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('leaveId', ParseUUIDPipe) leaveId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.doctorsService.deleteLeave(tenantId, id, leaveId);
  }
}