import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

import { ClinicalDepartmentsController } from './controllers/clinical-departments.controller';
import { SpecializationsController } from './controllers/specializations.controller';
import { DoctorVisitConfigsController } from './controllers/doctor-visit-configs.controller';
import { ReferDoctorsController } from './controllers/refer-doctors.controller';
import { ReferralCommissionsController } from './controllers/referral-commissions.controller';
import { DoctorsController } from './controllers/doctors.controller';

import { ClinicalDepartmentsService } from './services/clinical-departments.service';
import { SpecializationsService } from './services/specializations.service';
import { DoctorVisitConfigsService } from './services/doctor-visit-configs.service';
import { ReferDoctorsService } from './services/refer-doctors.service';
import { ReferralCommissionsService } from './services/referral-commissions.service';
import { DoctorsService } from './services/doctors.service';
import { DoctorShareReportService } from './services/doctor-share-report.service';

import { ClinicalDepartmentsRepository } from './repositories/clinical-departments.repository';
import { SpecializationsRepository } from './repositories/specializations.repository';
import { DoctorVisitConfigsRepository } from './repositories/doctor-visit-configs.repository';
import { ReferDoctorsRepository } from './repositories/refer-doctors.repository';
import { ReferralCommissionsRepository } from './repositories/referral-commissions.repository';
import { DoctorsRepository } from './repositories/doctors.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    ClinicalDepartmentsController,
    SpecializationsController,
    DoctorVisitConfigsController,
    // ⚠️ Commissions routes MUST bind before ReferDoctorsController's @Get(':id')
    ReferralCommissionsController,
    ReferDoctorsController,
    DoctorsController,
  ],
  providers: [
    ClinicalDepartmentsService,
    ClinicalDepartmentsRepository,
    SpecializationsService,
    SpecializationsRepository,
    DoctorVisitConfigsService,
    DoctorVisitConfigsRepository,
    ReferDoctorsService,
    ReferDoctorsRepository,
    ReferralCommissionsService,
    ReferralCommissionsRepository,
    DoctorsService,
    DoctorsRepository,
    DoctorShareReportService,
  ],
  exports: [
    ClinicalDepartmentsService,
    SpecializationsService,
    DoctorVisitConfigsService,
    ReferDoctorsService,
    ReferralCommissionsService,
    DoctorsService,
    DoctorShareReportService,
  ],
})
export class DoctorSetupModule {}
