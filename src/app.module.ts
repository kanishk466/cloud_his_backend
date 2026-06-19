import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { SystemModule } from './system/system.module';
import { IdentityModule } from './Platform/identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SharedModule,

    SystemModule,
    IdentityModule
  ],
})
export class AppModule {}