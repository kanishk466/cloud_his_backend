import { Module } from '@nestjs/common';
import { AdmissionModule } from './admission/admission.module';

// IPD parent module — admission now; housekeeping/charging modules later.
@Module({
  imports: [AdmissionModule],
  exports: [AdmissionModule],
})
export class IpdModule {}
