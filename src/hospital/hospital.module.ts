import { Module } from '@nestjs/common';
import { HospitalIdentityModule } from './identity/identity.module';
import { MastersModule } from './masters/masters.module';
import { UserManagementModule } from './user-management/user-management.module';
import { OpdModule } from './opd/opd.module';


@Module({
  imports: [
    HospitalIdentityModule,
    MastersModule,
    UserManagementModule,
    OpdModule,
  ],
})
export class HospitalModule {}