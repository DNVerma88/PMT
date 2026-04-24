import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../types/request-user.type';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditAction = this.reflector.getAllAndOverride<AuditAction>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!auditAction) return next.handle();

    const request = context.switchToHttp().getRequest<
      Request & { user?: RequestUser }
    >();

    return next.handle().pipe(
      tap((responseData: unknown) => {
        const resourceId = this.extractResourceId(request, responseData);
        const resource = this.extractResource(request);

        this.prisma.auditLog
          .create({
            data: {
              userId: request.user?.id ?? null,
              actorEmail: request.user?.email ?? null,
              action: auditAction,
              resource,
              resourceId,
              ipAddress: request.ip ?? null,
              userAgent: request.headers['user-agent'] ?? null,
              correlationId: request.headers['x-correlation-id'] as string ?? null,
            },
          })
          .catch((err: Error) => {
            this.logger.error({ err }, 'Failed to write audit log');
          });
      }),
    );
  }

  private extractResource(request: Request): string {
    // Derive resource from URL, e.g. /api/v1/release-plans → release_plans
    const segments = request.path.replace(/^\/api\/v\d+\//, '').split('/');
    return segments[0].replace(/-/g, '_');
  }

  private extractResourceId(request: Request, responseData: unknown): string {
    // Prefer ID from response, fall back to route params
    if (
      responseData &&
      typeof responseData === 'object' &&
      'id' in (responseData as Record<string, unknown>)
    ) {
      return String((responseData as Record<string, string>).id);
    }
    return (request.params['id'] as string) ?? 'unknown';
  }
}
