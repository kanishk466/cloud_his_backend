import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { PatientDocumentController } from './patient-document.controller';
import { PatientDocumentService } from './patient-document.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PatientDocumentController],
  providers: [PatientDocumentService],
  exports: [PatientDocumentService],
})
export class PatientDocumentModule {}
