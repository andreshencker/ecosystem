// src/payments/providers/stripe/stripe.connection.spec.ts
//
// Unit tests for StripePaymentProvider.validateConnection().
// The Stripe SDK is fully mocked — no real API calls, no real credentials.

import Stripe from 'stripe';
import { StripePaymentProvider } from './stripe.provider';
import { isConnectionProvider } from '../../interfaces/payment-provider.interface';

// ─── Stripe SDK mock ──────────────────────────────────────────────────────────
// Replaces the entire 'stripe' module.
// Error class constructors accept { message? } to match StripeRawError
// (all StripeRawError fields are optional, so {} is always valid).

const mockRetrieve = jest.fn();

jest.mock('stripe', () => {
  const StripeErrors = {
    StripeAuthenticationError: class StripeAuthenticationError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripeAuthenticationError');
        this.name = 'StripeAuthenticationError';
      }
    },
    StripePermissionError: class StripePermissionError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripePermissionError');
        this.name = 'StripePermissionError';
      }
    },
    StripeRateLimitError: class StripeRateLimitError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripeRateLimitError');
        this.name = 'StripeRateLimitError';
      }
    },
    StripeConnectionError: class StripeConnectionError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripeConnectionError');
        this.name = 'StripeConnectionError';
      }
    },
    StripeAPIError: class StripeAPIError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripeAPIError');
        this.name = 'StripeAPIError';
      }
    },
    StripeInvalidRequestError: class StripeInvalidRequestError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripeInvalidRequestError');
        this.name = 'StripeInvalidRequestError';
      }
    },
  };

  const MockStripe = Object.assign(
    jest.fn().mockImplementation(() => ({
      accounts: { retrieve: mockRetrieve },
    })),
    { errors: StripeErrors },
  );
  return { __esModule: true, default: MockStripe };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_TEST_CREDS: Record<string, unknown> = {
  secretKey: 'sk_test_abcdefghij1234567890',
  publishableKey: 'pk_test_abcdefghij1234567890',
  mode: 'test',
};

const VALID_LIVE_CREDS: Record<string, unknown> = {
  secretKey: 'sk_live_abcdefghij1234567890',
  publishableKey: 'pk_live_abcdefghij1234567890',
  mode: 'live',
};

const MOCK_ACCOUNT = {
  id: 'acct_test123',
  object: 'account',
  business_profile: { name: 'Graphifly Pty Ltd' },
  email: 'admin@graphifly.com',
  country: 'AU',
  default_currency: 'aud',
};

// ─── Setup ────────────────────────────────────────────────────────────────────

let provider: StripePaymentProvider;

beforeEach(() => {
  jest.clearAllMocks();
  provider = new StripePaymentProvider();
});

// ─── Provider contract ────────────────────────────────────────────────────────

describe('StripePaymentProvider — IPaymentConnectionProvider contract', () => {
  it('supportsConnection is true', () => {
    expect(provider.supportsConnection).toBe(true);
  });

  it('isConnectionProvider type guard returns true', () => {
    expect(isConnectionProvider(provider)).toBe(true);
  });

  it('validateConnection is a function', () => {
    expect(typeof provider.validateConnection).toBe('function');
  });
});

// ─── Result shape ─────────────────────────────────────────────────────────────

describe('validateConnection — result shape', () => {
  it('result always contains connected, providerKey, and checkedAt', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result).toHaveProperty('connected');
    expect(result).toHaveProperty('providerKey');
    expect(result).toHaveProperty('checkedAt');
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it('providerKey in result is "stripe"', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.providerKey).toBe('stripe');
  });

  it('Stripe-specific data is nested inside metadata, not at top level', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    // Stripe fields must not be promoted to top-level result fields.
    expect(result).not.toHaveProperty('environment');
    expect(result).not.toHaveProperty('accountIdentifier');
    expect(result).not.toHaveProperty('displayName');
    expect(result).not.toHaveProperty('country');
    expect(result).not.toHaveProperty('defaultCurrency');

    // They must be available inside metadata.
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.['environment']).toBe('test');
    expect(result.metadata?.['accountIdentifier']).toBe('acct_test123');
  });
});

// ─── Credential validation (before SDK call) ──────────────────────────────────

describe('validateConnection — credential validation', () => {
  it('returns connected:false for missing secretKey without calling Stripe', async () => {
    const result = await provider.validateConnection({
      publishableKey: 'pk_test_abc',
      mode: 'test',
    });

    expect(result.connected).toBe(false);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it('returns connected:false for malformed secretKey without calling Stripe', async () => {
    const result = await provider.validateConnection({
      secretKey: 'bad_key',
      publishableKey: 'pk_test_abcdefghij1234567890',
      mode: 'test',
    });

    expect(result.connected).toBe(false);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it('returns connected:false for unrecognized key prefix', async () => {
    const result = await provider.validateConnection({
      secretKey: 'rk_test_abcdefghij1234567890',
      publishableKey: 'pk_test_abcdefghij1234567890',
      mode: 'test',
    });

    expect(result.connected).toBe(false);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });
});

// ─── Mode / key-prefix mismatch ───────────────────────────────────────────────

describe('validateConnection — mode mismatch', () => {
  it('returns connected:false when mode is "live" but key is sk_test_', async () => {
    const result = await provider.validateConnection({
      secretKey: 'sk_test_abcdefghij1234567890',
      publishableKey: 'pk_live_abcdefghij1234567890',
      mode: 'live',
    });

    expect(result.connected).toBe(false);
    expect(result.metadata?.['environment']).toBe('test');
    expect(result.message).toMatch(/mismatch/i);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it('returns connected:false when mode is "test" but key is sk_live_', async () => {
    const result = await provider.validateConnection({
      secretKey: 'sk_live_abcdefghij1234567890',
      publishableKey: 'pk_test_abcdefghij1234567890',
      mode: 'test',
    });

    expect(result.connected).toBe(false);
    expect(result.metadata?.['environment']).toBe('live');
    expect(result.message).toMatch(/mismatch/i);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });
});

// ─── Successful connection ────────────────────────────────────────────────────

describe('validateConnection — success', () => {
  it('returns connected:true with metadata for valid test credentials', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(true);
    expect(result.providerKey).toBe('stripe');
    expect(result.metadata?.['environment']).toBe('test');
    expect(result.metadata?.['accountIdentifier']).toBe('acct_test123');
    expect(result.metadata?.['displayName']).toBe('Graphifly Pty Ltd');
    expect(result.metadata?.['country']).toBe('AU');
    expect(result.metadata?.['defaultCurrency']).toBe('aud');
    expect(result.message).toContain('validated successfully');
  });

  it('returns connected:true for valid live credentials', async () => {
    mockRetrieve.mockResolvedValueOnce({ ...MOCK_ACCOUNT, id: 'acct_live123' });

    const result = await provider.validateConnection(VALID_LIVE_CREDS);

    expect(result.connected).toBe(true);
    expect(result.metadata?.['environment']).toBe('live');
    expect(result.metadata?.['accountIdentifier']).toBe('acct_live123');
  });

  it('uses email as displayName when business_profile.name is missing', async () => {
    mockRetrieve.mockResolvedValueOnce({
      ...MOCK_ACCOUNT,
      business_profile: null,
      email: 'admin@example.com',
    });

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(true);
    expect(result.metadata?.['displayName']).toBe('admin@example.com');
  });

  it('omits displayName from metadata when neither business_profile.name nor email exists', async () => {
    mockRetrieve.mockResolvedValueOnce({
      ...MOCK_ACCOUNT,
      business_profile: null,
      email: null,
    });

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(true);
    expect(result.metadata?.['displayName']).toBeUndefined();
  });

  it('calls retrieve with null to fetch the current account', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    await provider.validateConnection(VALID_TEST_CREDS);

    expect(mockRetrieve).toHaveBeenCalledWith(null);
  });
});

// ─── Stripe error mapping ─────────────────────────────────────────────────────

describe('validateConnection — Stripe error mapping', () => {
  it('maps StripeAuthenticationError to connected:false', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAuthenticationError({
        message: 'No such api key',
      }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(false);
    expect(result.message).toMatch(/authentication failed|secret key/i);
  });

  it('maps StripePermissionError to connected:false', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripePermissionError({ message: 'Restricted key' }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(false);
    expect(result.message).toMatch(/permission/i);
  });

  it('maps StripeRateLimitError to connected:false', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeRateLimitError({ message: 'Too many requests' }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(false);
    expect(result.message).toMatch(/rate limit/i);
  });

  it('maps StripeConnectionError to connected:false with network message', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeConnectionError({ message: 'ECONNREFUSED' }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(false);
    expect(result.message).toMatch(/reach Stripe|network/i);
  });

  it('maps StripeAPIError (5xx) to connected:false with unavailable message', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAPIError({ message: 'Internal server error' }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(false);
    expect(result.message).toMatch(/server error|unavailable/i);
  });

  it('maps StripeInvalidRequestError to connected:false', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid parameter',
      }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(false);
    expect(result.message).toMatch(/invalid request|malformed/i);
  });

  it('maps unknown errors to connected:false with generic message', async () => {
    mockRetrieve.mockRejectedValueOnce(new Error('Something unexpected'));

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.connected).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('all error results still contain providerKey and checkedAt', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAuthenticationError({ message: 'bad key' }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    expect(result.providerKey).toBe('stripe');
    expect(result.checkedAt).toBeInstanceOf(Date);
  });
});

// ─── Security — no secrets in output ─────────────────────────────────────────

describe('validateConnection — security', () => {
  it('never includes secretKey in a successful response', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const result = await provider.validateConnection(VALID_TEST_CREDS);
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_');
    expect(json).not.toContain(String(VALID_TEST_CREDS['secretKey']));
  });

  it('never forwards the raw Stripe error message (which may contain key fragments)', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAuthenticationError({
        message: 'Invalid API key: sk_test_abcdefghij1234567890',
      }),
    );

    const result = await provider.validateConnection(VALID_TEST_CREDS);
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_abcdefghij1234567890');
  });

  it('never includes publishableKey in the response', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const result = await provider.validateConnection(VALID_TEST_CREDS);
    const json = JSON.stringify(result);

    expect(json).not.toContain('pk_test_');
  });

  it('never includes webhookSecret in the response', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const creds = {
      ...VALID_TEST_CREDS,
      webhookSecret: 'whsec_abcdefghij1234567890',
    };
    const result = await provider.validateConnection(creds);
    const json = JSON.stringify(result);

    expect(json).not.toContain('whsec_');
  });

  it('does not expose raw Stripe Account object shape in the result', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    const result = await provider.validateConnection(VALID_TEST_CREDS);

    // Top-level result must not carry Stripe Account fields.
    expect(result).not.toHaveProperty('object'); // Stripe.Account.object
    expect(result).not.toHaveProperty('capabilities'); // Stripe.Account.capabilities
    expect(result).not.toHaveProperty('settings'); // Stripe.Account.settings
    // Metadata must not echo back Stripe objects.
    const meta = result.metadata ?? {};
    expect(meta).not.toHaveProperty('object');
    expect(meta).not.toHaveProperty('capabilities');
  });

  it('Stripe SDK types do not appear in the common PaymentProviderConnectionResult shape', () => {
    // This is a compile-time guarantee enforced by the type definition, verified here
    // by inspecting the actual result keys returned by the provider.
    mockRetrieve.mockResolvedValueOnce(MOCK_ACCOUNT);

    // The keys of a successful result must only be from the common contract.
    const expectedTopLevelKeys = new Set([
      'connected',
      'providerKey',
      'checkedAt',
      'message',
      'metadata',
    ]);

    return provider.validateConnection(VALID_TEST_CREDS).then((result) => {
      for (const key of Object.keys(result)) {
        expect(expectedTopLevelKeys.has(key)).toBe(true);
      }
    });
  });
});
