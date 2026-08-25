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
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import {
  EventBusService,
  PLATFORM_EVENTS,
} from '../../infrastructure/events/event-bus.service';
import { RelayClientService } from '../../integrations/relay/client/relay-client.service';

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
    private readonly eventBus: EventBusService,
    private readonly commClient: RelayClientService,
  ) {}

  // ── List users ─────────────────────────────────────────────────────────────
  //
  // scope=global  (platform_admin) → platform_admin + business_owner across all companies
  // scope=company (tenant roles)   → company's own users
  //
  // Role/scope resolved from DB — JWT carries only sub/type (DEC-008 A3.10 pending).

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List users scoped to actor role (DEC-009)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description:
      'platform_admin: scope listing to a specific company (Global Users page)',
  })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const params = { page: parsedPage, limit: parsedLimit, search };

    let result: { items: any[]; total: number; page: number; limit: number };

    if (actor.scope === 'global' && companyId?.trim()) {
      // platform_admin scoping to a specific company (Global Users page — DEC-014)
      result = await this.users.listByCompanyId(companyId.trim(), params);
    } else if (actor.scope === 'global') {
      result = await this.users.listPlatformUsers(params);
    } else {
      result = await this.users.listByCompanyId(
        String(actor.companyId),
        params,
      );
    }

    return {
      items: result.items.map(UserResponseDto.from),
      total: result.total,
      page: result.page,
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
  @ApiOperation({
    summary:
      'Change current user password and clear mustChangePassword (DEC-014)',
  })
  async changePassword(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: ChangePasswordDto,
  ): Promise<UserResponseDto> {
    // Capture scope + mustChangePassword BEFORE the update so we know what state we're transitioning from.
    const before = await this.users.findByIdOrThrow(ctx.userId!);
    const wasMustChange = !!before.mustChangePassword;

    const updated = await this.users.changePassword(
      ctx.userId!,
      dto.currentPassword,
      dto.newPassword,
    );

    // Notify UserInvitationsModule to accept pending invitations for this email.
    // Fire-and-forget via event bus — no circular dependency on UserInvitationsService (DEC-013).
    if (wasMustChange) {
      this.eventBus.emit(PLATFORM_EVENTS.USER_INVITATION_PASSWORD_COMPLETED, {
        email: before.email,
      });
      // welcome_message is sent by UserInvitationsService.handlePasswordCompleted() — not here.
    } else {
      // Voluntary password change from profile settings — send security confirmation.
      const businessName = before.companyId
        ? await this.users
            .getCompanyDisplayName(String(before.companyId))
            .catch(() => '')
        : '';
      this.commClient
        .notifyEvent({
          type: 'platform',
          event: 'security.company_password_changed',
          email: before.email,
          data: {
            firstName: before.firstName,
            email: before.email,
            businessName,
            when: new Date().toISOString(),
          },
        })
        .then((delivered) =>
          this.logger.log(
            `[changePassword] security.company_password_changed delivered=${delivered} userId=${String(before._id ?? '')}`,
          ),
        )
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `[changePassword] notification threw unexpectedly: ${msg}`,
          );
        });
    }

    return UserResponseDto.from(updated);
  }

  // ── Delete user ───────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Permanently delete a user account (platform_admin or business_owner only)',
  })
  async deleteUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ deleted: boolean }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
      throw new ForbiddenException(
        'You do not have permission to delete users',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    if (actor.role === 'business_owner') {
      if (target.role === 'platform_admin') {
        throw new ForbiddenException(
          'You cannot delete modules administrators',
        );
      }
      if (target.companyId !== actor.companyId) {
        throw new ForbiddenException(
          'You can only delete users in your own company',
        );
      }
    }

    // Guard: cannot remove the last active owner of a company.
    if (target.role === 'business_owner' && target.companyId) {
      const ownerCount = await this.users.countActiveOwners(
        String(target.companyId),
      );
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last owner of a company',
        );
      }
    }

    await this.users.deleteById(targetId);
    return { deleted: true };
  }

  // ── Deactivate user ───────────────────────────────────────────────────────

  @Patch(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Deactivate a user account (platform_admin or business_owner only)',
  })
  async deactivateUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
      throw new ForbiddenException(
        'You do not have permission to deactivate users',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    if (actor.role === 'business_owner') {
      if (target.role === 'platform_admin') {
        throw new ForbiddenException(
          'You cannot deactivate modules administrators',
        );
      }
      if (target.companyId !== actor.companyId) {
        throw new ForbiddenException(
          'You can only deactivate users in your own company',
        );
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
  @ApiOperation({
    summary:
      'Reactivate a deactivated user account (platform_admin or business_owner only)',
  })
  async reactivateUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
      throw new ForbiddenException(
        'You do not have permission to reactivate users',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot reactivate your own account');
    }

    if (actor.role === 'business_owner') {
      if (target.role === 'platform_admin') {
        throw new ForbiddenException(
          'You cannot reactivate modules administrators',
        );
      }
      if (target.companyId !== actor.companyId) {
        throw new ForbiddenException(
          'You can only reactivate users in your own company',
        );
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
  @ApiOperation({
    summary:
      'Admin-triggered password reset email for any user (business_admin+)',
  })
  async sendPasswordReset(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ message: string }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (
      !['platform_admin', 'business_owner', 'business_admin'].includes(
        actor.role,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to reset user passwords',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException(
        'Use the profile settings to change your own password',
      );
    }

    if (
      actor.scope === 'company' &&
      String(target.companyId) !== String(actor.companyId)
    ) {
      throw new ForbiddenException(
        'You can only reset passwords for users in your company',
      );
    }

    // Generate and persist reset token (1-hour TTL).
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.users.setPasswordResetToken(targetId, tokenHash, expiresAt);

    const resetUrl = this.buildFrontendUrl(
      `/auth/reset-password?token=${rawToken}`,
    );

    const businessName = target.companyId
      ? await this.users
          .getCompanyDisplayName(String(target.companyId))
          .catch(() => '')
      : '';

    // Fire-and-forget — never blocks the admin action.
    // Uses Platform base Business credentials (type='platform').
    this.commClient
      .notifyEvent({
        type: 'platform',
        event: 'security.company_forgot_password',
        email: target.email,
        data: {
          firstName: target.firstName,
          email: target.email,
          businessName,
          resetUrl,
          expiresAt: expiresAt.toISOString(),
        },
      })
      .then((delivered) =>
        this.logger.log(
          `[sendPasswordReset] security.company_forgot_password delivered=${delivered} targetId=${targetId}`,
        ),
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[sendPasswordReset] notification threw unexpectedly: ${msg}`,
        );
      });

    return { message: 'Password reset email sent.' };
  }

  // ── Get / update specific user ────────────────────────────────────────────

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a specific user by ID (business_admin+)' })
  async getUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (
      !['platform_admin', 'business_owner', 'business_admin'].includes(
        actor.role,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this user',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (
      actor.scope === 'company' &&
      String(target.companyId) !== String(actor.companyId)
    ) {
      throw new ForbiddenException(
        'You can only view users in your own company',
      );
    }

    return UserResponseDto.from(target);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update a specific user by ID (business_owner+ only)',
  })
  async updateUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
      throw new ForbiddenException(
        'You do not have permission to update this user',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (
      actor.scope === 'company' &&
      String(target.companyId) !== String(actor.companyId)
    ) {
      throw new ForbiddenException(
        'You can only update users in your own company',
      );
    }

    if (target.role === 'platform_admin' && actor.role !== 'platform_admin') {
      throw new ForbiddenException('You cannot modify modules administrators');
    }

    const updated = await this.users.update(targetId, dto);
    return UserResponseDto.from(updated);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildFrontendUrl(path: string): string {
    const base = (
      this.config.get<string>('FRONTEND_BASE_URL') ||
      this.config.get<string>('APP_BASE_URL') ||
      'http://localhost:3005'
    ).replace(/\/$/, '');
    return `${base}${path}`;
  }

  private buildLoginUrl(): string {
    return this.buildFrontendUrl('/auth/login');
  }
}
