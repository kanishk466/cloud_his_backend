import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { BedStatusController } from './bed-status.controller';
import { BedStatusService } from './bed-status.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BedStatusController],
  providers: [BedStatusService],
  exports: [BedStatusService],
})
export class BedStatusModule {}
