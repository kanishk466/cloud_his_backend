import { Module } from '@nestjs/common';
import { VitalsController } from './vitals.controller';
import { VitalsService } from './vitals.service';
import { VitalsRepository } from './vitals.repository';

@Module({
  controllers: [VitalsController],
  providers: [VitalsService, VitalsRepository],
  exports: [VitalsService], // Used in Consultation module (Step 5)
})
export class VitalsModule {}