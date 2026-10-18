import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

import { RoomTypesController } from './controllers/room-types.controller';
import { RoomsController } from './controllers/rooms.controller';
import { BedsController } from './controllers/beds.controller';
import { AmenitiesController } from './controllers/amenities.controller';
import { WardRoomController } from './controllers/ward-room.controller';

import { RoomTypesService } from './services/room-types.service';
import { RoomsService } from './services/rooms.service';
import { BedsService } from './services/beds.service';
import { BedStatusService } from './services/bed-status.service';
import { AmenitiesService } from './services/amenities.service';
import { WardRoomService } from './services/ward-room.service';

import { RoomTypesRepository } from './repositories/room-types.repository';
import { RoomsRepository } from './repositories/rooms.repository';
import { BedsRepository } from './repositories/beds.repository';
import { BedStatusRepository } from './repositories/bed-status.repository';
import { AmenitiesRepository } from './repositories/amenities.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    RoomTypesController,
    RoomsController,
    BedsController,
    AmenitiesController,
    WardRoomController,
  ],
  providers: [
    RoomTypesService,
    RoomsService,
    BedsService,
    BedStatusService,
    AmenitiesService,
    WardRoomService,
    RoomTypesRepository,
    RoomsRepository,
    BedsRepository,
    BedStatusRepository,
    AmenitiesRepository,
  ],
  exports: [
    RoomTypesService,
    RoomsService, // future Threshold Limit integration
    BedsService,
    BedStatusService, // future IPD Admission module
    AmenitiesService,
    WardRoomService,
  ],
})
export class WardRoomModule {}
