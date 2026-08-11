import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
  create(@Req() request: SessionRequest, @Body() body: { name: string }) {
    return this.organizations.create(request.grapiflySession!.sub, body.name);
  }

  @Get('organizations/:organizationId')
  details(@Req() request: SessionRequest, @Param('organizationId') organizationId: string) {
    return this.organizations.getDetails(request.grapiflySession!.sub, organizationId);
  }

  @Post('organizations/:organizationId/applications')
  enableApplication(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Body() body: { applicationKey: string }) {
    return this.organizations.enableApplication(request.grapiflySession!.sub, organizationId, body.applicationKey);
  }

  @Post('organizations/:organizationId/invitations')
  invite(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Body() body: { email: string; role?: string; applicationKeys?: string[] }) {
    return this.organizations.invite(request.grapiflySession!.sub, organizationId, body);
  }

  @Post('invitations/:token/accept')
  accept(@Req() request: SessionRequest, @Param('token') token: string) {
    return this.organizations.accept(request.grapiflySession!.sub, token);
  }
}
