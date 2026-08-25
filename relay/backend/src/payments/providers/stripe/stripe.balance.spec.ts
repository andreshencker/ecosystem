// src/payments/providers/stripe/stripe.balance.spec.ts
//
// Unit tests for StripePaymentProvider.getBalance().
// The Stripe SDK is fully mocked — no real API calls, no real credentials.

import Stripe from 'stripe';
import { StripePaymentProvider } from './stripe.provider';
import { isBalanceProvider } from '../../interfaces/payment-provider.interface';
import {
  PaymentCredentialsInvalidError,
  PaymentProviderUnavailableError,
} from '../../errors/payment.errors';
import type { PaymentProviderContext } from '../../types/payment.types';

// ─── Stripe SDK mock ──────────────────────────────────────────────────────────

const mockBalanceRetrieve = jest.fn();
const mockAccountRetrieve = jest.fn();

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
    StripeConnectionError: class StripeConnectionError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripeConnectionError');
        this.name = 'StripeConnectionError';
      }
    },
    StripeRateLimitError: class StripeRateLimitError extends Error {
      constructor(raw?: { message?: string }) {
        super(raw?.message ?? 'StripeRateLimitError');
        this.name = 'StripeRateLimitError';
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
      accounts: { retrieve: mockAccountRetrieve },
      balance: { retrieve: mockBalanceRetrieve },
    })),
    { errors: StripeErrors },
  );
  return { __esModule: true, default: MockStripe };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_CONTEXT: PaymentProviderContext = {
  providerKey: 'stripe',
  connectionType: 'api_key',
  credentialsId: 'cred-123',
  isActive: true,
  credentials: {
    secretKey: 'sk_test_abcdefghij1234567890',
    publishableKey: 'pk_test_abcdefghij1234567890',
    mode: 'test',
  },
};

const MOCK_BALANCE = {
  object: 'balance',
  livemode: false,
  available: [
    { amount: 10000, currency: 'aud', source_types: { card: 10000 } },
    {
      amount: 5000,
      currency: 'usd',
      source_types: { card: 3000, bank_account: 2000 },
    },
  ],
  pending: [{ amount: 2000, currency: 'aud', source_types: { card: 2000 } }],
  connect_reserved: [],
};

// ─── Setup ────────────────────────────────────────────────────────────────────

let provider: StripePaymentProvider;

beforeEach(() => {
  jest.clearAllMocks();
  provider = new StripePaymentProvider();
});

// ─── Provider contract ────────────────────────────────────────────────────────

describe('StripePaymentProvider — IPaymentBalanceProvider contract', () => {
  it('supportsBalance is true', () => {
    expect(provider.supportsBalance).toBe(true);
  });

  it('isBalanceProvider type guard returns true', () => {
    expect(isBalanceProvider(provider)).toBe(true);
  });

  it('getBalance is a function', () => {
    expect(typeof provider.getBalance).toBe('function');
  });

  it('does not hold a Stripe client in instance state', () => {
    expect(Reflect.get(provider, '_balance')).toBeUndefined();
    expect(Reflect.get(provider, 'stripe')).toBeUndefined();
    expect(Reflect.get(provider, 'client')).toBeUndefined();
  });
});

// ─── Successful balance retrieval ─────────────────────────────────────────────

describe('getBalance — success', () => {
  it('returns a PaymentBalance with correct accountId', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.accountId).toBe('cred-123');
  });

  it('retrievedAt is a Date', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.retrievedAt).toBeInstanceOf(Date);
  });

  it('maps available balance lines correctly', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.available).toContainEqual({
      amountMinor: 10000,
      currency: 'aud',
      sourceType: 'card',
    });
  });

  it('expands source_types into separate balance lines', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);

    const usdLines = result.available.filter((l) => l.currency === 'usd');
    expect(usdLines).toHaveLength(2);
    expect(usdLines).toContainEqual({
      amountMinor: 3000,
      currency: 'usd',
      sourceType: 'card',
    });
    expect(usdLines).toContainEqual({
      amountMinor: 2000,
      currency: 'usd',
      sourceType: 'bank_transfer',
    });
  });

  it('maps pending balance lines correctly', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.pending).toContainEqual({
      amountMinor: 2000,
      currency: 'aud',
      sourceType: 'card',
    });
  });

  it('returns empty reserved when connect_reserved is empty', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.reserved).toEqual([]);
  });

  it('maps connect_reserved into reserved lines', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce({
      ...MOCK_BALANCE,
      connect_reserved: [{ amount: 500, currency: 'aud' }],
    });

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.reserved).toEqual([
      { amountMinor: 500, currency: 'aud', sourceType: 'other' },
    ]);
  });

  it('preserves integer minor units without modification', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce({
      ...MOCK_BALANCE,
      available: [{ amount: 999999, currency: 'jpy' }],
      pending: [],
    });

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.available[0].amountMinor).toBe(999999);
    expect(Number.isInteger(result.available[0].amountMinor)).toBe(true);
  });

  it('preserves lowercase currency codes', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce({
      ...MOCK_BALANCE,
      available: [{ amount: 100, currency: 'usd' }],
      pending: [],
    });

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.available[0].currency).toBe('usd');
  });

  it('maps unknown source type to "other"', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce({
      ...MOCK_BALANCE,
      available: [{ amount: 500, currency: 'aud', source_types: { fpx: 500 } }],
      pending: [],
    });

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.available[0].sourceType).toBe('other');
  });

  it('handles balance line with no source_types as "other"', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce({
      ...MOCK_BALANCE,
      available: [{ amount: 1000, currency: 'eur' }],
      pending: [],
    });

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result.available[0]).toEqual({
      amountMinor: 1000,
      currency: 'eur',
      sourceType: 'other',
    });
  });

  it('handles multiple currencies in available', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce({
      ...MOCK_BALANCE,
      available: [
        { amount: 1000, currency: 'aud' },
        { amount: 2000, currency: 'usd' },
        { amount: 3000, currency: 'eur' },
      ],
      pending: [],
    });

    const result = await provider.getBalance(VALID_CONTEXT);

    const currencies = result.available.map((l) => l.currency);
    expect(currencies).toContain('aud');
    expect(currencies).toContain('usd');
    expect(currencies).toContain('eur');
  });

  it('Stripe client is created per call, not shared across requests', async () => {
    mockBalanceRetrieve.mockResolvedValue(MOCK_BALANCE);

    await provider.getBalance(VALID_CONTEXT);
    await provider.getBalance(VALID_CONTEXT);

    // Each call instantiates a new Stripe client (MockStripe constructor called twice)
    const MockStripeConstructor = Stripe as unknown as jest.Mock;
    expect(MockStripeConstructor).toHaveBeenCalledTimes(2);
  });
});

// ─── Security — no secrets in output ─────────────────────────────────────────

describe('getBalance — security', () => {
  it('never includes secretKey in the returned balance', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_');
    expect(json).not.toContain(VALID_CONTEXT.credentials['secretKey']);
  });

  it('does not include Stripe raw balance object in the result', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce(MOCK_BALANCE);

    const result = await provider.getBalance(VALID_CONTEXT);

    expect(result).not.toHaveProperty('object');
    expect(result).not.toHaveProperty('livemode');
  });
});

// ─── Error mapping ────────────────────────────────────────────────────────────

describe('getBalance — Stripe error mapping', () => {
  it('maps StripeAuthenticationError to PaymentCredentialsInvalidError', async () => {
    mockBalanceRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAuthenticationError({
        message: 'No such api key',
      }),
    );

    await expect(provider.getBalance(VALID_CONTEXT)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });

  it('maps StripePermissionError to PaymentCredentialsInvalidError', async () => {
    mockBalanceRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripePermissionError({ message: 'Restricted key' }),
    );

    await expect(provider.getBalance(VALID_CONTEXT)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });

  it('maps StripeConnectionError to PaymentProviderUnavailableError', async () => {
    mockBalanceRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeConnectionError({ message: 'ECONNREFUSED' }),
    );

    await expect(provider.getBalance(VALID_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('maps StripeRateLimitError to PaymentProviderUnavailableError', async () => {
    mockBalanceRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeRateLimitError({ message: 'Too many requests' }),
    );

    await expect(provider.getBalance(VALID_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('maps StripeAPIError to PaymentProviderUnavailableError', async () => {
    mockBalanceRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAPIError({
        message: '500 Internal server error',
      }),
    );

    await expect(provider.getBalance(VALID_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('raw Stripe error message is not re-thrown as-is', async () => {
    const sensitiveMsg = 'sk_test_SUPER_SECRET exposed in error';
    mockBalanceRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAuthenticationError({ message: sensitiveMsg }),
    );

    let caughtError: Error | undefined;
    try {
      await provider.getBalance(VALID_CONTEXT);
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).not.toContain('sk_test_SUPER_SECRET');
  });
});
