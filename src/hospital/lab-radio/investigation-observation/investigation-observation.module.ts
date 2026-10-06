import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { InvestigationObservationController } from './investigation-observation.controller';
import { InvestigationObservationService } from './investigation-observation.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [InvestigationObservationController],
  providers: [InvestigationObservationService],
  exports: [InvestigationObservationService],
})
export class InvestigationObservationModule {}
