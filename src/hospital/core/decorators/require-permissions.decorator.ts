import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Declares the feature codes a route requires.
 *
 * Feature codes come from the `Feature.code` column and are granted to a
 * hospital role through `HospitalRolePermission`. Example:
 *
 *   @RequirePermissions('BASIC_MASTER_BANK_CREATE')
 *   @UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
 *
 * SUPER_ADMIN users bypass the check (full access to licensed modules).
 * A route with no `@RequirePermissions` is only protected by authentication.
 */
export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
