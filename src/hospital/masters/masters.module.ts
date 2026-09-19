import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

import { DepartmentsController } from './controllers/departments.controller';
import { ShiftsController } from './controllers/shifts.controller';

import { DepartmentsService } from './services/departments.service';
import { ShiftsService } from './services/shifts.service';

import { DepartmentsRepository } from './repositories/departments.repository';
import { ShiftsRepository } from './repositories/shifts.repository';
import { GlobalMasterModule } from './global-master/global-master.module';
import { TariffModule } from './tariff/tariff.module';
import { PanelModule } from './panel/panel.module';
import { ServiceMasterModule } from './service-master/service-master.module';

@Module({
  imports:[GlobalMasterModule , ServiceMasterModule , TariffModule , PanelModule],
  controllers: [DepartmentsController, ShiftsController],
  providers: [
    PrismaService,
    DepartmentsService,
    ShiftsService,
    DepartmentsRepository,
    ShiftsRepository,
  ],
  exports: [DepartmentsService, ShiftsService , GlobalMasterModule ,ServiceMasterModule,TariffModule,PanelModule],
})
export class MastersModule {}