import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ClinicalDepartmentController } from './clinical-department.controller';
import { ClinicalDepartmentService } from './clinical-department.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ClinicalDepartmentController],
  providers: [ClinicalDepartmentService],
  exports: [ClinicalDepartmentService],
})
export class ClinicalDepartmentModule {}
