import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

import { ServiceCategoriesController } from './controllers/service-categories.controller';
import { ServiceSubCategoriesController } from './controllers/service-sub-categories.controller';
import { ServiceItemsController } from './controllers/service-items.controller';

import { ServiceCategoriesService } from './services/service-categories.service';
import { ServiceSubCategoriesService } from './services/service-sub-categories.service';
import { ServiceItemsService } from './services/service-items.service';

import { ServiceCategoriesRepository } from './repositories/service-categories.repository';
import { ServiceSubCategoriesRepository } from './repositories/service-sub-categories.repository';
import { ServiceItemsRepository } from './repositories/service-items.repository';
import { BulkImportService } from './services/bulk-import.service';
import { StoreLinkageService } from './services/store-linkage.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ServiceCategoriesController,
    ServiceSubCategoriesController,
    ServiceItemsController,
  ],
  providers: [
    ServiceCategoriesService,
    ServiceCategoriesRepository,
    ServiceSubCategoriesService,
    ServiceSubCategoriesRepository,
    ServiceItemsService,
    ServiceItemsRepository,
    BulkImportService,
    StoreLinkageService,
  ],
  exports: [
    ServiceCategoriesService,
    ServiceSubCategoriesService,
    ServiceItemsService,
    BulkImportService,
    StoreLinkageService,
  ],
})
export class ServicesSetupModule {}
