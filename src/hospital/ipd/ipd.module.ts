import { Module } from '@nestjs/common';
import { BedStatusModule } from './bed-status/bed-status.module';
import { ThresholdLimitModule } from './threshold-limit/threshold-limit.module';

/**
 * IPD module aggregator. Phase 2.3 ships Bed Status (runtime);
 * Phase 1.4 adds Threshold Limit; admissions/charges arrive in later phases.
 */
@Module({
  imports: [BedStatusModule, ThresholdLimitModule],
  exports: [BedStatusModule, ThresholdLimitModule],
})
export class IpdModule {}
