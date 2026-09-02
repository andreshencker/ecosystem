import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthIdentity, type AuthResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthContext } from './types/auth-context';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('grapifly')
  grapifly(@Body() body: { code: string }): Promise<AuthResponse> { return this.authService.loginWithGrapifly(body.code); }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }): Promise<AuthResponse> { return this.authService.refresh(body.refreshToken); }

  @Post('logout')
  logout(): { loggedOut: true } { return { loggedOut: true }; }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request): AuthIdentity {
    return this.authService.me((request as Request & { user: AuthContext }).user);
  }
}
