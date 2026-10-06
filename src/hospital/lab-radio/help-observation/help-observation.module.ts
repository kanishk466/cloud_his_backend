import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { HelpObservationController } from './help-observation.controller';
import { HelpObservationService } from './help-observation.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [HelpObservationController],
  providers: [HelpObservationService],
  exports: [HelpObservationService],
})
export class HelpObservationModule {}
