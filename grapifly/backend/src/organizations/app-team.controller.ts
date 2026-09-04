import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { EcosystemAuth, type EcosystemAuthContext } from '../directory/ecosystem-auth.decorator';

@Controller('internal/apps/:appKey/organizations/:organizationId/team')
export class AppTeamController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async list(
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return this.organizations.getApplicationTeam(auth.actor ?? '', organizationId, auth.appKey!);
  }

  @Post('invitations')
  async invite(
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
    @Body() body: { email: string; role: string },
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return this.organizations.invite(auth.actor ?? '', organizationId, {
      email: body.email,
      role: body.role === 'admin' ? 'admin' : 'member',
      applicationKeys: [auth.appKey!],
      applicationRoles: { [auth.appKey!]: body.role },
    });
  }

  @Post('invitations/:invitationId/regenerate')
  async regenerate(
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return this.organizations.regenerateInvitation(auth.actor ?? '', organizationId, invitationId);
  }

  @Post('invitations/:invitationId/cancel')
  async cancel(
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return this.organizations.cancelInvitation(auth.actor ?? '', organizationId, invitationId);
  }

  @Patch('members/:grapiflyUserId')
  async updateMember(
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
    @Param('grapiflyUserId') grapiflyUserId: string,
    @Body() body: { role?: string; status?: string },
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return this.organizations.updateApplicationMember(
      auth.actor ?? '',
      organizationId,
      auth.appKey!,
      grapiflyUserId,
      body,
    );
  }
}
