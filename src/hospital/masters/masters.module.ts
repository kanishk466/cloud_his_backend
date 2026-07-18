import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

import { DepartmentsController } from './controllers/departments.controller';
import { ShiftsController } from './controllers/shifts.controller';

import { DepartmentsService } from './services/departments.service';
import { ShiftsService } from './services/shifts.service';

import { DepartmentsRepository } from './repositories/departments.repository';
import { ShiftsRepository } from './repositories/shifts.repository';

@Module({
  controllers: [DepartmentsController, ShiftsController],
  providers: [
    PrismaService,
    DepartmentsService,
    ShiftsService,
    DepartmentsRepository,
    ShiftsRepository,
  ],
  exports: [DepartmentsService, ShiftsService],
})
export class MastersModule {}