import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { ThresholdModule } from '../../masters/threshold/threshold.module';
import { ClinicalModule } from '../clinical/clinical.module';
import { BillingController } from './billing.controller';
import { IpdPaymentsController } from './payments.controller';
import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';

/**
 * Phase 3.3 — IPD billing + payments:
 *
 *   /api/ipd/billing/charges            charge entry (threshold-checked)
 *   /api/ipd/billing/daily-accrual      room + nursing per day (idempotent)
 *   /api/ipd/billing/provisional/:id    running bill
 *   /api/ipd/admissions/:id/payments    receipts (also move `advancePaid`)
 *
 * Imports ClinicalModule for the shared admission context (tenant scope +
 * open/closed rule) and ThresholdModule for the Phase 1.4 cap engine.
 */
@Module({
  imports: [PrismaModule, ClinicalModule, ThresholdModule],
  controllers: [BillingController, IpdPaymentsController],
  providers: [BillingService, BillingRepository],
  exports: [BillingService],
})
export class BillingModule {}
