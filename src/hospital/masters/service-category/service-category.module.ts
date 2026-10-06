import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ServiceCategoryController } from './service-category.controller';
import { ServiceCategoryService } from './service-category.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ServiceCategoryController],
  providers: [ServiceCategoryService],
  exports: [ServiceCategoryService],
})
export class ServiceCategoryModule {}
