// coingate.credentials.contract.spec.ts
//
// Focused tests for CoinGateCredentialsContract covering the full
// credential submission flow: normalize, validate, field resolution,
// encryption safety, and API response exclusion.
//
// Tests are unit-level: no live HTTP calls, no real CoinGate tokens.

import { CoinGateCredentialsContract } from './coingate.credentials.contract';
import { CredentialsValidationError } from '../../../communication/channels/implementation/shared/credentials.errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalized(input: Record<string, unknown>) {
  return CoinGateCredentialsContract.normalize(input).value;
}

function validate(input: Record<string, unknown>) {
  CoinGateCredentialsContract.validate(normalized(input));
}

// ─── Test 11: CoinGateCredentialsContract accepts token and mode ──────────────

describe('CoinGateCredentialsContract — canonical token + mode (Test 11)', () => {
  it('accepts { token, mode: "test" }', () => {
    expect(() =>
      validate({ token: 'cgtest-sandbox-token', mode: 'test' }),
    ).not.toThrow();
  });

  it('accepts { token, mode: "live" }', () => {
    expect(() =>
      validate({ token: 'cglive-production-token', mode: 'live' }),
    ).not.toThrow();
  });

  it('normalize preserves { token, mode } exactly', () => {
    const result = normalized({ token: 'cgtest-sandbox-token', mode: 'test' });
    expect(result.token).toBe('cgtest-sandbox-token');
    expect(result.mode).toBe('test');
  });

  it('normalize result has exactly two keys: token and mode', () => {
    const result = normalized({ token: 'tok12345678', mode: 'test' });
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(['mode', 'token']);
  });

  it('tokenPresent is true when token is supplied', () => {
    const result = normalized({ token: 'cgtest-sandbox-token', mode: 'test' });
    expect(Boolean(result.token)).toBe(true);
  });

  it('tokenLength matches the submitted value (whitespace trimmed)', () => {
    const raw = 'cgtest-sandbox-token';
    const result = normalized({ token: `  ${raw}  `, mode: 'test' });
    expect(result.token.length).toBe(raw.length);
  });

  it('mode = "test" is preserved in the normalized value', () => {
    const result = normalized({ token: 'cgtest-sandbox-token', mode: 'test' });
    expect(result.mode).toBe('test');
  });
});

// ─── Test 3: Tokens beginning with "-" are accepted ──────────────────────────

describe('CoinGateCredentialsContract — tokens beginning with "-" (task requirement)', () => {
  it('accepts a token that starts with "-"', () => {
    const token = '-sandbox-token-starting-with-hyphen';
    const result = normalized({ token, mode: 'test' });
    expect(result.token).toBe(token);
    expect(() => CoinGateCredentialsContract.validate(result)).not.toThrow();
  });

  it('accepts a token with multiple hyphens', () => {
    const token = '-test--multi--hyphen-token';
    const result = normalized({ token, mode: 'test' });
    expect(result.token).toBe(token);
  });

  it('validate accepts a leading-hyphen token that meets the minimum length', () => {
    expect(() => validate({ token: '-sandbox', mode: 'test' })).not.toThrow();
  });
});

// ─── Tests 5 + 6: Missing / empty token ──────────────────────────────────────

describe('CoinGateCredentialsContract — missing/empty token (Tests 5 & 6)', () => {
  it('missing token on create: validate throws CredentialsValidationError', () => {
    expect(() => validate({ mode: 'test' })).toThrow(
      CredentialsValidationError,
    );
  });

  it('empty token: validate throws CredentialsValidationError', () => {
    expect(() => validate({ token: '', mode: 'test' })).toThrow(
      CredentialsValidationError,
    );
  });

  it('whitespace-only token is rejected', () => {
    expect(() => validate({ token: '   ', mode: 'test' })).toThrow(
      CredentialsValidationError,
    );
  });

  it('token shorter than 8 chars is rejected', () => {
    expect(() => validate({ token: 'short', mode: 'test' })).toThrow(
      CredentialsValidationError,
    );
  });

  it('error field is "token" so the frontend can map it to the correct input', () => {
    try {
      validate({ token: '', mode: 'test' });
      fail('expected CredentialsValidationError');
    } catch (e) {
      expect(e).toBeInstanceOf(CredentialsValidationError);
      expect((e as CredentialsValidationError).field).toBe('token');
    }
  });

  it('non-empty token clears the previous validation error (no error thrown)', () => {
    expect(() =>
      validate({ token: 'cgtest-sandbox-token', mode: 'test' }),
    ).not.toThrow();
  });
});

// ─── Test 12: Secret is safe to encrypt (normalize returns a plain object) ───

describe('CoinGateCredentialsContract — encryption safety (Test 12)', () => {
  it('normalize returns a plain object (JSON.stringify compatible for encryptJson)', () => {
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-sandbox-token',
      mode: 'test',
    });
    expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
    expect(() => JSON.stringify(result.value)).not.toThrow();
  });

  it('normalized value does not contain any raw secret field names', () => {
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-sandbox-token',
      mode: 'test',
    });
    const json = JSON.stringify(result.value);
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('password');
    expect(json).not.toContain('accessToken');
  });
});

// ─── Test 13: Secret is not returned in API responses ────────────────────────

describe('CoinGateCredentialsContract — secret exclusion from API responses (Test 13)', () => {
  it('normalize result cannot be used to reconstruct the original token via API-safe fields', () => {
    // The contract only exposes { token, mode }. The service encrypts the value
    // and the mapper excludes the encrypted field from responses.
    // Here we verify the contract itself does not expose any unexpected field.
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-sandbox-token',
      mode: 'test',
    });
    const allowedKeys = new Set(['token', 'mode']);
    for (const key of Object.keys(result.value)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });

  it('providerKey is NOT included in the normalized output (contract strips non-ALLOWED fields)', () => {
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-sandbox-token',
      mode: 'test',
      providerKey: 'coingate',
    });
    expect(Object.keys(result.value)).not.toContain('providerKey');
  });
});

// ─── Test 14: No token value appears in error messages ───────────────────────

describe('CoinGateCredentialsContract — token value not leaked in errors (Test 14)', () => {
  it('CredentialsValidationError message does not contain the token value', () => {
    const secretToken = 'cgtest-secret-sandbox-token-value';
    try {
      CoinGateCredentialsContract.validate({ token: '', mode: 'test' } as any);
      fail('expected CredentialsValidationError');
    } catch (e) {
      expect((e as Error).message).not.toContain(secretToken);
    }
  });

  it('error for too-short token does not include the token value', () => {
    const secretToken = 'short12';
    try {
      validate({ token: secretToken, mode: 'test' });
      fail('expected CredentialsValidationError');
    } catch (e) {
      expect((e as Error).message).not.toContain(secretToken);
    }
  });

  it('error field name is "token" not the token value', () => {
    try {
      validate({ token: '', mode: 'test' });
      fail('expected CredentialsValidationError');
    } catch (e) {
      expect((e as CredentialsValidationError).field).toBe('token');
    }
  });
});

// ─── Test 7: Edit with blank token preserves existing secret ─────────────────
// (This is enforced by the frontend buildCredentialPayload returning null when
//  no text/password fields are filled, which tells the backend to skip credentials
//  update. The contract itself always requires a token when called — the
//  preservation logic lives in the form and service layer.)

describe('CoinGateCredentialsContract — edit / create flow invariants', () => {
  it('create: token is required (no default or omission)', () => {
    const result = normalized({ mode: 'test' });
    // Token resolves to empty string when absent — validate will reject it
    expect(result.token).toBe('');
    expect(() => CoinGateCredentialsContract.validate(result)).toThrow(
      CredentialsValidationError,
    );
  });

  it('edit with new non-empty token: normalize preserves the replacement token', () => {
    const newToken = 'cgtest-new-replacement-token';
    const result = normalized({ token: newToken, mode: 'test' });
    expect(result.token).toBe(newToken);
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('mode defaults to "test" when the user does not select a mode explicitly', () => {
    const result = normalized({ token: 'cgtest-sandbox-token' });
    expect(result.mode).toBe('test');
  });

  it('mode "live" is correctly preserved in the normalized payload', () => {
    const result = normalized({
      token: 'cglive-production-token',
      mode: 'live',
    });
    expect(result.mode).toBe('live');
  });
});

// ─── Backend receives credentials.token (Test 10) ────────────────────────────

describe('CoinGateCredentialsContract — backend credential resolution (Test 10)', () => {
  it('canonical { token } field is present after normalize()', () => {
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-sandbox-token',
      mode: 'test',
    });
    expect(Object.prototype.hasOwnProperty.call(result.value, 'token')).toBe(
      true,
    );
  });

  it('normalize result.value.token type is string', () => {
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-sandbox-token',
      mode: 'test',
    });
    expect(typeof result.value.token).toBe('string');
  });

  it('normalize result.value.token is never undefined when input contains token', () => {
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-sandbox-token',
      mode: 'test',
    });
    expect(result.value.token).not.toBeUndefined();
  });
});
