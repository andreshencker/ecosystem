import { UnauthorizedException } from '@nestjs/common';
import { GlobalAuthGuard } from './global-auth.guard';

function buildContext(headers: Record<string, string>) {
  const request: any = { headers, path: '/notifications/event', method: 'POST' };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __request: request,
  } as any;
}

describe('GlobalAuthGuard — x-grapifly-service-secret (step 3.5)', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let config: { get: jest.Mock };
  let communicationTokens: { resolvePlatformCompany: jest.Mock; resolveCompanyByToken: jest.Mock };
  let identity: { resolveGrapiflyCompanyByOrganization: jest.Mock };
  let guard: GlobalAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    jwtService = { verifyAsync: jest.fn() };
    config = { get: jest.fn().mockReturnValue('correct-relay-service-secret') };
    communicationTokens = {
      resolvePlatformCompany: jest.fn(),
      resolveCompanyByToken: jest.fn(),
    };
    identity = { resolveGrapiflyCompanyByOrganization: jest.fn() };
    guard = new GlobalAuthGuard(
      reflector as any,
      jwtService as any,
      config as any,
      communicationTokens as any,
      identity as any,
    );
  });

  it('resolves the company and sets authContext when the secret matches and organizationId is present', async () => {
    identity.resolveGrapiflyCompanyByOrganization.mockResolvedValue({ _id: 'relay-company-id' });
    const context = buildContext({
      'x-grapifly-service-secret': 'correct-relay-service-secret',
      'x-grapifly-organization-id': 'gpf_org_grapifly',
      'x-grapifly-organization-name': 'Grapifly',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(identity.resolveGrapiflyCompanyByOrganization).toHaveBeenCalledWith({
      organizationId: 'gpf_org_grapifly',
      name: 'Grapifly',
    });
    expect(context.__request.authContext).toEqual({
      actorType: 'apikey',
      keyId: 'grapifly-service',
      companyId: 'relay-company-id',
    });
  });

  it('falls back to organizationId as the name when x-grapifly-organization-name is absent (first-time resolution)', async () => {
    identity.resolveGrapiflyCompanyByOrganization.mockResolvedValue({ _id: 'new-relay-company-id' });
    const context = buildContext({
      'x-grapifly-service-secret': 'correct-relay-service-secret',
      'x-grapifly-organization-id': 'gpf_org_new',
    });

    await guard.canActivate(context);

    expect(identity.resolveGrapiflyCompanyByOrganization).toHaveBeenCalledWith({
      organizationId: 'gpf_org_new',
      name: 'gpf_org_new',
    });
    expect(context.__request.authContext.companyId).toBe('new-relay-company-id');
  });

  it('rejects when the secret does not match RELAY_SERVICE_SECRET', async () => {
    const context = buildContext({
      'x-grapifly-service-secret': 'wrong-secret',
      'x-grapifly-organization-id': 'gpf_org_grapifly',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(identity.resolveGrapiflyCompanyByOrganization).not.toHaveBeenCalled();
  });

  it('rejects when x-grapifly-organization-id is missing, even with a correct secret', async () => {
    const context = buildContext({
      'x-grapifly-service-secret': 'correct-relay-service-secret',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(identity.resolveGrapiflyCompanyByOrganization).not.toHaveBeenCalled();
  });

  it('rejects when RELAY_SERVICE_SECRET is not configured on this Relay deployment', async () => {
    config.get.mockReturnValue(undefined);
    const context = buildContext({
      'x-grapifly-service-secret': 'anything',
      'x-grapifly-organization-id': 'gpf_org_grapifly',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not confuse a Grapifly service call with an admin-key or integration-token call', async () => {
    identity.resolveGrapiflyCompanyByOrganization.mockResolvedValue({ _id: 'relay-company-id' });
    const context = buildContext({
      'x-grapifly-service-secret': 'correct-relay-service-secret',
      'x-grapifly-organization-id': 'gpf_org_grapifly',
    });

    await guard.canActivate(context);

    expect(communicationTokens.resolvePlatformCompany).not.toHaveBeenCalled();
    expect(communicationTokens.resolveCompanyByToken).not.toHaveBeenCalled();
  });
});
