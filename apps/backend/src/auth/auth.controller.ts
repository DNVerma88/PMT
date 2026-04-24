import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthUserDto, CsrfTokenDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user.type';
import type { RefreshValidatedPayload } from './strategies/jwt-refresh.strategy';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('csrf')
  @Version('1')
  @ApiOperation({ summary: 'Get a CSRF token (call on app init before any mutating request)' })
  getCsrf(@Res({ passthrough: true }) res: Response): CsrfTokenDto {
    const csrfToken = this.authService.issueCsrfToken(res);
    return { csrfToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Version('1')
  // Stricter rate limit for auth endpoint: 10 requests / 60 seconds
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Authenticate and receive session cookies' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    return this.authService.login(dto.email, dto.password, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Version('1')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Invalidate session cookies and revoke refresh token' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    // Clear-Site-Data instructs the browser to wipe cookies, storage and cache on logout
    res.setHeader('Clear-Site-Data', '"cookies", "storage"');
    await this.authService.logout(user.id, res);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Version('1')
  @ApiOperation({ summary: 'Exchange refresh token for a new access token' })
  async refresh(
    @CurrentUser() payload: RefreshValidatedPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    return this.authService.refresh(payload.sub, payload.tokenVersion, res);
  }

  @Get('me')
  @Version('1')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  async getMe(@CurrentUser() user: RequestUser): Promise<AuthUserDto> {
    return this.authService.getMe(user.id);
  }
}
