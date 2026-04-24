import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import bcrypt from 'bcryptjs';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: '$2a$12$stub',
  status: 'ACTIVE',
  tokenVersion: 1,
  deletedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  userRoles: [
    {
      role: {
        name: 'USER',
        rolePermissions: [
          { permission: { resource: 'projects', action: 'read' } },
        ],
      },
    },
  ],
};

const prismaServiceMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const jwtServiceMock = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

const configServiceMock = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, string | number> = {
      'jwt.secret': 'test-secret',
      'jwt.expiresIn': '15m',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiresIn': '7d',
      'nodeEnv': 'test',
    };
    return cfg[key];
  }),
};

const resMock = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should throw UnauthorizedException for unknown email', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.login('unknown@example.com', 'password', resMock as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValueOnce(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
      await expect(
        service.login('test@example.com', 'wrongpass', resMock as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should set cookies and return user on valid credentials', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValueOnce(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
      prismaServiceMock.user.update.mockResolvedValueOnce(mockUser);

      const result = await service.login('test@example.com', 'correct', resMock as any);

      expect(resMock.cookie).toHaveBeenCalledTimes(3); // access_token, refresh_token, csrf_token
      expect(result.email).toBe('test@example.com');
      expect(result.roles).toContain('USER');
    });

    it('should throw for inactive user', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        status: 'INACTIVE',
      });
      await expect(
        service.login('test@example.com', 'password', resMock as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for soft-deleted user', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        deletedAt: new Date(),
      });
      await expect(
        service.login('test@example.com', 'password', resMock as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('issueCsrfToken', () => {
    it('should set csrf_token cookie and return the token string', () => {
      const token = service.issueCsrfToken(resMock as any);
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(36); // UUID v4
      expect(resMock.cookie).toHaveBeenCalledWith(
        'csrf_token',
        token,
        expect.objectContaining({ httpOnly: false }),
      );
    });
  });

  describe('logout', () => {
    it('should increment tokenVersion and clear cookies', async () => {
      prismaServiceMock.user.update.mockResolvedValueOnce(mockUser);
      await service.logout('user-uuid-1', resMock as any);
      expect(prismaServiceMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tokenVersion: { increment: 1 } },
        }),
      );
      expect(resMock.clearCookie).toHaveBeenCalledTimes(3);
    });
  });
});
