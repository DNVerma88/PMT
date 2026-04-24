import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { JwtPayload } from '../../common/types/api.types';
import type { RequestUser } from '../../common/types/request-user.type';

const cookieExtractor = (req: Request): string | null => {
  return (req?.cookies as Record<string, string>)?.['access_token'] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub) throw new UnauthorizedException();

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      firstName: payload.firstName ?? '',
      lastName: payload.lastName ?? '',
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
