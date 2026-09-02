import { of, throwError } from 'rxjs';
import { RelayNotificationService } from './relay-notification.service';

describe('RelayNotificationService', () => {
  let http: { post: jest.Mock };
  let config: { get: jest.Mock };
  let service: RelayNotificationService;

  beforeEach(() => {
    http = { post: jest.fn() };
    config = { get: jest.fn() };
    service = new RelayNotificationService(http as any, config as any);
  });

  it('POSTs to Relay with the service-secret and organization headers', async () => {
    config.get.mockImplementation((key: string) =>
      ({ RELAY_API_URL: 'http://localhost:3001', RELAY_SERVICE_SECRET: 'shared-secret' })[key],
    );
    http.post.mockReturnValue(of({ data: {} }));

    await service.sendEvent({
      organizationId: 'gpf_org_acme',
      organizationName: 'Acme',
      event: 'organization_invitation',
      email: 'invitee@example.com',
      payload: { invitationUrl: 'https://app.example.com/invitations/abc' },
    });

    expect(http.post).toHaveBeenCalledWith(
      'http://localhost:3001/notifications/event',
      {
        companyId: 'gpf_org_acme',
        event: 'organization_invitation',
        email: 'invitee@example.com',
        variables: { invitationUrl: 'https://app.example.com/invitations/abc' },
      },
      expect.objectContaining({
        timeout: 15000,
        headers: {
          'x-grapifly-service-secret': 'shared-secret',
          'x-grapifly-organization-id': 'gpf_org_acme',
          'x-grapifly-organization-name': 'Acme',
        },
      }),
    );
  });

  it('never throws when Relay is unreachable or rejects the call', async () => {
    config.get.mockImplementation((key: string) =>
      ({ RELAY_API_URL: 'http://localhost:3001', RELAY_SERVICE_SECRET: 'shared-secret' })[key],
    );
    http.post.mockReturnValue(throwError(() => new Error('connect ECONNREFUSED')));

    await expect(
      service.sendEvent({
        organizationId: 'gpf_org_acme',
        organizationName: 'Acme',
        event: 'organization_invitation',
        email: 'invitee@example.com',
      }),
    ).resolves.toBeUndefined();
  });

  it('never throws on a 404 (event not yet configured in Relay for this company)', async () => {
    config.get.mockImplementation((key: string) =>
      ({ RELAY_API_URL: 'http://localhost:3001', RELAY_SERVICE_SECRET: 'shared-secret' })[key],
    );
    http.post.mockReturnValue(throwError(() => ({ response: { status: 404 } })));

    await expect(
      service.sendEvent({
        organizationId: 'gpf_org_acme',
        organizationName: 'Acme',
        event: 'organization_invitation',
        email: 'invitee@example.com',
      }),
    ).resolves.toBeUndefined();
  });

  it('falls back to GRAPIFLY_SSO_CLIENT_SECRET when RELAY_SERVICE_SECRET is not set (matches the Applications catalogue fallback)', async () => {
    config.get.mockImplementation((key: string) =>
      ({ RELAY_API_URL: 'http://localhost:3001', GRAPIFLY_SSO_CLIENT_SECRET: 'legacy-shared-secret' })[key],
    );
    http.post.mockReturnValue(of({ data: {} }));

    await service.sendEvent({
      organizationId: 'gpf_org_acme',
      organizationName: 'Acme',
      event: 'organization_invitation',
      email: 'invitee@example.com',
    });

    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-grapifly-service-secret': 'legacy-shared-secret' }),
      }),
    );
  });

  it('skips the call entirely when no secret is configured at all', async () => {
    config.get.mockReturnValue(undefined);

    await service.sendEvent({
      organizationId: 'gpf_org_acme',
      organizationName: 'Acme',
      event: 'organization_invitation',
      email: 'invitee@example.com',
    });

    expect(http.post).not.toHaveBeenCalled();
  });
});
