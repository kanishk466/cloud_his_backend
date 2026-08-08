import { Module } from '@nestjs/common';
import { PatientsModule } from './patients/patients.module';
import {AppointmentsModule} from "./appointments/appointments.module"
import { QueueModule } from './queue/queue.module';
import { VitalsModule } from './vitals/vitals.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    PatientsModule,
    AppointmentsModule,
    QueueModule ,       
    VitalsModule, 
           ConsultationsModule, 
           BillingModule
  ],
})
export class OpdModule {}