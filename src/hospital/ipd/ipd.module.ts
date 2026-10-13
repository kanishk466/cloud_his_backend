import { Module } from '@nestjs/common';
import { AdmissionModule } from './admission/admission.module';
import { ClinicalModule } from './clinical/clinical.module';
import { BillingModule } from './billing/billing.module';

// IPD parent module — admission, clinical records and billing; housekeeping
// module still to come (queue endpoint already lives in ward-room).
@Module({
  imports: [AdmissionModule, ClinicalModule, BillingModule],
  exports: [AdmissionModule, ClinicalModule, BillingModule],
})
export class IpdModule {}
