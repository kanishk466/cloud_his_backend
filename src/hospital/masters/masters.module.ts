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
import { ServiceItemTypeModule } from './service-item-type/service-item-type.module';
import { ServiceCategoryModule } from './service-category/service-category.module';
import { ServiceSubCategoryModule } from './service-sub-category/service-sub-category.module';
import { ClinicalDepartmentModule } from './clinical-department/clinical-department.module';
import { DoctorSpecializationModule } from './doctor-specialization/doctor-specialization.module';
import { ReferDoctorModule } from './refer-doctor/refer-doctor.module';
import { ProMappingModule } from './pro-mapping/pro-mapping.module';

@Module({
  imports: [
    GlobalMasterModule,
    ServiceItemTypeModule,
    ServiceCategoryModule,
    ServiceSubCategoryModule,
    ServiceMasterModule,
    ClinicalDepartmentModule,
    DoctorSpecializationModule,
    ReferDoctorModule,
    ProMappingModule,
    TariffModule,
    PanelModule,
  ],
  controllers: [DepartmentsController, ShiftsController],
  providers: [
    PrismaService,
    DepartmentsService,
    ShiftsService,
    DepartmentsRepository,
    ShiftsRepository,
  ],
  exports: [
    DepartmentsService,
    ShiftsService,
    GlobalMasterModule,
    ServiceItemTypeModule,
    ServiceCategoryModule,
    ServiceSubCategoryModule,
    ServiceMasterModule,
    ClinicalDepartmentModule,
    DoctorSpecializationModule,
    ReferDoctorModule,
    ProMappingModule,
    TariffModule,
    PanelModule,
  ],
})
export class MastersModule {}
