import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller('internal/apps/relay/organizations/:organizationId/team')
export class RelayTeamController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  list(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('organizationId') organizationId: string,
  ) {
    this.organizations.assertRelayClient(secret);
    return this.organizations.getApplicationTeam(actorUserId, organizationId, 'relay');
  }

  @Post('invitations')
  invite(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('organizationId') organizationId: string,
    @Body() body: { email: string; role: 'admin' | 'operator' | 'viewer' },
  ) {
    this.organizations.assertRelayClient(secret);
    return this.organizations.invite(actorUserId, organizationId, {
      email: body.email,
      role: body.role === 'admin' ? 'admin' : 'member',
      applicationKeys: ['relay'],
      applicationRoles: { relay: body.role },
    });
  }

  @Post('invitations/:invitationId/regenerate')
  regenerate(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    this.organizations.assertRelayClient(secret);
    return this.organizations.regenerateInvitation(actorUserId, organizationId, invitationId);
  }

  @Post('invitations/:invitationId/cancel')
  cancel(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    this.organizations.assertRelayClient(secret);
    return this.organizations.cancelInvitation(actorUserId, organizationId, invitationId);
  }

  @Patch('members/:grapiflyUserId')
  updateMember(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('organizationId') organizationId: string,
    @Param('grapiflyUserId') grapiflyUserId: string,
    @Body() body: { role?: string; status?: string },
  ) {
    this.organizations.assertRelayClient(secret);
    return this.organizations.updateApplicationMember(
      actorUserId,
      organizationId,
      'relay',
      grapiflyUserId,
      body,
    );
  }
}
