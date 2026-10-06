import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ReferenceRangeController } from './reference-range.controller';
import { ReferenceRangeService } from './reference-range.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ReferenceRangeController],
  providers: [ReferenceRangeService],
  exports: [ReferenceRangeService],
})
export class ReferenceRangeModule {}
