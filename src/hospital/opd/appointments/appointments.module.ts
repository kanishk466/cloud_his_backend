import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsRepository } from './appointments.repository';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    PatientsModule, // Reuse PatientsRepository via PatientsModule
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService], // Used in Queue module (Step 3)
})
export class AppointmentsModule {}