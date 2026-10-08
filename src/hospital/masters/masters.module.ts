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
import { GeoModule } from './geo/geo.module';
import { BankModule } from './bank/bank.module';
import { DocumentTypeModule } from './patient-document-type/document-type.module';
import { DiscountReasonModule } from './discount-reason/discount-reason.module';
import { DiscountApprovalAuthorityModule } from './discount-approval-authority/discount-approval-authority.module';
import { ServicesSetupModule } from './services-setup/services-setup.module';
import { DoctorSetupModule } from './doctor-setup/doctor-setup.module';
import { WardRoomModule } from './ward-room/ward-room.module';
import { ThresholdModule } from './threshold/threshold.module';
import { LabRadioModule } from './lab-radio/lab-radio.module';
import { PanelEnhancementsModule } from './panel-enhancements/panel-enhancements.module';
import { PackageSetupModule } from './package-setup/package-setup.module';

@Module({
  imports:[GlobalMasterModule , ServiceMasterModule , TariffModule , PanelModule , GeoModule , BankModule , DocumentTypeModule , DiscountReasonModule , DiscountApprovalAuthorityModule , ServicesSetupModule , DoctorSetupModule , WardRoomModule , ThresholdModule , LabRadioModule , PanelEnhancementsModule , PackageSetupModule],
  controllers: [DepartmentsController, ShiftsController],
  providers: [
    PrismaService,
    DepartmentsService,
    ShiftsService,
    DepartmentsRepository,
    ShiftsRepository,
  ],
  exports: [DepartmentsService, ShiftsService , GlobalMasterModule ,ServiceMasterModule,TariffModule,PanelModule,GeoModule,BankModule,DocumentTypeModule,DiscountReasonModule,DiscountApprovalAuthorityModule,ServicesSetupModule,DoctorSetupModule,WardRoomModule,ThresholdModule,LabRadioModule,PanelEnhancementsModule,PackageSetupModule],
})
export class MastersModule {}