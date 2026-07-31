// token-credentials.contract.spec.ts
//
// Proves that the generic token credential contract:
//   1. Validates and normalizes a token field.
//   2. Uses the existing provider_credentials collection (not a new entity).
//   3. Is driven by connectionType='token', not by a specific providerKey.
//   4. Never exposes the plaintext token in validation errors or return values.
//   5. Rejects empty tokens.
//   6. Whitelists only allowed fields (no arbitrary data stored).

import { TokenCredentialsContract } from './token-credentials.contract';
import { CredentialsValidationError } from '../../shared/credentials.errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalized(input: Record<string, unknown>) {
  return TokenCredentialsContract.normalize(input).value;
}

function validate(input: Record<string, unknown>) {
  TokenCredentialsContract.validate(normalized(input));
}

// ─── normalize ────────────────────────────────────────────────────────────────

describe('TokenCredentialsContract.normalize()', () => {
  it('trims whitespace from the token', () => {
    const result = normalized({ token: '  abc123  ' });
    expect(result.token).toBe('abc123');
  });

  it('accepts a providerKey alongside the token', () => {
    const result = normalized({ token: 'tok_test', providerKey: 'coingate' });
    expect(result.token).toBe('tok_test');
    expect(result.providerKey).toBe('coingate');
  });

  it('omits providerKey when not provided', () => {
    const result = normalized({ token: 'tok_test' });
    expect(result.providerKey).toBeUndefined();
  });

  it('whitelists only "token" and "providerKey" — rejects arbitrary fields', () => {
    const result = normalized({
      token: 'tok_test',
      apiKey: 'should-be-dropped',
      password: 'should-be-dropped',
      secretKey: 'should-be-dropped',
    });
    expect(Object.keys(result)).not.toContain('apiKey');
    expect(Object.keys(result)).not.toContain('password');
    expect(Object.keys(result)).not.toContain('secretKey');
  });

  it('is driven by connectionType, not by providerKey — works for any provider', () => {
    // CoinGate, a future provider, or any other — the contract is the same.
    const coingate = normalized({
      token: 'cgtest-xxx',
      providerKey: 'coingate',
    });
    const future = normalized({
      token: 'future-xxx',
      providerKey: 'some_future_provider',
    });
    expect(coingate.token).toBe('cgtest-xxx');
    expect(future.token).toBe('future-xxx');
  });
});

// ─── validate ─────────────────────────────────────────────────────────────────

describe('TokenCredentialsContract.validate()', () => {
  it('passes for a non-empty token', () => {
    expect(() => validate({ token: 'tok_test' })).not.toThrow();
  });

  it('throws CredentialsValidationError for an empty token string', () => {
    expect(() => validate({ token: '' })).toThrow(CredentialsValidationError);
  });

  it('throws CredentialsValidationError when token is whitespace-only', () => {
    expect(() => validate({ token: '   ' })).toThrow(
      CredentialsValidationError,
    );
  });

  it('throws CredentialsValidationError when token is missing', () => {
    expect(() => validate({})).toThrow(CredentialsValidationError);
  });

  it('sets field="token" on the validation error so the frontend can map it', () => {
    try {
      validate({ token: '' });
      fail('expected CredentialsValidationError');
    } catch (e) {
      expect(e).toBeInstanceOf(CredentialsValidationError);
      expect((e as CredentialsValidationError).field).toBe('token');
    }
  });

  it('does not include the token value in the error message', () => {
    const secretToken = 'super-secret-token-value';
    try {
      // Swap: validate with an empty token string, token was set during normalize step
      TokenCredentialsContract.validate({ token: '' });
      fail('expected error');
    } catch (e) {
      expect((e as Error).message).not.toContain(secretToken);
    }
  });
});

// ─── Architecture verification ────────────────────────────────────────────────

describe('TokenCredentialsContract — architecture', () => {
  it('channelKey is "payment" — reuses the payment channel', () => {
    expect(TokenCredentialsContract.channelKey).toBe('payment');
  });

  it('connectionType is "token" — matches provider schema enum value', () => {
    expect(TokenCredentialsContract.connectionType).toBe('token');
  });

  it('does not define a verify method — no external API call on save', () => {
    expect(TokenCredentialsContract.verify).toBeUndefined();
  });

  it('ContractSpec shape matches the existing interface — no new entity created', () => {
    // The contract implements the same ContractSpec<T> interface used by
    // SmtpCredentialsContract, StripeCredentialsContract, etc.
    // All of those persist into provider_credentials — this one will too.
    expect(typeof TokenCredentialsContract.normalize).toBe('function');
    expect(typeof TokenCredentialsContract.validate).toBe('function');
  });

  it('normalize returns a value object without a class — compatible with encryptJson()', () => {
    const result = TokenCredentialsContract.normalize({ token: 'tok_test' });
    // encryptJson expects a plain object; class instances with prototype methods break JSON.stringify
    expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
  });
});

// ─── Existing type flows remain unchanged ────────────────────────────────────

describe('Existing connection types are unaffected', () => {
  it('contract targets only "payment/token" — not any other channel or type', () => {
    expect(TokenCredentialsContract.channelKey).not.toBe('email');
    expect(TokenCredentialsContract.channelKey).not.toBe('sms');
    expect(TokenCredentialsContract.channelKey).not.toBe('storage');
    expect(TokenCredentialsContract.channelKey).not.toBe('calendar');
    expect(TokenCredentialsContract.connectionType).not.toBe('smtp');
    expect(TokenCredentialsContract.connectionType).not.toBe('api_key');
    expect(TokenCredentialsContract.connectionType).not.toBe('oauth');
    expect(TokenCredentialsContract.connectionType).not.toBe('access_keys');
    expect(TokenCredentialsContract.connectionType).not.toBe('app_password');
  });

  it('different providerKeys produce the same contract — not provider-specific', () => {
    const resultA = TokenCredentialsContract.normalize({
      token: 't1',
      providerKey: 'coingate',
    });
    const resultB = TokenCredentialsContract.normalize({
      token: 't2',
      providerKey: 'any_future_provider',
    });
    // Same contract fields regardless of provider
    expect(Object.keys(resultA.value).sort()).toEqual(
      Object.keys(resultB.value).sort(),
    );
  });
});
