import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

/**
 * Provides permission resolution + guard to every hospital module.
 * Global so feature modules can use `@UseGuards(PermissionsGuard)`
 * without importing boilerplate everywhere.
 */
@Global()
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
