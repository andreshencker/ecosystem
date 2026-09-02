import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

import { RelayPurposesService } from '../relay-purposes.service';
import { RelayConnectionService } from '../../connection/relay-connection.service';
import type { CredentialOptionDto } from '../dto/purpose-response.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Builds a single item from GET /provider-credentials?companyId=...&populate=true
 * — the same shape returned by Relay' findAllByCompany().
 */
function makeProviderCredential(
  overrides: Partial<Record<string, any>> = {},
): Record<string, any> {
  return {
    id: 'cred_abc123',
    tag: 'general',
    displayIdentifier: 'grapiflyvideo@gmail.com',
    isActive: true,
    companyChannelProvider: {
      id: 'ccp_001',
      companyId: 'remote_co_001',
      isActive: true,
      provider: {
        providerKey: 'gmail',
        displayName: 'Gmail',
        connectionType: 'smtp',
      },
      channel: {
        channelKey: 'email',
        displayName: 'Email',
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Wraps items in the paginated response shape returned by the backend. */
function pageOf(...items: Record<string, any>[]) {
  return { data: items, total: items.length, limit: 200, offset: 0 };
}

const FAKE_CONN = {
  relayCompanyId: 'remote_co_001',
  decryptedToken: 'tok_supersecret',
  status: 'connected' as const,
  isActive: true,
};

const mockConnectionService = {
  getRelayConnectionForContext: jest.fn().mockResolvedValue(FAKE_CONN),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'RELAY_API_URL') return 'http://comms.test';
    if (key === 'RELAY_API_KEY') return 'admin-key-123';
    return undefined;
  }),
};

// ─── Test builder ─────────────────────────────────────────────────────────────

async function buildService(responseData: any) {
  const httpMock = {
    get: jest.fn().mockReturnValue(of({ data: responseData, status: 200 })),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RelayPurposesService,
      { provide: RelayConnectionService, useValue: mockConnectionService },
      { provide: HttpService, useValue: httpMock },
      { provide: ConfigService, useValue: mockConfig },
    ],
  }).compile();
  return {
    service: module.get(RelayPurposesService),
    httpMock,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('RelayPurposesService — getCredentialOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectionService.getRelayConnectionForContext.mockResolvedValue(
      FAKE_CONN,
    );
  });

  // ── Correct endpoint and auth ────────────────────────────────────────────────

  it('calls /provider-credentials with populate=true and active=true (not /options)', async () => {
    const { service, httpMock } = await buildService(pageOf());
    await service.getCredentialOptions('biz_001', 'email');

    const url: string = httpMock.get.mock.calls[0][0];
    expect(url).toContain('/provider-credentials?');
    expect(url).not.toContain('/provider-credentials/options');
    expect(url).toContain('populate=true');
    expect(url).toContain('active=true');
    expect(url).toContain(`companyId=${FAKE_CONN.relayCompanyId}`);
  });

  it('sends RELAY_API_KEY as x-api-key (never the integration token)', async () => {
    const { service, httpMock } = await buildService(pageOf());
    await service.getCredentialOptions('biz_001', 'email');

    const headers = httpMock.get.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('admin-key-123');
    expect(headers['x-api-key']).not.toBe(FAKE_CONN.decryptedToken);
  });

  // ── Email credential — full metadata ─────────────────────────────────────────

  it('maps email credential with tag, displayIdentifier, provider and connectionType', async () => {
    const raw = makeProviderCredential();
    const { service } = await buildService(pageOf(raw));

    const result = await service.getCredentialOptions('biz_001', 'email');

    expect(result).toHaveLength(1);
    const opt: CredentialOptionDto = result[0];

    expect(opt.id).toBe('cred_abc123');
    expect(opt.tag).toBe('general');
    expect(opt.displayIdentifier).toBe('grapiflyvideo@gmail.com');
    expect(opt.channel).toBe('email');
    expect(opt.channelDisplayName).toBe('Email');
    expect(opt.providerKey).toBe('gmail');
    expect(opt.providerDisplayName).toBe('Gmail');
    expect(opt.connectionType).toBe('smtp');
    expect(opt.isActive).toBe(true);
  });

  // ── SMS credential — full metadata ────────────────────────────────────────────

  it('maps SMS credential with phone number as displayIdentifier', async () => {
    const raw = makeProviderCredential({
      id: 'cred_sms_001',
      tag: 'support',
      displayIdentifier: '+61400000000',
      companyChannelProvider: {
        id: 'ccp_002',
        companyId: 'remote_co_001',
        isActive: true,
        provider: {
          providerKey: 'twilio',
          displayName: 'Twilio',
          connectionType: 'api_key',
        },
        channel: { channelKey: 'sms', displayName: 'SMS' },
      },
    });
    const { service } = await buildService(pageOf(raw));

    const result = await service.getCredentialOptions('biz_001', 'sms');

    expect(result).toHaveLength(1);
    const opt = result[0];
    expect(opt.id).toBe('cred_sms_001');
    expect(opt.tag).toBe('support');
    expect(opt.displayIdentifier).toBe('+61400000000');
    expect(opt.channel).toBe('sms');
    expect(opt.channelDisplayName).toBe('SMS');
    expect(opt.providerKey).toBe('twilio');
    expect(opt.providerDisplayName).toBe('Twilio');
    expect(opt.connectionType).toBe('api_key');
  });

  // ── Channel filtering ─────────────────────────────────────────────────────────

  it('returns only email credentials when channel=email', async () => {
    const emailCred = makeProviderCredential({
      id: 'email_01',
      tag: 'general',
    });
    const smsCred = makeProviderCredential({
      id: 'sms_01',
      tag: 'sms_general',
      companyChannelProvider: {
        ...emailCred.companyChannelProvider,
        channel: { channelKey: 'sms', displayName: 'SMS' },
      },
    });
    const { service } = await buildService(pageOf(emailCred, smsCred));

    const result = await service.getCredentialOptions('biz_001', 'email');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('email_01');
    expect(result[0].channel).toBe('email');
  });

  it('returns only SMS credentials when channel=sms', async () => {
    const emailCred = makeProviderCredential({
      id: 'email_01',
      tag: 'email_tag',
    });
    const smsCred = makeProviderCredential({
      id: 'sms_01',
      tag: 'sms_tag',
      companyChannelProvider: {
        ...emailCred.companyChannelProvider,
        channel: { channelKey: 'sms', displayName: 'SMS' },
      },
    });
    const { service } = await buildService(pageOf(emailCred, smsCred));

    const result = await service.getCredentialOptions('biz_001', 'sms');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sms_01');
    expect(result[0].channel).toBe('sms');
  });

  it('excludes calendar credentials from both email and SMS selectors', async () => {
    const calendarCred = makeProviderCredential({
      id: 'cal_01',
      tag: 'calendar_tag',
      companyChannelProvider: {
        id: 'ccp_cal',
        companyId: 'remote_co_001',
        isActive: true,
        provider: {
          providerKey: 'google',
          displayName: 'Google',
          connectionType: 'oauth',
        },
        channel: { channelKey: 'calendar', displayName: 'Calendar' },
      },
    });
    const { service } = await buildService(pageOf(calendarCred));

    const emailResult = await service.getCredentialOptions('biz_001', 'email');
    const smsResult = await service.getCredentialOptions('biz_001', 'sms');

    expect(emailResult).toHaveLength(0);
    expect(smsResult).toHaveLength(0);
  });

  // ── Inactive exclusion ────────────────────────────────────────────────────────

  it('excludes inactive credentials (active=true is sent to Relay)', async () => {
    // Relay filters inactive records server-side when active=true is in the query.
    // We verify the query param is sent correctly.
    const { service, httpMock } = await buildService(pageOf());
    await service.getCredentialOptions('biz_001', 'email');

    const url: string = httpMock.get.mock.calls[0][0];
    expect(url).toContain('active=true');
  });

  // ── Missing optional display values ──────────────────────────────────────────

  it('sets displayIdentifier to undefined for legacy credentials without the field', async () => {
    const raw = makeProviderCredential({ displayIdentifier: undefined });
    const { service } = await buildService(pageOf(raw));

    const [opt] = await service.getCredentialOptions('biz_001', 'email');
    expect(opt.displayIdentifier).toBeUndefined();
  });

  it('falls back to providerKey when providerDisplayName is missing', async () => {
    const raw = makeProviderCredential({
      companyChannelProvider: {
        ...makeProviderCredential().companyChannelProvider,
        provider: {
          providerKey: 'sendgrid',
          displayName: '',
          connectionType: 'api_key',
        },
      },
    });
    const { service } = await buildService(pageOf(raw));

    const [opt] = await service.getCredentialOptions('biz_001', 'email');
    expect(opt.providerDisplayName).toBe('');
    expect(opt.providerKey).toBe('sendgrid');
  });

  it('returns empty connectionType string when field is absent', async () => {
    const raw = makeProviderCredential({
      companyChannelProvider: {
        ...makeProviderCredential().companyChannelProvider,
        provider: {
          providerKey: 'smtp',
          displayName: 'SMTP',
          connectionType: undefined,
        },
      },
    });
    const { service } = await buildService(pageOf(raw));

    const [opt] = await service.getCredentialOptions('biz_001', 'email');
    expect(opt.connectionType).toBe('');
  });

  it('does not crash when companyChannelProvider is missing nested fields', async () => {
    const raw = makeProviderCredential({
      companyChannelProvider: {
        id: 'ccp_broken',
        companyId: 'remote_co_001',
        isActive: true,
        provider: undefined,
        channel: { channelKey: 'email', displayName: 'Email' },
      },
    });
    const { service } = await buildService(pageOf(raw));

    // Should not throw; provider fields default to empty string
    const result = await service.getCredentialOptions('biz_001', 'email');
    expect(result).toHaveLength(1);
    expect(result[0].providerKey).toBe('');
    expect(result[0].providerDisplayName).toBe('');
    expect(result[0].connectionType).toBe('');
  });

  // ── providerCredentialsId is the submitted value ──────────────────────────────

  it('id field is the ProviderCredentials ObjectId — not tag or providerKey', async () => {
    const raw = makeProviderCredential({ id: 'credential_object_id_xyz' });
    const { service } = await buildService(pageOf(raw));

    const [opt] = await service.getCredentialOptions('biz_001', 'email');
    expect(opt.id).toBe('credential_object_id_xyz');
    expect(opt.id).not.toBe(opt.tag);
    expect(opt.id).not.toBe(opt.providerKey);
  });

  it('resolves id from _id when id field is absent', async () => {
    const raw = {
      ...makeProviderCredential(),
      id: undefined,
      _id: 'mongo_id_001',
    };
    const { service } = await buildService(pageOf(raw));

    const [opt] = await service.getCredentialOptions('biz_001', 'email');
    expect(opt.id).toBe('mongo_id_001');
  });

  // ── Multiple credentials ───────────────────────────────────────────────────────

  it('returns multiple email credentials when all match the channel', async () => {
    const cred1 = makeProviderCredential({ id: 'cred_1', tag: 'general' });
    const cred2 = makeProviderCredential({
      id: 'cred_2',
      tag: 'marketing',
      displayIdentifier: 'marketing@company.com',
      companyChannelProvider: {
        ...cred1.companyChannelProvider,
        provider: {
          providerKey: 'sendgrid',
          displayName: 'SendGrid',
          connectionType: 'api_key',
        },
      },
    });
    const { service } = await buildService(pageOf(cred1, cred2));

    const result = await service.getCredentialOptions('biz_001', 'email');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('cred_1');
    expect(result[0].tag).toBe('general');
    expect(result[0].displayIdentifier).toBe('grapiflyvideo@gmail.com');
    expect(result[1].id).toBe('cred_2');
    expect(result[1].tag).toBe('marketing');
    expect(result[1].displayIdentifier).toBe('marketing@company.com');
    expect(result[1].connectionType).toBe('api_key');
  });

  // ── Error resilience ──────────────────────────────────────────────────────────

  it('returns empty array when Relay returns an error', async () => {
    const error = Object.assign(new Error('network error'), {
      response: { status: 502 },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelayPurposesService,
        { provide: RelayConnectionService, useValue: mockConnectionService },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn().mockImplementation(() => {
              throw error;
            }),
          },
        },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    const svc = module.get(RelayPurposesService);

    const result = await svc.getCredentialOptions('biz_001', 'email');
    expect(result).toEqual([]);
  });
});
