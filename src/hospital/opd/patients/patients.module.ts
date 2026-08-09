import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientsRepository } from './patients.repository';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

@Module({
   imports: [PrismaModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsRepository],
  exports: [PatientsService , PatientsRepository], // Exported for use in Appointments module
})
export class PatientsModule {}