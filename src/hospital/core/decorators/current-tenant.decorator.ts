import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extracts tenantId from JWT payload
// Usage: @CurrentTenant() tenantId: string
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);