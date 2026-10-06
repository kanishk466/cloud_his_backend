import { Module } from '@nestjs/common';
import { ServiceMasterController } from './service-master.controller';
import { ServiceMasterService } from './service-master.service';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ServiceMasterController],
  providers: [ServiceMasterService],
  exports: [ServiceMasterService],
})
export class ServiceMasterModule {}
