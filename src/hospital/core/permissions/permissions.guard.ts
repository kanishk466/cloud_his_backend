import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionsService } from './permissions.service';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * Enforces `@RequirePermissions(...)` on hospital routes.
 *
 * Must run AFTER `HospitalJwtAuthGuard` so `request.user` is populated.
 * SUPER_ADMIN users bypass feature checks (they hold full access to the
 * hospital's licensed modules, consistent with EntitlementRepository).
 *
 * Tenant isolation: the permission lookup is scoped to request.user.tenantId
 * AND request.user.userId, so a token from hospital A can never resolve
 * permissions from hospital B.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission metadata → authentication alone is sufficient.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user?.userId) {
      throw new ForbiddenException('Authentication required');
    }

    // SUPER_ADMIN bypasses granular feature checks.
    if (user.userType === 'SUPER_ADMIN') return true;

    const granted = await this.permissionsService.resolvePermissionCodes(
      user.tenantId,
      user.userId,
    );

    const missing = required.filter((code) => !granted.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing permission(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
