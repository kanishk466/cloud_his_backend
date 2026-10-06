import { Module } from '@nestjs/common';
import { CountryModule } from './country/country.module';
import { StateModule } from './state/state.module';
import { DistrictModule } from './district/district.module';
import { CityModule } from './city/city.module';
import { BankModule } from './bank/bank.module';
import { PatientDocumentModule } from './patient-document/patient-document.module';
import { DiscountReasonModule } from './discount-reason/discount-reason.module';
import { DiscountApprovalModule } from './discount-approval/discount-approval.module';

/**
 * Basic Master aggregator (Phase 1.1 + 1.2).
 * Standalone masters with no dependency on other masters.
 *
 * Dependency order:
 *   Country → State → District → City   (geo hierarchy)
 *   Bank, PatientDocument                (independent)
 *   DiscountReason, DiscountApproval     (Phase 1.2 — discount foundation)
 */
@Module({
  imports: [
    CountryModule,
    StateModule,
    DistrictModule,
    CityModule,
    BankModule,
    PatientDocumentModule,
    DiscountReasonModule,
    DiscountApprovalModule,
  ],
  exports: [
    CountryModule,
    StateModule,
    DistrictModule,
    CityModule,
    BankModule,
    PatientDocumentModule,
    DiscountReasonModule,
    DiscountApprovalModule,
  ],
})
export class BasicMasterModule {}
