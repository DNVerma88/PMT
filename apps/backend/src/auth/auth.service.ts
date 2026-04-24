import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload, JwtRefreshPayload } from '../common/types/api.types';
import type { RequestUser } from '../common/types/request-user.type';
import type { AuthUserDto } from './dto/auth-response.dto';

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const PERMISSIONS_CACHE_TTL_MS = 60_000; // 1 minute

interface PermissionsCacheEntry {
  roles: string[];
  permissions: string[];
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly permissionsCache = new Map<string, PermissionsCacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string, res: Response): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      // Constant-time comparison even on not-found to prevent timing attacks
      await bcrypt.compare('dummy', '$2a$12$dummyhashforc0nsistenttiming');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
        ),
      ),
    ];

    // Issue tokens
    const accessToken = this.signAccessToken(user, roles, permissions);
    const refreshToken = this.signRefreshToken(user.id, user.tokenVersion);
    const csrfToken = uuidv4();

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.setCookies(res, accessToken, refreshToken, csrfToken);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(userId: string, res: Response): Promise<void> {
    // Increment tokenVersion to invalidate all existing refresh tokens for this user
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    this.clearCookies(res);
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  async refresh(
    sub: string,
    tokenVersion: number,
    res: Response,
  ): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      this.clearCookies(res);
      throw new UnauthorizedException('Session expired');
    }

    if (user.tokenVersion !== tokenVersion) {
      this.clearCookies(res);
      throw new ForbiddenException('Token has been revoked');
    }

    const { roles, permissions } = await this.getPermissionsWithCache(user.id);

    const accessToken = this.signAccessToken(user, roles, permissions);
    const newRefreshToken = this.signRefreshToken(user.id, user.tokenVersion);
    const csrfToken = uuidv4();

    this.setCookies(res, accessToken, newRefreshToken, csrfToken);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  // ── Get current user ───────────────────────────────────────────────────────

  async getMe(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const { roles, permissions } = await this.getPermissionsWithCache(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  // ── CSRF token ─────────────────────────────────────────────────────────────

  issueCsrfToken(res: Response): string {
    const csrfToken = uuidv4();
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,             // Must be readable by JavaScript
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return csrfToken;
  }

  // ── Permissions cache ───────────────────────────────────────────────────────

  /** Invalidate cache entry for a user (e.g. after role change). */
  invalidatePermissionsCache(userId: string): void {
    this.permissionsCache.delete(userId);
  }

  /**
   * Fetch roles + permissions for a user, backed by a 60-second in-process cache.
   * This avoids N role/permission DB queries per request on high-traffic endpoints.
   */
  private async getPermissionsWithCache(
    userId: string,
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const cached = this.permissionsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return { roles: cached.roles, permissions: cached.permissions };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) return { roles: [], permissions: [] };

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map(
            (rp) => `${rp.permission.resource}:${rp.permission.action}`,
          ),
        ),
      ),
    ];

    this.permissionsCache.set(userId, {
      roles,
      permissions,
      expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS,
    });

    return { roles, permissions };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private signAccessToken(
    user: { id: string; email: string; username: string; firstName: string; lastName: string },
    roles: string[],
    permissions: string[],
  ): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };

    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiresIn'),
    });
  }

  private signRefreshToken(userId: string, tokenVersion: number): string {
    const payload: JwtRefreshPayload = { sub: userId, tokenVersion };

    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
    });
  }

  private setCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    csrfToken: string,
  ): void {
    const accessMaxAge = 15 * 60 * 1000;        // 15 min
    const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie('access_token', accessToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: accessMaxAge,
    });

    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: refreshMaxAge,
      path: '/api/v1/auth/refresh', // Restrict refresh token to refresh endpoint only
    });

    res.cookie('csrf_token', csrfToken, {
      httpOnly: false, // Readable by JS
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: refreshMaxAge,
      path: '/',
    });
  }

  private clearCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    res.clearCookie('csrf_token', { path: '/' });
  }
}
