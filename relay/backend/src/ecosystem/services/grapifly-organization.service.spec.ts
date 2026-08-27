import { of } from 'rxjs';
import { GrapiflyOrganizationService } from './grapifly-organization.service';

describe('GrapiflyOrganizationService — secret resolution', () => {
  let http: { request: jest.Mock };
  let config: { get: jest.Mock };
  let identity: { findByIdOrThrow: jest.Mock };
  let service: GrapiflyOrganizationService;

  const ctx = { userId: 'relay-user-1', grapiflyOrganizationId: 'gpf_org_acme', companyId: 'c1', companyKey: 'acme' } as any;
  const organizationPayload = {
    contractVersion: 2,
    organization: { organizationId: 'gpf_org_acme', name: 'Acme', slug: 'acme', status: 'active' },
  };

  beforeEach(() => {
    http = { request: jest.fn().mockReturnValue(of({ data: organizationPayload })) };
    config = { get: jest.fn() };
    identity = { findByIdOrThrow: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1' }) };
    service = new GrapiflyOrganizationService(http as any, config as any, identity as any);
  });

  it('prefers RELAY_SERVICE_SECRET when set', async () => {
    config.get.mockImplementation((key: string) =>
      ({ RELAY_SERVICE_SECRET: 'relay-own-secret', GRAPIFLY_SSO_CLIENT_SECRET: 'legacy-shared-secret' })[key],
    );

    await service.get(ctx);

    expect(http.request).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ 'x-grapifly-sso-secret': 'relay-own-secret' }) }),
    );
  });

  it('falls back to GRAPIFLY_SSO_CLIENT_SECRET when RELAY_SERVICE_SECRET is not set', async () => {
    config.get.mockImplementation((key: string) => ({ GRAPIFLY_SSO_CLIENT_SECRET: 'legacy-shared-secret' })[key]);

    await service.get(ctx);

    expect(http.request).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ 'x-grapifly-sso-secret': 'legacy-shared-secret' }) }),
    );
  });

  it('listEnabledApps hits the /enabled-apps sub-path and returns the applications array', async () => {
    config.get.mockImplementation((key: string) => ({ RELAY_SERVICE_SECRET: 'relay-own-secret' })[key]);
    const applications = [{ key: 'relay', name: 'Relay', description: 'd', launchUrl: 'https://relay', theme: {}, tier: 'free' }];
    http.request.mockReturnValue(of({ data: { contractVersion: 2, applications, total: 1 } }));

    const result = await service.listEnabledApps(ctx);

    expect(http.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('/internal/apps/relay/organizations/gpf_org_acme/enabled-apps') }),
    );
    expect(result).toEqual(applications);
  });
});
