import { Module } from '@nestjs/common';

import { HospitalRepository } from './repositories/hospital.repository';
import { AssignedPackageRepository } from './repositories/assigned-package.repository';
import { HospitalUserRepository } from './repositories/hospital-user.repository';

import { TenantService } from './services/tenant.service';
import { HospitalAdminProvisioningService } from './services/hospital-admin-provisioning.service';

import { PackageModule } from '../package/package.module';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { TenantController } from './controllers/tenant.controller';

@Module({
  imports: [PackageModule, AuditModule, MailModule],

  controllers: [TenantController],

  providers: [
    TenantService,
    HospitalRepository,
    AssignedPackageRepository,

    // NEW
    HospitalUserRepository,
    HospitalAdminProvisioningService,
  ],

  exports: [TenantService],
})
export class TenantModule {}