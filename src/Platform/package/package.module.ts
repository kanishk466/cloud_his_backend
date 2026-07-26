import { Module } from '@nestjs/common';

import { PackageService } from './services/package.service';
import { PackageRepository } from './repositories/package.repository';

import { CatalogModule } from '../catalog/catalog.module';
import { AuditModule } from '../audit/audit.module';
import { PackageController } from './controllers/package.controller';

@Module({
  imports: [
    CatalogModule,
    AuditModule,
  ],

  controllers: [
    PackageController,
  ],

  providers: [
    PackageService,
    PackageRepository,
  ],

  exports: [
    PackageService,
    PackageRepository,
  ],
})
export class PackageModule {}