import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { SystemModule } from './system/system.module';
import { IdentityModule } from './Platform/identity/identity.module';
import { CatalogModule } from './Platform/catalog/catalog.module';
import { PackageModule } from './Platform/package/package.module';
import { TenantModule } from './Platform/tenant/tenant.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SharedModule,

    SystemModule,
    IdentityModule,
    CatalogModule,
PackageModule,
    TenantModule,
  ],
})
export class AppModule {}