import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { SampleContainerController } from './sample-container.controller';
import { SampleContainerService } from './sample-container.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [SampleContainerController],
  providers: [SampleContainerService],
  exports: [SampleContainerService],
})
export class SampleContainerModule {}
