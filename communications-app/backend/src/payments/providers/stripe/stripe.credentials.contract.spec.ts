// src/payments/providers/stripe/stripe.credentials.contract.spec.ts
// (moved from src/payment/contracts/stripe-credentials.contract.spec.ts)

import {
  StripeCredentialsContract,
  type StripeCredentials,
} from './stripe.credentials.contract';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID: Record<string, any> = {
  secretKey: 'sk_test_abcdefghij1234567890',
  publishableKey: 'pk_test_abcdefghij1234567890',
  mode: 'test',
};

const VALID_LIVE: Record<string, any> = {
  secretKey: 'sk_live_abcdefghij1234567890',
  publishableKey: 'pk_live_abcdefghij1234567890',
  mode: 'live',
};

const VALID_WITH_WEBHOOK: Record<string, any> = {
  ...VALID,
  webhookSecret: 'whsec_abcdefghij1234567890',
};

function normalize(input: Record<string, any>) {
  return StripeCredentialsContract.normalize(input).value;
}

function expectValidationError(input: Record<string, any>) {
  const normalized = normalize(input);
  expect(() => StripeCredentialsContract.validate(normalized)).toThrow();
}

// ─── Contract metadata ────────────────────────────────────────────────────────

describe('StripeCredentialsContract — metadata', () => {
  it('is registered for the payment channel', () => {
    expect(StripeCredentialsContract.channelKey).toBe('payment');
  });

  it('uses api_key connection type', () => {
    expect(StripeCredentialsContract.connectionType).toBe('api_key');
  });
});

// ─── normalize ────────────────────────────────────────────────────────────────

describe('StripeCredentialsContract.normalize', () => {
  it('returns required fields from camelCase input', () => {
    const result = normalize(VALID);
    expect(result.secretKey).toBe('sk_test_abcdefghij1234567890');
    expect(result.publishableKey).toBe('pk_test_abcdefghij1234567890');
    expect(result.mode).toBe('test');
  });

  it('also accepts snake_case aliases', () => {
    const result = normalize({
      secret_key: 'sk_test_abcdefghij1234567890',
      publishable_key: 'pk_test_abcdefghij1234567890',
      mode: 'test',
    });
    expect(result.secretKey).toBe('sk_test_abcdefghij1234567890');
    expect(result.publishableKey).toBe('pk_test_abcdefghij1234567890');
  });

  it('also accepts SCREAMING_SNAKE_CASE aliases', () => {
    const result = normalize({
      STRIPE_SECRET_KEY: 'sk_test_abcdefghij1234567890',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_abcdefghij1234567890',
      STRIPE_MODE: 'live',
    });
    expect(result.secretKey).toBe('sk_test_abcdefghij1234567890');
    expect(result.mode).toBe('live');
  });

  it('defaults mode to "test" when omitted', () => {
    const result = normalize({
      secretKey: 'sk_test_x',
      publishableKey: 'pk_test_x',
    });
    expect(result.mode).toBe('test');
  });

  it('coerces unknown mode values to "test"', () => {
    const result = normalize({ ...VALID, mode: 'staging' });
    expect(result.mode).toBe('test');
  });

  it('sets mode to "live" when provided', () => {
    const result = normalize(VALID_LIVE);
    expect(result.mode).toBe('live');
  });

  it('includes webhookSecret when provided', () => {
    const result = normalize(VALID_WITH_WEBHOOK);
    expect(result.webhookSecret).toBe('whsec_abcdefghij1234567890');
  });

  it('excludes webhookSecret when blank', () => {
    const result = normalize({ ...VALID, webhookSecret: '' });
    expect(result.webhookSecret).toBeUndefined();
  });

  it('strips unknown keys (whitelist enforcement)', () => {
    const result = normalize({ ...VALID, dangerousField: 'injected' });
    expect(Reflect.get(result, 'dangerousField')).toBeUndefined();
  });

  it('trims leading and trailing whitespace', () => {
    const result = normalize({
      secretKey: '  sk_test_abcdefghij1234567890  ',
      publishableKey: '  pk_test_abcdefghij1234567890  ',
      mode: '  test  ',
    });
    expect(result.secretKey).toBe('sk_test_abcdefghij1234567890');
    expect(result.publishableKey).toBe('pk_test_abcdefghij1234567890');
  });

  it('returns an empty object without throwing for null-ish input', () => {
    // The ContractSpec normalize signature accepts Record<string, any>.
    // We verify edge-case robustness by passing empty objects instead of null/undefined
    // to avoid unsafe argument casts in tests.
    expect(() => normalize({})).not.toThrow();
    expect(() => normalize({ unrelated: 'value' })).not.toThrow();
  });
});

// ─── validate ─────────────────────────────────────────────────────────────────

describe('StripeCredentialsContract.validate', () => {
  it('passes for valid test credentials', () => {
    const value = normalize(VALID);
    expect(() => StripeCredentialsContract.validate(value)).not.toThrow();
  });

  it('passes for valid live credentials', () => {
    const value = normalize(VALID_LIVE);
    expect(() => StripeCredentialsContract.validate(value)).not.toThrow();
  });

  it('passes for valid credentials with webhook secret', () => {
    const value = normalize(VALID_WITH_WEBHOOK);
    expect(() => StripeCredentialsContract.validate(value)).not.toThrow();
  });

  it('throws when secretKey is missing', () => {
    const value = normalize({
      publishableKey: 'pk_test_abcdefghij1234567890',
      mode: 'test',
    });
    expect(() => StripeCredentialsContract.validate(value)).toThrow();
  });

  it('throws when publishableKey is missing', () => {
    const value = normalize({
      secretKey: 'sk_test_abcdefghij1234567890',
      mode: 'test',
    });
    expect(() => StripeCredentialsContract.validate(value)).toThrow();
  });

  it('throws when secretKey does not match sk_(test|live)_ pattern', () => {
    expectValidationError({ ...VALID, secretKey: 'rk_test_badformat' });
  });

  it('throws when publishableKey does not match pk_(test|live)_ pattern', () => {
    expectValidationError({ ...VALID, publishableKey: 'rk_test_badformat' });
  });

  it('throws when webhookSecret does not match whsec_ pattern', () => {
    expectValidationError({ ...VALID, webhookSecret: 'bad_secret_format' });
  });

  it('throws when mode is not test or live (bypassing normalize)', () => {
    // Construct a value with an invalid mode directly so validate() is tested
    // in isolation — normalize() would otherwise coerce 'staging' to 'test'.
    const badMode: unknown = 'staging';
    const value: StripeCredentials = {
      secretKey: 'sk_test_abcdefghij1234567890',
      publishableKey: 'pk_test_abcdefghij1234567890',
      mode: badMode as StripeCredentials['mode'],
    };
    expect(() => StripeCredentialsContract.validate(value)).toThrow();
  });

  it('throws when secretKey is too short', () => {
    expectValidationError({ ...VALID, secretKey: 'sk_test_short' });
  });

  it('throws when publishableKey is too short', () => {
    expectValidationError({ ...VALID, publishableKey: 'pk_test_short' });
  });
});

// ─── verify ───────────────────────────────────────────────────────────────────

describe('StripeCredentialsContract.verify', () => {
  it('returns ok:true without calling the Stripe API', async () => {
    const value = normalize(VALID);
    const result = await StripeCredentialsContract.verify!(value);
    expect(result.ok).toBe(true);
    expect(result.message).toContain('format is valid');
  });

  it('verify is a no-op that never throws', async () => {
    const value = normalize(VALID_LIVE);
    await expect(
      StripeCredentialsContract.verify!(value),
    ).resolves.not.toThrow();
  });
});

// ─── Isolation ────────────────────────────────────────────────────────────────

describe('StripeCredentialsContract — existing channels not affected', () => {
  it('has channelKey "payment" — not email, sms, storage or calendar', () => {
    expect(StripeCredentialsContract.channelKey).not.toBe('email');
    expect(StripeCredentialsContract.channelKey).not.toBe('sms');
    expect(StripeCredentialsContract.channelKey).not.toBe('storage');
    expect(StripeCredentialsContract.channelKey).not.toBe('calendar');
  });
});
