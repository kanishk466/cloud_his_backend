import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { SampleTypeController } from './sample-type.controller';
import { SampleTypeService } from './sample-type.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [SampleTypeController],
  providers: [SampleTypeService],
  exports: [SampleTypeService],
})
export class SampleTypeModule {}
