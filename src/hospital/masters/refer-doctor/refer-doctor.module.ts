import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ReferDoctorController } from './refer-doctor.controller';
import { ReferDoctorService } from './refer-doctor.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ReferDoctorController],
  providers: [ReferDoctorService],
  exports: [ReferDoctorService],
})
export class ReferDoctorModule {}
