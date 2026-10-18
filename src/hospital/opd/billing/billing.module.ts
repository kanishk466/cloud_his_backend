import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';
import { BillLineValidatorService } from './services/bill-line-validator.service';
import { InvoiceBuilderService } from './services/invoice-builder.service';
import { DoctorSetupModule } from '../../masters/doctor-setup/doctor-setup.module';

@Module({
  imports: [DoctorSetupModule], // ReferralCommissionsService (Phase 2.2B)
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingRepository,
    BillLineValidatorService,
    InvoiceBuilderService,
  ],
  exports: [BillingService, BillLineValidatorService, InvoiceBuilderService],
})
export class BillingModule {}
