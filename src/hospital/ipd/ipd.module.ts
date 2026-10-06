import { Module } from '@nestjs/common';
import { BedStatusModule } from './bed-status/bed-status.module';

/**
 * IPD module aggregator. Phase 2.3 ships Bed Status (runtime);
 * admissions/charges arrive in later phases.
 */
@Module({
  imports: [BedStatusModule],
  exports: [BedStatusModule],
})
export class IpdModule {}
