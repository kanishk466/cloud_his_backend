import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoRepository } from './geo.repository';

@Module({
  imports: [PrismaModule],
  controllers: [GeoController],
  providers: [GeoService, GeoRepository],
  exports: [GeoService],
})
export class GeoModule {}
