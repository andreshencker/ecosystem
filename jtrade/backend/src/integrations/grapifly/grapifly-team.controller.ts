import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../../core/auth/types/auth-context';
import { InviteTeamMemberDto, UpdateTeamMemberDto } from './dto/team.dto';
import { GrapiflyTeamService } from './grapifly-team.service';

type AuthRequest = Request & { user: AuthContext };

@Controller('team')
export class GrapiflyTeamController {
  constructor(private readonly team: GrapiflyTeamService) {}

  @Roles(ApplicationRole.PROVIDER)
  @Get()
  list(@Req() req: AuthRequest) {
    return this.team.list(req.user.organizationId, req.user.grapiflyUserId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post('invitations')
  invite(@Req() req: AuthRequest, @Body() body: InviteTeamMemberDto) {
    return this.team.invite(req.user.organizationId, req.user.grapiflyUserId, body);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post('invitations/:id/regenerate')
  regenerate(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.team.regenerate(req.user.organizationId, req.user.grapiflyUserId, id);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post('invitations/:id/cancel')
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.team.cancel(req.user.organizationId, req.user.grapiflyUserId, id);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch('members/:id')
  updateMember(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: UpdateTeamMemberDto) {
    return this.team.updateMember(req.user.organizationId, req.user.grapiflyUserId, id, body);
  }
}
