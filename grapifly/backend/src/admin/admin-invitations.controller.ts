import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, SessionRequest } from '../auth/session.guard';
import { PlatformAdminService } from './platform-admin.service';

/**
 * The one entry point into the ecosystem's internal (admin) world besides
 * the bootstrap-seeded super admin. Deliberately NOT behind PlatformAdminGuard
 * at the class level — accept() must be reachable by a signed-in Grapifly
 * user who is not yet an admin. invite/list/cancel enforce the real "must be
 * an active admin" / "must be super admin" checks inside PlatformAdminService.
 */
@Controller('admin/invitations')
@UseGuards(SessionGuard)
export class AdminInvitationsController {
  constructor(private readonly admins: PlatformAdminService) {}

  @Get()
  list(@Req() request: SessionRequest) {
    return this.admins.listInvitations(request.grapiflySession!.sub);
  }

  @Post()
  invite(@Req() request: SessionRequest, @Body() body: { email: string; level: string }) {
    return this.admins.invite(request.grapiflySession!.sub, body.email, body.level);
  }

  @Post(':invitationId/cancel')
  cancel(@Req() request: SessionRequest, @Param('invitationId') invitationId: string) {
    return this.admins.cancelInvitation(request.grapiflySession!.sub, invitationId);
  }

  @Post('accept')
  accept(@Req() request: SessionRequest, @Body() body: { token: string }) {
    return this.admins.acceptInvitation(request.grapiflySession!.sub, body.token);
  }
}
