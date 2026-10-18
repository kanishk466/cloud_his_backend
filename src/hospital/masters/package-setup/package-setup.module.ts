import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { PackagesController } from './controllers/packages.controller';
import { PackageConsumptionController } from './controllers/package-consumption.controller';
import { PackagesService } from './services/packages.service';
import { PackageConsumptionEngineService } from './services/package-consumption-engine.service';
import { PackagesRepository } from './repositories/packages.repository';
import { PackageConsumptionRepository } from './repositories/package-consumption.repository';

@Module({
  imports: [PrismaModule],
  controllers: [PackagesController, PackageConsumptionController],
  providers: [
    PackagesService,
    PackageConsumptionEngineService,
    PackagesRepository,
    PackageConsumptionRepository,
  ],
  exports: [PackagesService, PackageConsumptionEngineService], // engine → OPD/IPD billing
})
export class PackageSetupModule {}
