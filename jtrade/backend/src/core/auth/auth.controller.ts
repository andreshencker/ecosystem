// src/core/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';

import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerifyEmailDto } from './dto/resend-verify-email.dto';

import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ registered: boolean; email: string }> {
    return this.authService.register(dto);
  }

  @Post('refresh')
  async refreshTokens(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto): Promise<{ loggedOut: boolean }> {
    return this.authService.logout(dto);
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ ok: boolean }> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ changed: boolean }> {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<{ verified: boolean }> {
    return this.authService.verifyEmail(dto);
  }

  @Post('verify-email/resend')
  async resendVerifyEmail(
    @Body() dto: ResendVerifyEmailDto,
  ): Promise<{ ok: boolean }> {
    return this.authService.resendVerifyEmail(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request): Promise<UserResponseDto> {
    const userId = (req as any)?.user?.sub;
    return this.authService.me(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  async changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ changed: boolean }> {
    const userId = (req as any)?.user?.sub;
    return this.authService.changePassword(userId, dto);
  }

  /**
   * ✅ ADMIN crea usuarios (ADMIN/INVESTOR).
   * El service ya bloquea CLIENT.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('users')
  async createAdminAsAdmin(
    @Body() dto: CreateUserAdminDto,
  ): Promise<UserResponseDto> {
    return this.authService.createAdminAsAdmin(dto);
  }
}
