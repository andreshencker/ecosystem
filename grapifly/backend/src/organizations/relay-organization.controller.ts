import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller('internal/apps/relay/organizations')
export class RelayOrganizationListController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async listOrganizations(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
  ) {
    this.organizations.assertRelayClient(secret);
    return {
      contractVersion: 2,
      organizations: await this.organizations.listForUserByApplication(actorUserId, 'relay'),
    };
  }
}

@Controller('internal/apps/relay/organizations/:organizationId')
export class RelayOrganizationController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async getOrganization(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('organizationId') organizationId: string,
  ) {
    this.organizations.assertRelayClient(secret);
    return {
      contractVersion: 2,
      organization: await this.organizations.getApplicationOrganization(
        actorUserId,
        organizationId,
        'relay',
      ),
    };
  }

  @Patch()
  async updateOrganization(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.organizations.assertRelayClient(secret);
    return {
      contractVersion: 2,
      organization: await this.organizations.updateApplicationOrganization(
        actorUserId,
        organizationId,
        'relay',
        body,
      ),
    };
  }
}
