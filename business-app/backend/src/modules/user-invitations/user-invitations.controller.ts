// src/modules/user-invitations/user-invitations.controller.ts

import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UserInvitationsService } from './user-invitations.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import type { UserRole } from '../users/schemas/user.schema';

import { InviteUserDto } from './dto/invite-user.dto';
import { InvitationMapper } from './mappers/invitation.mapper';

const INVITE_HIERARCHY: Partial<Record<UserRole, UserRole[]>> = {
  platform_admin: ['platform_admin', 'business_admin'],
  business_owner: ['business_admin', 'accountant', 'staff', 'viewer'],
  business_admin: ['accountant', 'staff', 'viewer'],
};

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserInvitationsController {
  constructor(
    private readonly userInvitations: UserInvitationsService,
    private readonly users: UsersService,
  ) {}

  @Post('invite')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a user account and send invitation email',
  })
  async invite(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: InviteUserDto,
  ): Promise<{
    userId: string;
    invitationId: string;
    email: string;
    role: string;
    emailDelivered: boolean;
    message: string;
  }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    const actorRole = actor.role;
    const targetRole = dto.role as UserRole;

    const allowedRoles = INVITE_HIERARCHY[actorRole] ?? [];

    if (!allowedRoles.includes(targetRole)) {
      throw new ForbiddenException(
        `${actorRole} is not permitted to invite ${targetRole}`,
      );
    }

    const { companyId, businessKey } = this.resolveTargetCompany({
      actorScope: actor.scope ?? 'company',
      actorCompanyId: actor.companyId,
      actorBusinessKey: actor.businessKey,
      targetRole,
      targetCompanyId: dto.targetCompanyId,
      targetBusinessKey: dto.targetBusinessKey,
    });

    const result = await this.userInvitations.sendInvitation({
      actorRole,
      invitedByUserId: ctx.userId!,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      targetRole,
      companyId,
      businessKey,
    });

    return {
      userId: result.userId,
      invitationId: result.invitationId,
      email: dto.email,
      role: dto.role,
      emailDelivered: result.emailDelivered,
      message: result.message,
    };
  }

  @Get('invitations')
  @HttpCode(200)
  @ApiOperation({ summary: 'List invitations visible to the current actor' })
  async getInvitations(
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ items: ReturnType<typeof InvitationMapper.toResponse>[] }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    const docs = await this.userInvitations.listInvitations(
      actor.scope ?? 'company',
      actor.companyId,
    );

    return {
      items: docs.map((doc) => InvitationMapper.toResponse(doc)),
    };
  }

  @Post('invitations/:id/resend')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Regenerate temp password and resend invitation email',
  })
  async resendInvitation(
    @Param('id') id: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ message: string; emailDelivered: boolean }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    const result = await this.userInvitations.resendInvitation(id, {
      scope: actor.scope ?? 'company',
      companyId: actor.companyId,
    });

    return {
      message: result.message,
      emailDelivered: result.emailDelivered,
    };
  }

  @Patch('invitations/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  async cancelInvitation(
    @Param('id') id: string,
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ cancelled: boolean }> {
    const actor = await this.users.findByIdOrThrow(ctx.userId!);

    if (
      actor.role !== 'platform_admin' &&
      actor.role !== 'business_owner' &&
      actor.role !== 'business_admin'
    ) {
      throw new ForbiddenException(
        'You do not have permission to cancel invitations',
      );
    }

    await this.userInvitations.cancelInvitation(id, {
      scope: actor.scope ?? 'company',
      companyId: actor.companyId,
    });

    return { cancelled: true };
  }

  private resolveTargetCompany(params: {
    actorScope: string;
    actorCompanyId: string | null;
    actorBusinessKey: string | null;
    targetRole: UserRole;
    targetCompanyId?: string;
    targetBusinessKey?: string;
  }): { companyId: string | null; businessKey: string | null } {
    if (params.actorScope === 'global') {
      if (params.targetRole === 'business_admin') {
        if (!params.targetCompanyId?.trim()) {
          throw new BadRequestException(
            `targetCompanyId is required when platform_admin invites ${params.targetRole}`,
          );
        }

        return {
          companyId: params.targetCompanyId.trim(),
          businessKey: params.targetBusinessKey?.trim() || null,
        };
      }

      return {
        companyId: params.actorCompanyId,
        businessKey: params.actorBusinessKey,
      };
    }

    return {
      companyId: params.actorCompanyId,
      businessKey: params.actorBusinessKey,
    };
  }
}
