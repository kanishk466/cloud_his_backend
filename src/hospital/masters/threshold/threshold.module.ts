import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { ThresholdController } from './threshold.controller';
import { ThresholdService } from './threshold.service';
import { ThresholdCheckService } from './threshold-check.service';
import { ThresholdRepository } from './threshold.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ThresholdController],
  providers: [ThresholdService, ThresholdCheckService, ThresholdRepository],
  exports: [ThresholdService, ThresholdCheckService], // Check → IPD billing
})
export class ThresholdModule {}
