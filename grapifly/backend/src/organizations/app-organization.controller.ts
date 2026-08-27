import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller('internal/apps/:appKey/organizations')
export class AppOrganizationListController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async listOrganizations(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return {
      contractVersion: 2,
      organizations: await this.organizations.listForUserByApplication(actorUserId, appKey),
    };
  }
}

@Controller('internal/apps/:appKey/organizations/:organizationId')
export class AppOrganizationController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async getOrganization(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return {
      contractVersion: 2,
      organization: await this.organizations.getApplicationOrganization(
        actorUserId,
        organizationId,
        appKey,
      ),
    };
  }

  @Patch()
  async updateOrganization(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    return {
      contractVersion: 2,
      organization: await this.organizations.updateApplicationOrganization(
        actorUserId,
        organizationId,
        appKey,
        body,
      ),
    };
  }

  /**
   * Powers each app's own "switch apps" (Google-waffle-style) menu — the
   * same enabled-apps list "My Apps" already shows a Grapifly user, just
   * reachable server-to-server so Relay/jtrade's own backends can fetch it
   * on behalf of their signed-in user without a Grapifly session cookie.
   */
  @Get('enabled-apps')
  async listEnabledApps(
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
    @Headers('x-grapifly-user-id') actorUserId: string,
    @Param('appKey') appKey: string,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizations.assertAppClient(appKey, secret);
    const applications = await this.organizations.listEnabledApplications(actorUserId, organizationId);
    return { contractVersion: 2, applications, total: applications.length };
  }
}
