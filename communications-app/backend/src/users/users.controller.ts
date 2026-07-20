import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ApiOperation, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from '../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';
import { NotificationService } from '../communication/notifications/notification.service';
import {
  EventBusService,
  PLATFORM_EVENTS,
} from '../infrastructure/events/event-bus.service';

// ─── Change Password DTO ──────────────────────────────────────────────────────

class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128)
  newPassword!: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly eventBus: EventBusService,
  ) {}

  // ── List users ─────────────────────────────────────────────────────────────
  //
  // scope=global  (platform_admin) → platform_admin + company_owner across all companies
  // scope=company (tenant roles)   → company's own users
  //
  // Role/scope resolved from DB — JWT carries only sub/type (DEC-008 A3.10 pending).

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List users scoped to actor role (DEC-009)' })
  @ApiQuery({ name: 'page',      required: false, type: Number })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  @ApiQuery({ name: 'search',    required: false })
  @ApiQuery({ name: 'companyId', required: false, description: 'platform_admin: scope listing to a specific company (Global Users page)' })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ): Promise<{ items: UserResponseDto[]; total: number; page: number; limit: number }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);
    const parsedPage  = Math.max(1, parseInt(page, 10)  || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const params = { page: parsedPage, limit: parsedLimit, search };

    let result: { items: any[]; total: number; page: number; limit: number };

    if (actor.scope === 'global' && companyId?.trim()) {
      // platform_admin scoping to a specific company (Global Users page — DEC-014)
      result = await this.users.listByCompanyId(companyId.trim(), params);
    } else if (actor.scope === 'global') {
      result = await this.users.listPlatformUsers(params);
    } else {
      result = await this.users.listByCompanyId(String(actor.companyId), params);
    }

    return {
      items: result.items.map(UserResponseDto.from),
      total: result.total,
      page:  result.page,
      limit: result.limit,
    };
  }

  // ── Current user ──────────────────────────────────────────────────────────

  @Get('me')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() ctx: AuthContext): Promise<UserResponseDto> {
    const user = await this.users.findByIdOrThrow(ctx.userId!);
    return UserResponseDto.from(user);
  }

  @Patch('me')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updated = await this.users.update(ctx.userId!, dto);
    return UserResponseDto.from(updated);
  }

  @Patch('me/password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change current user password and clear mustChangePassword (DEC-014)' })
  async changePassword(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: ChangePasswordDto,
  ): Promise<UserResponseDto> {
    // Capture scope + mustChangePassword BEFORE the update so we know what state we're transitioning from.
    const before = await this.users.findByIdOrThrow(ctx.userId!);
    const wasMustChange = !!before.mustChangePassword;

    const updated = await this.users.changePassword(ctx.userId!, dto.currentPassword, dto.newPassword);

    // Notify UserInvitationsModule to accept pending invitations for this email.
    // Fire-and-forget via event bus — no circular dependency on UserInvitationsService (DEC-013).
    if (wasMustChange) {
      this.eventBus.emit(
        PLATFORM_EVENTS.USER_INVITATION_PASSWORD_COMPLETED,
        { email: before.email },
      );
    }

    // Notify the user that their password was changed — fire-and-forget.
    // The welcome message for invited users is handled by UserInvitationsService
    // via the USER_INVITATION_PASSWORD_COMPLETED event emitted above.
    const when = new Date().toISOString();
    if (before.scope === 'company' && before.companyId) {
      // Fetch display name before the fire-and-forget so the template receives data.companyName.
      const companyName = await this.users
        .getCompanyDisplayName(String(before.companyId))
        .catch(() => String(before.companyId));
      this.notificationService
        .notifyEvent({
          companyId: String(before.companyId),
          event:     'security.company_password_changed',
          email:     before.email,
          payload: {
            data: {
              firstName:   before.firstName,
              email:       before.email,
              companyName,
              when,
            },
          },
        })
        .catch((err) =>
          this.logger.warn(
            `password_changed notification failed for ${before.email}: ${err?.message}`,
          ),
        );
    } else if (before.scope !== 'company' && before.companyId) {
      // Platform admin — route through modules company credentials.
      this.notificationService
        .notifyEvent({
          companyId: String(before.companyId),
          event:     'security.platform_password_changed',
          email:     before.email,
          payload: {
            data: {
              firstName: before.firstName,
              email:     before.email,
              when,
            },
          },
        })
        .catch((err) =>
          this.logger.warn(
            `platform_password_changed notification failed for ${before.email}: ${err?.message}`,
          ),
        );
    }

    return UserResponseDto.from(updated);
  }

  // ── Delete user ───────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Permanently delete a user account (platform_admin or company_owner only)' })
  async deleteUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ deleted: boolean }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'company_owner') {
      throw new ForbiddenException('You do not have permission to delete users');
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    if (actor.role === 'company_owner') {
      if (target.role === 'platform_admin') {
        throw new ForbiddenException('You cannot delete modules administrators');
      }
      if (target.companyId !== actor.companyId) {
        throw new ForbiddenException('You can only delete users in your own company');
      }
    }

    // Guard: cannot remove the last active owner of a company.
    if (target.role === 'company_owner' && target.companyId) {
      const ownerCount = await this.users.countActiveOwners(String(target.companyId));
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot delete the last owner of a company');
      }
    }

    await this.users.deleteById(targetId);
    return { deleted: true };
  }

  // ── Deactivate user ───────────────────────────────────────────────────────

  @Patch(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deactivate a user account (platform_admin or company_owner only)' })
  async deactivateUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'company_owner') {
      throw new ForbiddenException('You do not have permission to deactivate users');
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    if (actor.role === 'company_owner') {
      if (target.role === 'platform_admin') {
        throw new ForbiddenException('You cannot deactivate modules administrators');
      }
      if (target.companyId !== actor.companyId) {
        throw new ForbiddenException('You can only deactivate users in your own company');
      }
    }

    if (target.isActive === false) {
      throw new ForbiddenException('User is already inactive');
    }

    const updated = await this.users.setUserActive(targetId, false);
    return UserResponseDto.from(updated);
  }

  // ── Reactivate user ───────────────────────────────────────────────────────

  @Patch(':id/reactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reactivate a deactivated user account (platform_admin or company_owner only)' })
  async reactivateUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'company_owner') {
      throw new ForbiddenException('You do not have permission to reactivate users');
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot reactivate your own account');
    }

    if (actor.role === 'company_owner') {
      if (target.role === 'platform_admin') {
        throw new ForbiddenException('You cannot reactivate modules administrators');
      }
      if (target.companyId !== actor.companyId) {
        throw new ForbiddenException('You can only reactivate users in your own company');
      }
    }

    if (target.isActive !== false) {
      throw new ForbiddenException('User is already active');
    }

    const updated = await this.users.setUserActive(targetId, true);
    return UserResponseDto.from(updated);
  }

  // ── Admin: send password reset email ─────────────────────────────────────

  @Post(':id/send-password-reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin-triggered password reset email for any user (company_admin+)' })
  async sendPasswordReset(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ message: string }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (!['platform_admin', 'company_owner', 'company_admin'].includes(actor.role)) {
      throw new ForbiddenException('You do not have permission to reset user passwords');
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('Use the profile settings to change your own password');
    }

    if (actor.scope === 'company' && String(target.companyId) !== String(actor.companyId)) {
      throw new ForbiddenException('You can only reset passwords for users in your company');
    }

    // Generate and persist reset token (1-hour TTL).
    const rawToken  = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.users.setPasswordResetToken(targetId, tokenHash, expiresAt);

    const resetUrl = this.buildFrontendUrl(`/auth/reset-password?token=${rawToken}`);

    // Route all admin-triggered resets through the Platform Company (same pattern as
    // AuthService.notifyCompanyForgotPassword / notifyPlatformForgotPassword).
    const platformCompanyId = await this.users.getPlatformCompanyId();
    if (platformCompanyId) {
      if (target.scope === 'company' && target.companyId) {
        const companyName = await this.users
          .getCompanyDisplayName(String(target.companyId))
          .catch(() => '');
        this.notificationService
          .notifyEvent({
            companyId: platformCompanyId,
            event:     'security.company_forgot_password',
            email:     target.email,
            payload: {
              data: {
                firstName:   target.firstName,
                email:       target.email,
                companyName,
                resetUrl,
                expiresAt:   expiresAt.toISOString(),
              },
            },
          })
          .catch((err) =>
            this.logger.warn(`send-password-reset notification failed for ${target.email}: ${err?.message}`),
          );
      } else {
        this.notificationService
          .notifyEvent({
            companyId: platformCompanyId,
            event:     'security.platform_forgot_password',
            email:     target.email,
            payload: {
              data: {
                firstName: target.firstName,
                email:     target.email,
                resetUrl,
                expiresAt: expiresAt.toISOString(),
              },
            },
          })
          .catch((err) =>
            this.logger.warn(`send-password-reset notification failed for ${target.email}: ${err?.message}`),
          );
      }
    } else {
      this.logger.warn(`send-password-reset: platform company not found, email skipped for ${target.email}`);
    }

    return { message: 'Password reset email sent.' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildFrontendUrl(path: string): string {
    const base = (
      this.config.get<string>('FRONTEND_BASE_URL') ||
      this.config.get<string>('APP_BASE_URL') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${base}${path}`;
  }

  private buildLoginUrl(): string {
    return this.buildFrontendUrl('/auth/login');
  }
}
