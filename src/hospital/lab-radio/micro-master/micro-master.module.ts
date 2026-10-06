import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { MicroMasterController } from './micro-master.controller';
import { MicroMasterService } from './micro-master.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [MicroMasterController],
  providers: [MicroMasterService],
  exports: [MicroMasterService],
})
export class MicroMasterModule {}
