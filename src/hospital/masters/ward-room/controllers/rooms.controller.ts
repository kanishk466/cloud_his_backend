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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { RoomsService } from '../services/rooms.service';
import { CreateRoomDto } from '../dto/room/create-room.dto';
import { UpdateRoomDto } from '../dto/room/update-room.dto';
import { FilterRoomDto } from '../dto/room/filter-room.dto';
import { AssignAmenityDto } from '../dto/amenity/assign-amenity.dto';

@Controller('hospital/masters/rooms')
@UseGuards(HospitalJwtAuthGuard)
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateRoomDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() filters: FilterRoomDto) {
    return this.service.findAll(tenantId, filters);
  }

  // NOTE: static routes before @Get(':id')
  /** Rooms having ALL the given amenity codes: ?amenities=AC,TV,FRIDGE */
  @Get('by-amenity')
  findByAmenity(
    @CurrentTenant() tenantId: string,
    @Query('amenities') amenities?: string,
  ) {
    const codes = (amenities ?? '')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    return this.service.findByAmenities(tenantId, codes);
  }

  /** Gender-safe room list for IPD admission. */
  @Get('by-gender/:gender')
  findByGender(
    @CurrentTenant() tenantId: string,
    @Param('gender') gender: 'MALE_ONLY' | 'FEMALE_ONLY' | 'PEDIATRIC' | 'ANY',
  ) {
    return this.service.findByGender(tenantId, gender);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  /** Room details + live bed counts/status grid. */
  @Get(':id/occupancy')
  getOccupancy(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getOccupancy(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  /** Atomic replace of the room's amenity set. */
  @Put(':roomId/amenities')
  assignAmenities(
    @CurrentTenant() tenantId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: AssignAmenityDto,
  ) {
    return this.service.assignAmenities(tenantId, roomId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
