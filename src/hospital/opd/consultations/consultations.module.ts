import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { ConsultationsRepository } from './consultations.repository';

@Module({
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsRepository],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}