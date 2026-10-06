import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { DiscountReasonController } from './discount-reason.controller';
import { DiscountReasonService } from './discount-reason.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DiscountReasonController],
  providers: [DiscountReasonService],
  exports: [DiscountReasonService],
})
export class DiscountReasonModule {}
