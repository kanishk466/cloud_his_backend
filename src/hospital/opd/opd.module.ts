import { Module } from '@nestjs/common';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { QueueModule } from './queue/queue.module';
import { VitalsModule } from './vitals/vitals.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    DoctorsModule,           // ← NEW — Prerequisite for all
    PatientsModule,          // Step 1
    AppointmentsModule,      // Step 2
    QueueModule,             // Step 3
    VitalsModule,            // Step 4
    ConsultationsModule,     // Step 5
    BillingModule,           // Step 6
  ],
})
export class OpdModule {}