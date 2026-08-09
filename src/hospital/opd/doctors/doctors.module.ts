import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { DoctorsRepository } from './doctors.repository';

@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorsRepository],
  exports: [DoctorsService],
})
export class DoctorsModule {}