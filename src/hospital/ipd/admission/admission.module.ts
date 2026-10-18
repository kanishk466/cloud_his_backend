import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { WardRoomModule } from '../../masters/ward-room/ward-room.module';
import { ThresholdModule } from '../../masters/threshold/threshold.module';
import { AdmissionController } from './admission.controller';
import { AdmissionService } from './admission.service';
import { AdmissionWorkflowService } from './admission-workflow.service';
import { AdmissionRepository } from './admission.repository';

@Module({
  imports: [
    PrismaModule,
    WardRoomModule, // BedStatusService (state machine)
    ThresholdModule, // ThresholdCheckService (panel rate caps)
  ],
  controllers: [AdmissionController],
  providers: [AdmissionService, AdmissionWorkflowService, AdmissionRepository],
  exports: [AdmissionService, AdmissionWorkflowService],
})
export class AdmissionModule {}
