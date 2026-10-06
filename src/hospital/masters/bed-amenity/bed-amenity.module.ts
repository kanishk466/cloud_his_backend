import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { BedAmenityController } from './bed-amenity.controller';
import { BedAmenityService } from './bed-amenity.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BedAmenityController],
  providers: [BedAmenityService],
  exports: [BedAmenityService],
})
export class BedAmenityModule {}
