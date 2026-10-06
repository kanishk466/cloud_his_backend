import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';

function makeContext(user: any): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let permissionsService: { resolvePermissionCodes: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    permissionsService = { resolvePermissionCodes: jest.fn() };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );
  });

  it('allows when no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(
      true,
    );
    expect(permissionsService.resolvePermissionCodes).not.toHaveBeenCalled();
  });

  it('allows SUPER_ADMIN without a DB lookup', async () => {
    reflector.getAllAndOverride.mockReturnValue(['ANY_CODE']);
    const ctx = makeContext({
      userId: 'u1',
      tenantId: 't1',
      userType: 'SUPER_ADMIN',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(permissionsService.resolvePermissionCodes).not.toHaveBeenCalled();
  });

  it('allows a user holding all required codes', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'BASIC_MASTER_BANK_VIEW',
      'BASIC_MASTER_BANK_EDIT',
    ]);
    permissionsService.resolvePermissionCodes.mockResolvedValue(
      new Set(['BASIC_MASTER_BANK_VIEW', 'BASIC_MASTER_BANK_EDIT']),
    );
    const ctx = makeContext({ userId: 'u1', tenantId: 't1', userType: 'REGULAR_USER' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies when a required code is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['BASIC_MASTER_BANK_DELETE']);
    permissionsService.resolvePermissionCodes.mockResolvedValue(
      new Set(['BASIC_MASTER_BANK_VIEW']),
    );
    const ctx = makeContext({ userId: 'u1', tenantId: 't1', userType: 'REGULAR_USER' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies when there is no authenticated user', async () => {
    reflector.getAllAndOverride.mockReturnValue(['X']);
    const ctx = makeContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('scopes the permission lookup to the token tenant + user', async () => {
    reflector.getAllAndOverride.mockReturnValue(['X']);
    permissionsService.resolvePermissionCodes.mockResolvedValue(new Set(['X']));
    const ctx = makeContext({ userId: 'u9', tenantId: 't9', userType: 'DOCTOR' });
    await guard.canActivate(ctx);
    expect(permissionsService.resolvePermissionCodes).toHaveBeenCalledWith(
      't9',
      'u9',
    );
  });
});
