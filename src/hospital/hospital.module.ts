import { Module } from '@nestjs/common';
import { HospitalIdentityModule } from './identity/identity.module';
import { MastersModule } from './masters/masters.module';
import { UserManagementModule } from './user-management/user-management.module';
import { OpdModule } from './opd/opd.module';
import { IpdModule } from './ipd/ipd.module';
import { LabRadioModule } from './lab-radio/lab-radio.module';
import { PermissionsModule } from './core/permissions/permissions.module';


@Module({
  imports: [
    PermissionsModule,
    HospitalIdentityModule,
    MastersModule,
    UserManagementModule,
    OpdModule,
    IpdModule,
    LabRadioModule,
  ],
})
export class HospitalModule {}