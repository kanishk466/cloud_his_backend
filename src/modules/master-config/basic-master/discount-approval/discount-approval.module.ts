import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { DiscountApprovalController } from './discount-approval.controller';
import { DiscountValidationController } from './discount-validation.controller';
import { DiscountApprovalService } from './discount-approval.service';
import { DiscountValidationService } from './discount-validation.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DiscountApprovalController, DiscountValidationController],
  providers: [DiscountApprovalService, DiscountValidationService],
  exports: [DiscountApprovalService, DiscountValidationService],
})
export class DiscountApprovalModule {}
