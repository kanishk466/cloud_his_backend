import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    userId?: string;
    email?: string;
    tenantId?: string;
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    if (!request.user) {
      return next.handle();
    }

    const route = request.route?.path ?? request.path;
    const user = request.user;
    const audit = (statusCode: number, outcome: string) => {
      void this.auditService.log({
        action: `HTTP_${request.method}_${outcome}`,
        actorId: user.userId ?? user.sub ?? 'unknown',
        actorEmail: user.email ?? 'unknown',
        tenantId: user.tenantId,
        targetType: 'HTTP_ENDPOINT',
        targetName: route,
        detail: `${request.method} ${route} returned ${statusCode}`,
        metadata: {
          statusCode,
          ...(request.ip ? { ipAddress: request.ip } : {}),
          ...(request.get('user-agent')
            ? { userAgent: request.get('user-agent') }
            : {}),
        },
      });
    };

    return next.handle().pipe(
      tap({
        next: () => audit(response.statusCode, 'SUCCEEDED'),
        error: (error: { status?: number }) =>
          audit(error.status ?? 500, 'FAILED'),
      }),
    );
  }
}
