import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { EcosystemAuth, type EcosystemAuthContext } from '../directory/ecosystem-auth.decorator';

@Controller('internal/apps/:appKey/organizations')
export class AppOrganizationListController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async listOrganizations(@EcosystemAuth() auth: EcosystemAuthContext) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return {
      contractVersion: 2,
      organizations: await this.organizations.listForUserByApplication(
        auth.actor ?? '',
        auth.appKey!,
      ),
    };
  }
}

@Controller('internal/apps/:appKey/organizations/:organizationId')
export class AppOrganizationController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  async getOrganization(
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return {
      contractVersion: 2,
      organization: await this.organizations.getApplicationOrganization(
        auth.actor ?? '',
        organizationId,
        auth.appKey!,
      ),
    };
  }

  @Patch()
  async updateOrganization(
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    return {
      contractVersion: 2,
      organization: await this.organizations.updateApplicationOrganization(
        auth.actor ?? '',
        organizationId,
        auth.appKey!,
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
    @EcosystemAuth() auth: EcosystemAuthContext,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizations.assertAppClient(auth.appKey, auth.secret);
    const applications = await this.organizations.listEnabledApplications(
      auth.actor ?? '',
      organizationId,
    );
    return { contractVersion: 2, applications, total: applications.length };
  }
}
