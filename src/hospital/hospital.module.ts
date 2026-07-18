import { Module } from '@nestjs/common';
import { HospitalIdentityModule } from './identity/identity.module';
import { MastersModule } from './masters/masters.module';
import { UserManagementModule } from './user-management/user-management.module';



@Module({
  imports: [
    HospitalIdentityModule,
    MastersModule,
    UserManagementModule,
  ],
})
export class HospitalModule {}