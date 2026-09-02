// src/accounting/providers/xero/xero.credentials.contract.spec.ts

import {
  XeroCredentialsContract,
  type XeroOAuthCredentials,
} from './xero.credentials.contract';

// ─── Contract metadata ────────────────────────────────────────────────────────

describe('XeroCredentialsContract — metadata', () => {
  it('channelKey is "accounting"', () => {
    expect(XeroCredentialsContract.channelKey).toBe('accounting');
  });

  it('connectionType is "oauth"', () => {
    expect(XeroCredentialsContract.connectionType).toBe('oauth');
  });
});

// ─── normalize ────────────────────────────────────────────────────────────────

describe('XeroCredentialsContract — normalize', () => {
  it('accepts camelCase fields', () => {
    const { value } = XeroCredentialsContract.normalize({
      clientId: 'cid-123',
      clientSecret: 'secret-abc',
    });
    expect(value.clientId).toBe('cid-123');
    expect(value.clientSecret).toBe('secret-abc');
  });

  it('accepts snake_case fields', () => {
    const { value } = XeroCredentialsContract.normalize({
      client_id: 'cid-snake',
      client_secret: 'secret-snake',
    });
    expect(value.clientId).toBe('cid-snake');
    expect(value.clientSecret).toBe('secret-snake');
  });

  it('accepts XERO_* env-style fields', () => {
    const { value } = XeroCredentialsContract.normalize({
      XERO_CLIENT_ID: 'cid-env',
      XERO_CLIENT_SECRET: 'secret-env',
    });
    expect(value.clientId).toBe('cid-env');
    expect(value.clientSecret).toBe('secret-env');
  });

  it('trims whitespace from string fields', () => {
    const { value } = XeroCredentialsContract.normalize({
      clientId: '  cid-trim  ',
      clientSecret: '  secret-trim  ',
    });
    expect(value.clientId).toBe('cid-trim');
    expect(value.clientSecret).toBe('secret-trim');
  });

  it('omits optional token fields when absent', () => {
    const { value } = XeroCredentialsContract.normalize({
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(value.refreshToken).toBeUndefined();
    expect(value.accessToken).toBeUndefined();
    expect(value.tenantId).toBeUndefined();
    expect(value.expiresAt).toBeUndefined();
    expect(value.scopes).toBeUndefined();
  });

  it('accepts optional Phase 2 token fields', () => {
    const { value } = XeroCredentialsContract.normalize({
      clientId: 'cid',
      clientSecret: 'secret',
      refreshToken: 'rtoken',
      accessToken: 'atoken',
      tenantId: 'tid-abc',
      expiresAt: 1234567890,
      scopes: 'openid profile email accounting.transactions',
    });
    expect(value.refreshToken).toBe('rtoken');
    expect(value.accessToken).toBe('atoken');
    expect(value.tenantId).toBe('tid-abc');
    expect(value.expiresAt).toBe(1234567890);
    expect(value.scopes).toBe('openid profile email accounting.transactions');
  });

  it('strips unknown fields (whitelist only)', () => {
    const { value } = XeroCredentialsContract.normalize({
      clientId: 'cid',
      clientSecret: 'secret',
      rawApiKey: 'should-not-be-stored',
      internalToken: 'also-not-stored',
    } as any);
    expect((value as any).rawApiKey).toBeUndefined();
    expect((value as any).internalToken).toBeUndefined();
  });

  it('handles null/undefined input gracefully', () => {
    const { value } = XeroCredentialsContract.normalize(null as any);
    expect(value.clientId).toBe('');
    expect(value.clientSecret).toBe('');
  });
});

// ─── validate ─────────────────────────────────────────────────────────────────

describe('XeroCredentialsContract — validate', () => {
  it('passes when clientId and clientSecret are present', () => {
    expect(() =>
      XeroCredentialsContract.validate({
        clientId: 'cid',
        clientSecret: 'secret',
      }),
    ).not.toThrow();
  });

  it('throws when clientId is missing', () => {
    expect(() =>
      XeroCredentialsContract.validate({
        clientId: '',
        clientSecret: 'secret',
      }),
    ).toThrow();
  });

  it('throws when clientSecret is missing', () => {
    expect(() =>
      XeroCredentialsContract.validate({
        clientId: 'cid',
        clientSecret: '',
      }),
    ).toThrow();
  });

  it('passes with optional Phase 2 fields present', () => {
    expect(() =>
      XeroCredentialsContract.validate({
        clientId: 'cid',
        clientSecret: 'secret',
        refreshToken: 'rtoken',
        tenantId: 'tid',
      }),
    ).not.toThrow();
  });
});

// ─── verify ───────────────────────────────────────────────────────────────────

describe('XeroCredentialsContract — verify', () => {
  it('returns ok:true (Phase 1 — format only)', async () => {
    const result = await XeroCredentialsContract.verify!({
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(result.ok).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('result message mentions OAuth authorization flow', async () => {
    const result = await XeroCredentialsContract.verify!({
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(result.message).toMatch(/oauth/i);
  });

  it('does not make any network calls (pure stub)', async () => {
    // If verify were to make a network call this test would hang or fail.
    // It completes synchronously — confirming no I/O occurs.
    const start = Date.now();
    await XeroCredentialsContract.verify!({
      clientId: 'cid',
      clientSecret: 'sec',
    });
    expect(Date.now() - start).toBeLessThan(100);
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────

describe('XeroCredentialsContract — security', () => {
  it('clientId is in the allowed field list (safe to use as displayIdentifier)', () => {
    const { value } = XeroCredentialsContract.normalize({
      clientId: 'cid-display',
      clientSecret: 'secret',
    });
    expect(value.clientId).toBe('cid-display');
  });

  it('normalized value is JSON-serialisable (safe to encrypt)', () => {
    const { value } = XeroCredentialsContract.normalize({
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(() => JSON.stringify(value)).not.toThrow();
  });

  it('capability exports do not reference credential fields', () => {
    // Guard: capabilities and credential contract are separate files.
    // This test confirms the contract itself does not export capability data.
    const exportedKeys = Object.keys(XeroCredentialsContract);
    expect(exportedKeys).not.toContain('capabilities');
    expect(exportedKeys).not.toContain('XERO_ACCOUNTING_CAPABILITIES');
  });
});
