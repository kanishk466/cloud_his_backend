import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { InterpretationController } from './interpretation.controller';
import { InterpretationService } from './interpretation.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [InterpretationController],
  providers: [InterpretationService],
  exports: [InterpretationService],
})
export class InterpretationModule {}
