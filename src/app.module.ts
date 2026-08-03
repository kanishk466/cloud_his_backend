import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { SystemModule } from './system/system.module';
import { IdentityModule } from './Platform/identity/identity.module';
import { CatalogModule } from './Platform/catalog/catalog.module';
import { PackageModule } from './Platform/package/package.module';
import { TenantModule } from './Platform/tenant/tenant.module';
import { AuditModule } from './Platform/audit/audit.module';
import { PlatformUsersModule } from './Platform/platform-users/platform-users.module';
import { DashboardModule } from './Platform/dashboard/dashboard.module';
import { SearchModule } from './Platform/search/search.module';
import { HospitalModule } from './hospital/hospital.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    SharedModule,
    SystemModule,
    IdentityModule,
    CatalogModule,
    PackageModule,
    TenantModule,
    AuditModule,
    PlatformUsersModule,
    DashboardModule,
    SearchModule,
    HospitalModule,
  ],
})
export class AppModule { }