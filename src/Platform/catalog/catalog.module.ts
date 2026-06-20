import { Module } from '@nestjs/common';

import { ModuleRepository } from './repositories/module.repository';
import { FeatureRepository } from './repositories/feature.repository';
import { CatalogService } from './services/catalog.service';
import { CatalogController } from './controllers/catalog.controller';

@Module({
  controllers: [
    CatalogController
  ],  
  providers: [
    CatalogService,
    ModuleRepository,
    FeatureRepository,

  ],
  exports: [
    CatalogService,
    ModuleRepository,
    FeatureRepository,
  ],
})
export class CatalogModule {}