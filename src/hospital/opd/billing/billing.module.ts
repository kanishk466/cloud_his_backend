import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';
import { DiscountApprovalModule } from '../../../modules/master-config/basic-master/discount-approval/discount-approval.module';

@Module({
  imports: [DiscountApprovalModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository],
  exports: [BillingService],
})
export class BillingModule {}
