import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { JwtRefreshPayload } from '../../common/types/api.types';

const refreshCookieExtractor = (req: Request): string | null => {
  return (req?.cookies as Record<string, string>)?.['refresh_token'] ?? null;
};

/** Payload returned from refresh strategy validation (merged with user data in auth.service) */
export interface RefreshValidatedPayload {
  sub: string;
  tokenVersion: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshCookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret'),
    });
  }

  validate(payload: JwtRefreshPayload): RefreshValidatedPayload {
    if (!payload.sub) throw new UnauthorizedException();
    return { sub: payload.sub, tokenVersion: payload.tokenVersion };
  }
}
