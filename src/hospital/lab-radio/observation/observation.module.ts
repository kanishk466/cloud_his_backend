import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ObservationController } from './observation.controller';
import { ObservationService } from './observation.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ObservationController],
  providers: [ObservationService],
  exports: [ObservationService],
})
export class ObservationModule {}
