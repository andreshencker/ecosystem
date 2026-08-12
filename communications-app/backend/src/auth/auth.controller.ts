import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { Public } from '../infrastructure/security/decorators/public.decorator';
import { CurrentUser } from '../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';

import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('grapifly')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a Grapifly ID SSO code for a Relay session' })
  grapifly(@Body() dto: { code: string }) {
    return this.auth.loginWithGrapifly(dto.code);
  }

  // ── POST /auth/refresh ─────────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshTokens(dto.refreshToken);
  }

  // ── POST /auth/logout ──────────────────────────────────────────────────────
  // Public so users can logout even with an expired access token —
  // the refresh token itself is the credential for this operation.
  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the provided refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  // ── GET /auth/me ───────────────────────────────────────────────────────────
  // Convenience: quick identity check using the access token.
  @Get('me')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Return the auth context of the current access token',
  })
  me(@CurrentUser() ctx: AuthContext) {
    return { actorType: ctx.actorType, userId: ctx.userId };
  }
}
