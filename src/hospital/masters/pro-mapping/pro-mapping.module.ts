import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ProMappingController } from './pro-mapping.controller';
import { ProMappingService } from './pro-mapping.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ProMappingController],
  providers: [ProMappingService],
  exports: [ProMappingService],
})
export class ProMappingModule {}
