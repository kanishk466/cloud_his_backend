import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { LabDepartmentController } from './lab-department.controller';
import { LabDepartmentService } from './lab-department.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LabDepartmentController],
  providers: [LabDepartmentService],
  exports: [LabDepartmentService],
})
export class LabDepartmentModule {}
