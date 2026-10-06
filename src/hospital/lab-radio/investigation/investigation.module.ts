import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { InvestigationController } from './investigation.controller';
import { InvestigationService } from './investigation.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [InvestigationController],
  providers: [InvestigationService],
  exports: [InvestigationService],
})
export class InvestigationModule {}
