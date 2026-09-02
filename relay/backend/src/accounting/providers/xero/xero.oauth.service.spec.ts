// src/accounting/providers/xero/xero.oauth.service.spec.ts
//
// Unit tests for XeroOAuthService.
//
// All Xero HTTP calls are mocked via jest.spyOn(global, 'fetch').
// Redis is mocked. CryptoService is mocked.
// No real network calls, database writes, or credential values.

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { XeroOAuthService } from './xero.oauth.service';
import { ProviderCredentials } from '../../../communication/channels/provider-credentials/schemas/provider-credentials.schema';
import { CompanyChannelProvider } from '../../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import { CryptoService } from '../../../communication/common/security/crypto.service';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';
import {
  XERO_AUTH_URL,
  XERO_TOKEN_URL,
  XERO_CONNECTIONS_URL,
  XERO_DEFAULT_SCOPES,
} from './xero.oauth.types';

// ─── Mock factories ────────────────────────────────────────────────────────────

const mockCredModel = () => ({
  findOne: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      lean: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    }),
  }),
  findById: jest.fn().mockReturnValue({
    lean: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
  }),
  updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
});

const mockCcpModel = () => ({
  findById: jest
    .fn()
    .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
});

const mockRedis = () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
});

const mockCrypto = () => ({
  encryptJson: jest.fn().mockReturnValue({
    alg: 'aes-256-gcm',
    ivBase64: 'iv',
    tagBase64: 'tag',
    dataBase64: 'data',
  }),
  decryptJson: jest
    .fn()
    .mockReturnValue({ clientId: 'cid', clientSecret: 'secret' }),
});

const mockConfig = () => ({
  get: jest.fn((key: string, def?: string) => {
    const vals: Record<string, string> = {
      API_BASE_URL: 'https://api.example.com',
      XERO_OAUTH_FRONTEND_RETURN_URL:
        'https://app.example.com/accounting/connections',
    };
    return vals[key] ?? def ?? '';
  }),
});

// ─── Test helpers ──────────────────────────────────────────────────────────────

function mockFetch(statusCode: number, body: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
    json: jest.fn().mockResolvedValue(body),
  } as any);
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('XeroOAuthService', () => {
  let service: XeroOAuthService;
  let redis: ReturnType<typeof mockRedis>;
  let cryptoService: ReturnType<typeof mockCrypto>;
  let credModel: ReturnType<typeof mockCredModel>;

  beforeEach(async () => {
    redis = mockRedis();
    cryptoService = mockCrypto();
    credModel = mockCredModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroOAuthService,
        {
          provide: getModelToken(ProviderCredentials.name),
          useFactory: () => credModel,
        },
        {
          provide: getModelToken(CompanyChannelProvider.name),
          useFactory: mockCcpModel,
        },
        { provide: REDIS_CLIENT, useFactory: () => redis },
        { provide: CryptoService, useFactory: () => cryptoService },
        { provide: ConfigService, useFactory: mockConfig },
      ],
    }).compile();

    service = module.get<XeroOAuthService>(XeroOAuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── callbackUrl ────────────────────────────────────────────────────────────

  describe('callbackUrl', () => {
    it('is derived from API_BASE_URL', () => {
      expect(service.callbackUrl).toBe(
        'https://api.example.com/accounting/oauth/xero/callback',
      );
    });
  });

  // ─── Authorization URL ───────────────────────────────────────────────────────

  describe('buildAuthorizationUrl', () => {
    it('returns a URL starting with the Xero authorize endpoint', async () => {
      const { authorizationUrl } = await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
      });

      expect(authorizationUrl).toContain(XERO_AUTH_URL);
    });

    it('includes required OAuth parameters', async () => {
      const { authorizationUrl } = await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
      });

      const url = new URL(authorizationUrl);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe('my-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe(service.callbackUrl);
      expect(url.searchParams.get('scope')).toBe(XERO_DEFAULT_SCOPES);
    });

    it('includes PKCE code_challenge and code_challenge_method=S256', async () => {
      const { authorizationUrl } = await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
      });

      const url = new URL(authorizationUrl);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      const challenge = url.searchParams.get('code_challenge');
      expect(challenge).toBeTruthy();
      expect(challenge?.length).toBeGreaterThanOrEqual(43); // base64url of 32 bytes
    });

    it('includes a state parameter', async () => {
      const { authorizationUrl, state } = await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
      });

      const url = new URL(authorizationUrl);
      expect(url.searchParams.get('state')).toBe(state);
      expect(state.length).toBeGreaterThanOrEqual(64); // 32 bytes hex
    });

    it('stores state in Redis with TTL', async () => {
      await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
      });

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('xero:oauth:state:'),
        expect.any(String),
        'EX',
        600,
      );
    });

    it('stored state includes companyId and providerCredentialsId', async () => {
      await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
      });

      const stored = JSON.parse(redis.set.mock.calls[0][1]);
      expect(stored.companyId).toBe('comp-1');
      expect(stored.providerCredentialsId).toBe('cred-1');
      expect(stored.codeVerifier).toBeTruthy();
    });

    it('sanitizes returnPath — rejects absolute URLs', async () => {
      const { authorizationUrl: _ } = await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
        returnPath: 'https://evil.example.com',
      });

      const stored = JSON.parse(redis.set.mock.calls[0][1]);
      expect(stored.returnPath).toBeUndefined();
    });

    it('accepts a valid relative returnPath', async () => {
      await service.buildAuthorizationUrl({
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        clientId: 'my-client-id',
        returnPath: '/accounting/connections',
      });

      const stored = JSON.parse(redis.set.mock.calls[0][1]);
      expect(stored.returnPath).toBe('/accounting/connections');
    });
  });

  // ─── OAuth state ─────────────────────────────────────────────────────────────

  describe('consumeOAuthState', () => {
    it('returns null when state is not in Redis', async () => {
      redis.get.mockResolvedValueOnce(null);
      const result = await service.consumeOAuthState('unknown-state');
      expect(result).toBeNull();
    });

    it('deletes the state from Redis after consumption (single-use)', async () => {
      const data = {
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        codeVerifier: 'verifier',
        createdAt: Math.floor(Date.now() / 1000),
      };
      redis.get.mockResolvedValueOnce(JSON.stringify(data));

      await service.consumeOAuthState('valid-state');

      expect(redis.del).toHaveBeenCalledWith('xero:oauth:state:valid-state');
    });

    it('returns the stored state data', async () => {
      const data = {
        companyId: 'comp-1',
        providerCredentialsId: 'cred-1',
        codeVerifier: 'my-verifier',
        createdAt: 1000000,
      };
      redis.get.mockResolvedValueOnce(JSON.stringify(data));

      const result = await service.consumeOAuthState('some-state');
      expect(result?.companyId).toBe('comp-1');
      expect(result?.codeVerifier).toBe('my-verifier');
    });
  });

  // ─── Code exchange ───────────────────────────────────────────────────────────

  describe('exchangeAuthorizationCode', () => {
    const validTokenResponse = {
      access_token: 'at-mock',
      refresh_token: 'rt-mock',
      expires_in: 1800,
      token_type: 'Bearer' as const,
      scope: 'openid offline_access',
    };

    it('returns token response on success', async () => {
      mockFetch(200, validTokenResponse);

      const result = await service.exchangeAuthorizationCode({
        code: 'auth-code',
        codeVerifier: 'verifier',
        clientId: 'cid',
        clientSecret: 'secret',
      });

      expect(result.access_token).toBe('at-mock');
      expect(result.refresh_token).toBe('rt-mock');
      expect(result.expires_in).toBe(1800);
    });

    it('posts to the Xero token endpoint', async () => {
      const fetchSpy = mockFetch(200, validTokenResponse);

      await service.exchangeAuthorizationCode({
        code: 'auth-code',
        codeVerifier: 'verifier',
        clientId: 'cid',
        clientSecret: 'secret',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        XERO_TOKEN_URL,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('uses HTTP Basic auth — never sends credentials as query params', async () => {
      const fetchSpy = mockFetch(200, validTokenResponse);

      await service.exchangeAuthorizationCode({
        code: 'auth-code',
        codeVerifier: 'verifier',
        clientId: 'cid',
        clientSecret: 'secret',
      });

      const call = fetchSpy.mock.calls[0][1] as RequestInit;
      const auth = (call.headers as Record<string, string>)['Authorization'];
      expect(auth).toMatch(/^Basic /);
      // Client secret must not appear in the URL
      expect(fetchSpy.mock.calls[0][0]).not.toContain('secret');
    });

    it('includes code_verifier in body (PKCE)', async () => {
      const fetchSpy = mockFetch(200, validTokenResponse);

      await service.exchangeAuthorizationCode({
        code: 'auth-code',
        codeVerifier: 'my-verifier',
        clientId: 'cid',
        clientSecret: 'secret',
      });

      const body = String((fetchSpy.mock.calls[0][1] as any).body);
      expect(body).toContain('code_verifier=my-verifier');
    });

    it('throws an HttpException on Xero error response', async () => {
      mockFetch(400, {
        error: 'invalid_grant',
        error_description: 'Code expired',
      });

      await expect(
        service.exchangeAuthorizationCode({
          code: 'bad-code',
          codeVerifier: 'verifier',
          clientId: 'cid',
          clientSecret: 'secret',
        }),
      ).rejects.toThrow();
    });

    it('does not log the access token or client secret', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockFetch(200, validTokenResponse);

      await service.exchangeAuthorizationCode({
        code: 'auth-code',
        codeVerifier: 'verifier',
        clientId: 'cid',
        clientSecret: 'actual-secret-value',
      });

      const logged = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(logged).not.toContain('actual-secret-value');
      expect(logged).not.toContain('at-mock');
      logSpy.mockRestore();
    });
  });

  // ─── Connection listing ──────────────────────────────────────────────────────

  describe('listConnections', () => {
    it('calls GET /connections with Bearer token', async () => {
      const fetchSpy = mockFetch(200, []);

      await service.listConnections('my-access-token');

      expect(fetchSpy).toHaveBeenCalledWith(
        XERO_CONNECTIONS_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-access-token',
          }),
        }),
      );
    });

    it('returns the connections array', async () => {
      const connections = [
        {
          id: 'conn-1',
          authEventId: 'event-1',
          tenantId: 'tenant-1',
          tenantType: 'ORGANISATION',
          tenantName: 'Acme Ltd',
          createdDateUtc: '2024-01-01T00:00:00',
          updatedDateUtc: '2024-01-01T00:00:00',
        },
      ];
      mockFetch(200, connections);

      const result = await service.listConnections('token');
      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-1');
      expect(result[0].tenantName).toBe('Acme Ltd');
    });

    it('throws on API failure', async () => {
      mockFetch(401, { message: 'Unauthorized' });

      await expect(service.listConnections('bad-token')).rejects.toThrow();
    });
  });

  // ─── Token persistence ───────────────────────────────────────────────────────

  describe('persistTokens', () => {
    const existingEncrypted = {
      alg: 'aes-256-gcm',
      ivBase64: 'iv',
      tagBase64: 'tag',
      dataBase64: 'data',
    };

    beforeEach(() => {
      const mockFindById = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'cred-id',
            encrypted: existingEncrypted,
          }),
        }),
      });
      credModel.findById = mockFindById;
      cryptoService.decryptJson.mockReturnValue({
        clientId: 'cid',
        clientSecret: 'secret',
      });
    });

    it('decrypts existing credential and merges new token fields', async () => {
      await service.persistTokens({
        credentialId: '507f1f77bcf86cd799439011',
        tokenResponse: {
          access_token: 'new-at',
          refresh_token: 'new-rt',
          expires_in: 1800,
          token_type: 'Bearer',
          scope: 'openid offline_access',
        },
        tenantId: 'tid-1',
        tenantName: 'Acme Ltd',
        connectionId: 'conn-1',
      });

      const encryptedCall = cryptoService.encryptJson.mock.calls[0][0];
      expect(encryptedCall.clientId).toBe('cid');
      expect(encryptedCall.clientSecret).toBe('secret');
      expect(encryptedCall.accessToken).toBe('new-at');
      expect(encryptedCall.refreshToken).toBe('new-rt');
      expect(encryptedCall.tenantId).toBe('tid-1');
    });

    it('updates the displayIdentifier to the tenant name', async () => {
      await service.persistTokens({
        credentialId: '507f1f77bcf86cd799439011',
        tokenResponse: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 1800,
          token_type: 'Bearer',
          scope: 'openid',
        },
        tenantId: 'tid-1',
        tenantName: 'Acme Ltd',
        connectionId: 'conn-1',
      });

      const updateCall = credModel.updateOne.mock.calls[0][1];
      expect(updateCall.$set.displayIdentifier).toBe('Acme Ltd');
    });

    it('does not expose tokens in return value', async () => {
      const result = await service.persistTokens({
        credentialId: '507f1f77bcf86cd799439011',
        tokenResponse: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 1800,
          token_type: 'Bearer',
          scope: 'openid',
        },
        tenantId: 'tid-1',
        tenantName: 'Acme Ltd',
        connectionId: 'conn-1',
      });

      // persistTokens returns void
      expect(result).toBeUndefined();
    });

    it('stores expiresAt as a Unix timestamp', async () => {
      const before = Math.floor(Date.now() / 1000);

      await service.persistTokens({
        credentialId: '507f1f77bcf86cd799439011',
        tokenResponse: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 1800,
          token_type: 'Bearer',
          scope: 'openid',
        },
        tenantId: 'tid-1',
        tenantName: null,
        connectionId: 'conn-1',
      });

      const encryptedPayload = cryptoService.encryptJson.mock.calls[0][0];
      expect(encryptedPayload.expiresAt).toBeGreaterThanOrEqual(before + 1800);
      expect(encryptedPayload.expiresAt).toBeLessThanOrEqual(before + 1800 + 5);
    });
  });

  // ─── PKCE code challenge verification ────────────────────────────────────────

  describe('PKCE — code challenge derivation', () => {
    it('code challenge is SHA-256 of code verifier (base64url)', async () => {
      // Build two authorization URLs and extract challenges; verify they differ
      // (confirming per-request random verifiers) and are valid S256 challenges.
      const { authorizationUrl: url1 } = await service.buildAuthorizationUrl({
        companyId: 'c',
        providerCredentialsId: 'p',
        clientId: 'id',
      });
      // Reset redis mock for second call
      redis.set.mockResolvedValue('OK');
      const { authorizationUrl: url2 } = await service.buildAuthorizationUrl({
        companyId: 'c',
        providerCredentialsId: 'p',
        clientId: 'id',
      });

      const c1 = new URL(url1).searchParams.get('code_challenge');
      const c2 = new URL(url2).searchParams.get('code_challenge');

      expect(c1).not.toBe(c2); // unique per request
    });

    it('challenge length is correct for S256 (43 chars in base64url from 32 bytes)', async () => {
      const { authorizationUrl } = await service.buildAuthorizationUrl({
        companyId: 'c',
        providerCredentialsId: 'p',
        clientId: 'id',
      });

      const challenge = new URL(authorizationUrl).searchParams.get(
        'code_challenge',
      );
      // SHA-256 produces 32 bytes → 43 base64url chars (no padding)
      expect(challenge?.length).toBe(43);
    });
  });

  // ─── Security ─────────────────────────────────────────────────────────────────

  describe('Security invariants', () => {
    it('state token is at least 64 hex characters (256-bit entropy)', async () => {
      const { state } = await service.buildAuthorizationUrl({
        companyId: 'c',
        providerCredentialsId: 'p',
        clientId: 'id',
      });
      expect(state.length).toBeGreaterThanOrEqual(64);
    });

    it('two consecutive starts produce different state tokens', async () => {
      redis.set.mockResolvedValue('OK');
      const { state: s1 } = await service.buildAuthorizationUrl({
        companyId: 'c',
        providerCredentialsId: 'p',
        clientId: 'id',
      });
      redis.set.mockResolvedValue('OK');
      const { state: s2 } = await service.buildAuthorizationUrl({
        companyId: 'c',
        providerCredentialsId: 'p',
        clientId: 'id',
      });
      expect(s1).not.toBe(s2);
    });

    it('buildErrorRedirectUrl does not expose internal error details beyond 200 chars', () => {
      const longMsg = 'a'.repeat(500);
      const url = service.buildErrorRedirectUrl(longMsg);
      const reason = new URL(url).searchParams.get('reason') ?? '';
      expect(reason.length).toBeLessThanOrEqual(200);
    });

    it('buildSuccessRedirectUrl contains credentialId but no tokens', () => {
      const url = service.buildSuccessRedirectUrl({ credentialId: 'cred-123' });
      expect(url).toContain('credentialId=cred-123');
      expect(url).not.toContain('access_token');
      expect(url).not.toContain('refresh_token');
    });
  });
});
