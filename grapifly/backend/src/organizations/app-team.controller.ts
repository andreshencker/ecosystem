import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller('internal/apps/:appKey/organizations/:organizationId/team')
export class AppTeamController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async list(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return this.organizations.getApplicationTeam(actorUserId, organizationId, appKey);
  }

  @Post('invitations')
  async invite(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
    @Body() body: { email: string; role: string },
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return this.organizations.invite(actorUserId, organizationId, {
      email: body.email,
      role: body.role === 'admin' ? 'admin' : 'member',
      applicationKeys: [appKey],
      applicationRoles: { [appKey]: body.role },
    });
  }

  @Post('invitations/:invitationId/regenerate')
  async regenerate(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return this.organizations.regenerateInvitation(actorUserId, organizationId, invitationId);
  }

  @Post('invitations/:invitationId/cancel')
  async cancel(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return this.organizations.cancelInvitation(actorUserId, organizationId, invitationId);
  }

  @Patch('members/:grapiflyUserId')
  async updateMember(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
    @Param('grapiflyUserId') grapiflyUserId: string,
    @Body() body: { role?: string; status?: string },
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return this.organizations.updateApplicationMember(
      actorUserId,
      organizationId,
      appKey,
      grapiflyUserId,
      body,
    );
  }
}
