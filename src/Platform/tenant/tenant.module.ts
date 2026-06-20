import { Module } from '@nestjs/common';

import { HospitalRepository }
from './repositories/hospital.repository';

import { AssignedPackageRepository }
from './repositories/assigned-package.repository';

import { TenantService } from './services/tenant.service';
import { PackageModule } from '../package/package.module';
import {TenantController} from "./controllers/tenant.controller";

@Module({

  imports: [
    PackageModule
  ],

  controllers: [
    TenantController
  ],

  providers: [
    TenantService,
    HospitalRepository,
    AssignedPackageRepository,
  ],

  exports: [
   TenantService
  ],
})
export class TenantModule {}