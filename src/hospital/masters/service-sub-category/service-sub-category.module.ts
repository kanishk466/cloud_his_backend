import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { ServiceSubCategoryController } from './service-sub-category.controller';
import { ServiceSubCategoryService } from './service-sub-category.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ServiceSubCategoryController],
  providers: [ServiceSubCategoryService],
  exports: [ServiceSubCategoryService],
})
export class ServiceSubCategoryModule {}
