// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions?: string[];
  code?: string;        // Hospital code
  userType?: string;    // SUPER_ADMIN | REGULAR_USER
  sessionId?: string;
  [key: string]: any;   // Extra fields safety
}

/**
 * Extracts full user or specific user properties from request.user
 * 
 * Usage:
 *  1. Full Object:    @CurrentUser() user: CurrentUserPayload
 *  2. Specific Key:   @CurrentUser('userId') userId: string
 *  3. Specific Key:   @CurrentUser('tenantId') tenantId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);