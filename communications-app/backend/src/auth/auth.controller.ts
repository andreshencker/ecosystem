import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { Public } from '../infrastructure/security/decorators/public.decorator';
import { CurrentUser } from '../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ── POST /auth/register ────────────────────────────────────────────────────
  @Public()
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user account' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // ── GET /auth/verify-email?token= ─────────────────────────────────────────
  @Public()
  @Get('verify-email')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify email address using the link sent by email',
  })
  verifyEmail(@Query() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  // ── POST /auth/login ───────────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
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

  // ── POST /auth/forgot-password ─────────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  // ── POST /auth/reset-password ──────────────────────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reset password using the token from the reset email',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
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
