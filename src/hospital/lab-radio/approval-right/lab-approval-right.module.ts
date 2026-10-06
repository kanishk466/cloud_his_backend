import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { LabApprovalRightController } from './lab-approval-right.controller';
import { LabApprovalRightService } from './lab-approval-right.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LabApprovalRightController],
  providers: [LabApprovalRightService],
  exports: [LabApprovalRightService],
})
export class LabApprovalRightModule {}
