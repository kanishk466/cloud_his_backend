import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { AdmissionModule } from '../admission/admission.module';
import { ClinicalContextService } from './clinical-context.service';
import { VitalsController } from './vitals.controller';
import { VitalsService } from './vitals.service';
import { VitalsRepository } from './vitals.repository';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';
import { RoundsRepository } from './rounds.repository';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { MedicationsRepository } from './medications.repository';
import { DietOrdersController } from './diet-orders.controller';
import { DietOrdersService } from './diet-orders.service';
import { DietOrdersRepository } from './diet-orders.repository';

/**
 * Phase 3.3 — IPD clinical records:
 *
 *   /api/ipd/vitals        VitalsController        (POST, GET)
 *   /api/ipd/rounds        RoundsController        (POST, GET)
 *   /api/ipd/medications   MedicationsController   (POST, GET, POST :id/stop)
 *   /api/ipd/diet-orders   DietOrdersController    (POST, GET, GET active, POST :id/stop)
 *
 * Exports ClinicalContextService — the billing module reuses it for the
 * admission-scope + open/closed guard.
 */
@Module({
  imports: [PrismaModule, AdmissionModule], // AdmissionWorkflowService = one admission-lookup path
  controllers: [
    VitalsController,
    RoundsController,
    MedicationsController,
    DietOrdersController,
  ],
  providers: [
    ClinicalContextService,
    VitalsService,
    VitalsRepository,
    RoundsService,
    RoundsRepository,
    MedicationsService,
    MedicationsRepository,
    DietOrdersService,
    DietOrdersRepository,
  ],
  exports: [ClinicalContextService],
})
export class ClinicalModule {}
