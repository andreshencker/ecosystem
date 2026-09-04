import { of } from 'rxjs';
import { GrapiflyTeamService } from './grapifly-team.service';

describe('GrapiflyTeamService — secret resolution', () => {
  let http: { request: jest.Mock };
  let config: { get: jest.Mock };
  let identity: { findByIdOrThrow: jest.Mock };
  let service: GrapiflyTeamService;

  const ctx = { userId: 'relay-user-1', grapiflyOrganizationId: 'gpf_org_acme', companyId: 'c1', companyKey: 'acme' } as any;

  beforeEach(() => {
    http = { request: jest.fn().mockReturnValue(of({ data: { members: [], invitations: [] } })) };
    config = { get: jest.fn() };
    identity = { findByIdOrThrow: jest.fn().mockResolvedValue({ grapiflyUserId: 'gpf_usr_1' }) };
    service = new GrapiflyTeamService(http as any, config as any, identity as any);
  });

  it('prefers RELAY_SERVICE_SECRET when set', async () => {
    config.get.mockImplementation((key: string) =>
      ({ RELAY_SERVICE_SECRET: 'relay-own-secret', GRAPIFLY_SSO_CLIENT_SECRET: 'legacy-shared-secret' })[key],
    );

    await service.list(ctx);

    expect(http.request).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ 'x-ecosystem-secret': 'relay-own-secret' }) }),
    );
  });

  it('falls back to GRAPIFLY_SSO_CLIENT_SECRET when RELAY_SERVICE_SECRET is not set', async () => {
    config.get.mockImplementation((key: string) => ({ GRAPIFLY_SSO_CLIENT_SECRET: 'legacy-shared-secret' })[key]);

    await service.list(ctx);

    expect(http.request).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ 'x-ecosystem-secret': 'legacy-shared-secret' }) }),
    );
  });
});
