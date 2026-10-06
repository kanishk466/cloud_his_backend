import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { DoctorSpecializationController } from './doctor-specialization.controller';
import { DoctorSpecializationService } from './doctor-specialization.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DoctorSpecializationController],
  providers: [DoctorSpecializationService],
  exports: [DoctorSpecializationService],
})
export class DoctorSpecializationModule {}
