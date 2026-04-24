import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF protection.
 *
 * Flow:
 *  1. Frontend calls GET /api/v1/auth/csrf → server sets `csrf_token` cookie
 *     (non-httpOnly, SameSite=Strict) and returns the token in JSON.
 *  2. Frontend reads token from response and stores in memory.
 *  3. Axios interceptor attaches `X-CSRF-Token` header on every mutating request.
 *  4. This middleware validates header === cookie on every mutating request.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Safe methods are exempt
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
    const csrfCookie = (req.cookies as Record<string, string>)?.['csrf_token'];

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    next();
  }
}
