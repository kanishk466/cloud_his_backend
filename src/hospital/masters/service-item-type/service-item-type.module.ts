import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ServiceItemTypeController } from './service-item-type.controller';
import { ServiceItemTypeService } from './service-item-type.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ServiceItemTypeController],
  providers: [ServiceItemTypeService],
  exports: [ServiceItemTypeService],
})
export class ServiceItemTypeModule {}
