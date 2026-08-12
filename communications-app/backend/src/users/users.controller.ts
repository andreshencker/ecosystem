import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from '../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
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

  // ── Delete user ───────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Permanently delete a user account (platform_admin or company_owner only)',
  })
  async deleteUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ deleted: boolean }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'company_owner') {
      throw new ForbiddenException(
        'You do not have permission to delete users',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    if (actor.role === 'company_owner') {
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
    if (target.role === 'company_owner' && target.companyId) {
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
    summary: 'Deactivate a user account (platform_admin or company_owner only)',
  })
  async deactivateUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'company_owner') {
      throw new ForbiddenException(
        'You do not have permission to deactivate users',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    if (actor.role === 'company_owner') {
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
      'Reactivate a deactivated user account (platform_admin or company_owner only)',
  })
  async reactivateUser(
    @Param('id') targetId: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<UserResponseDto> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (actor.role !== 'platform_admin' && actor.role !== 'company_owner') {
      throw new ForbiddenException(
        'You do not have permission to reactivate users',
      );
    }

    const target = await this.users.findByIdOrThrow(targetId);

    if (String((target as any)._id) === ctx.userId) {
      throw new ForbiddenException('You cannot reactivate your own account');
    }

    if (actor.role === 'company_owner') {
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

}
