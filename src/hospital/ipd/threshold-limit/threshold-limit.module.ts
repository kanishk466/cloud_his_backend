import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { MailModule } from 'src/Platform/mail/mail.module';
import { ThresholdLimitController } from './threshold-limit.controller';
import { ThresholdLimitService } from './threshold-limit.service';
import { ThresholdCheckService } from './threshold-check.service';

@Module({
  imports: [PrismaModule, AuditModule, MailModule],
  controllers: [ThresholdLimitController],
  providers: [ThresholdLimitService, ThresholdCheckService],
  exports: [ThresholdLimitService, ThresholdCheckService],
})
export class ThresholdLimitModule {}
