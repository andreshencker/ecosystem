import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, SessionRequest } from '../auth/session.guard';
import { OrganizationsService } from './organizations.service';

@Controller()
@UseGuards(SessionGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('organizations')
  async list(@Req() request: SessionRequest) {
    return { organizations: await this.organizations.listForUser(request.grapiflySession!.sub) };
  }

  @Post('organizations')
  create(@Req() request: SessionRequest, @Body() body: { name: string; entityType?: 'company' | 'individual' }) {
    return this.organizations.create(request.grapiflySession!.sub, body.name, body.entityType);
  }

  @Get('organizations/:organizationId')
  details(@Req() request: SessionRequest, @Param('organizationId') organizationId: string) {
    return this.organizations.getDetails(request.grapiflySession!.sub, organizationId);
  }

  @Patch('organizations/:organizationId')
  update(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Body() body: Record<string, unknown>) {
    return this.organizations.updateProfile(request.grapiflySession!.sub, organizationId, body);
  }

  @Post('organizations/:organizationId/archive')
  archive(@Req() request: SessionRequest, @Param('organizationId') organizationId: string) {
    return this.organizations.archive(request.grapiflySession!.sub, organizationId);
  }

  @Post('organizations/:organizationId/applications')
  enableApplication(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Body() body: { applicationKey: string }) {
    return this.organizations.enableApplication(request.grapiflySession!.sub, organizationId, body.applicationKey);
  }

  @Post('organizations/:organizationId/invitations')
  invite(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Body() body: { email: string; role?: string; applicationKeys?: string[]; applicationRoles?: Record<string, string> }) {
    return this.organizations.invite(request.grapiflySession!.sub, organizationId, body);
  }

  @Post('organizations/:organizationId/invitations/:invitationId/regenerate')
  regenerateInvitation(
    @Req() request: SessionRequest,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.organizations.regenerateInvitation(
      request.grapiflySession!.sub,
      organizationId,
      invitationId,
    );
  }

  @Post('organizations/:organizationId/invitations/:invitationId/cancel')
  cancelInvitation(
    @Req() request: SessionRequest,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.organizations.cancelInvitation(
      request.grapiflySession!.sub,
      organizationId,
      invitationId,
    );
  }

  @Post('invitations/:token/accept')
  accept(@Req() request: SessionRequest, @Param('token') token: string) {
    return this.organizations.accept(request.grapiflySession!.sub, token);
  }
}
