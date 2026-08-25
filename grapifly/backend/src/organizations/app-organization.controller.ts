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
}
