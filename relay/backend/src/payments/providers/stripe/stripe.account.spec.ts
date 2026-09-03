// src/payments/providers/stripe/stripe.account.spec.ts
//
// Unit tests for StripePaymentProvider.getAccount() and verifyConnection().
// The Stripe SDK is fully mocked — no real API calls, no real credentials.

import Stripe from 'stripe';
import { StripePaymentProvider } from './stripe.provider';
import { isAccountProvider } from '../../interfaces/payment-provider.interface';
import { PaymentAccountStatus } from '../../enums/payment-account-status.enum';
import {
  PaymentCredentialsInvalidError,
  PaymentProviderUnavailableError,
} from '../../errors/payment.errors';
import type { PaymentProviderContext } from '../../types/payment.types';

// ─── Stripe SDK mock ──────────────────────────────────────────────────────────

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

const ACCOUNT_ID = '6776e4f1a0c1234567890abc';

const TEST_CONTEXT: PaymentProviderContext = {
  providerKey: 'stripe',
  connectionType: 'api_key',
  credentialsId: ACCOUNT_ID,
  isActive: true,
  credentials: {
    secretKey: 'sk_test_abcdefghij1234567890',
    publishableKey: 'pk_test_abcdefghij1234567890',
    mode: 'test',
  },
};

const LIVE_CONTEXT: PaymentProviderContext = {
  ...TEST_CONTEXT,
  credentials: {
    secretKey: 'sk_live_abcdefghij1234567890',
    publishableKey: 'pk_live_abcdefghij1234567890',
    mode: 'live',
  },
};

function makeStripeAccount(
  overrides: Partial<{
    id: string;
    details_submitted: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    country: string;
    default_currency: string;
    business_profile: { name: string | null } | null;
    email: string | null;
    settings: { dashboard: { display_name: string } } | null;
    requirements: {
      currently_due?: string[];
      past_due?: string[];
      disabled_reason?: string | null;
    } | null;
  }> = {},
): Record<string, unknown> {
  return {
    id: 'acct_test123',
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    country: 'AU',
    default_currency: 'aud',
    business_profile: { name: 'Acme Corp' },
    email: 'admin@acme.com',
    settings: { dashboard: { display_name: 'Acme Dashboard' } },
    requirements: {
      currently_due: [],
      past_due: [],
      disabled_reason: null,
    },
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let provider: StripePaymentProvider;

beforeEach(() => {
  jest.clearAllMocks();
  provider = new StripePaymentProvider();
});

// ─── IPaymentAccountProvider contract ─────────────────────────────────────────

describe('StripePaymentProvider — IPaymentAccountProvider contract', () => {
  it('supportsAccount is true', () => {
    expect(provider.supportsAccount).toBe(true);
  });

  it('isAccountProvider type guard returns true', () => {
    expect(isAccountProvider(provider)).toBe(true);
  });

  it('getAccount is a function', () => {
    expect(typeof provider.getAccount).toBe('function');
  });

  it('verifyConnection is a function', () => {
    expect(typeof provider.verifyConnection).toBe('function');
  });
});

// ─── getAccount — result shape ─────────────────────────────────────────────────

describe('getAccount — result shape', () => {
  it('returns id equal to the credentialsId from context', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.id).toBe(ACCOUNT_ID);
  });

  it('returns providerKey "stripe"', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.providerKey).toBe('stripe');
  });

  it('derives environment "test" from sk_test_ prefix', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.environment).toBe('test');
  });

  it('derives environment "live" from sk_live_ prefix', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(LIVE_CONTEXT);

    expect(account.environment).toBe('live');
  });

  it('returns null environment when secretKey prefix is unrecognized', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const ctxBadKey: PaymentProviderContext = {
      ...TEST_CONTEXT,
      credentials: { secretKey: 'rk_test_unknown', mode: 'test' },
    };
    const account = await provider.getAccount(ctxBadKey);

    expect(account.environment).toBeNull();
  });

  it('connectedAt is always null — enriched by the service layer', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.connectedAt).toBeNull();
  });

  it('verifiedAt is null', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.verifiedAt).toBeNull();
  });

  it('capabilities is an array', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(Array.isArray(account.capabilities)).toBe(true);
    expect(account.capabilities.length).toBeGreaterThan(0);
  });

  it('calls retrieve with null to fetch the current account', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    await provider.getAccount(TEST_CONTEXT);

    expect(mockRetrieve).toHaveBeenCalledWith(null);
  });
});

// ─── getAccount — displayName mapping ─────────────────────────────────────────

describe('getAccount — displayName mapping', () => {
  it('uses business_profile.name when present', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({ business_profile: { name: 'Graphify Pty Ltd' } }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.displayName).toBe('Graphify Pty Ltd');
  });

  it('falls back to settings.dashboard.display_name when business_profile.name is null', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        business_profile: { name: null },
        settings: { dashboard: { display_name: 'Dashboard Name' } },
      }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.displayName).toBe('Dashboard Name');
  });

  it('falls back to email when business_profile is null and settings has no display_name', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        business_profile: null,
        settings: null,
        email: 'owner@example.com',
      }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.displayName).toBe('owner@example.com');
  });

  it('returns null displayName when all sources are absent', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        business_profile: null,
        settings: null,
        email: null,
      }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.displayName).toBeNull();
  });
});

// ─── getAccount — country and defaultCurrency mapping ─────────────────────────

describe('getAccount — country and defaultCurrency mapping', () => {
  it('maps country from account.country', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount({ country: 'AU' }));

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.country).toBe('AU');
  });

  it('returns null country when account.country is absent', async () => {
    const raw = makeStripeAccount();
    delete raw['country'];
    mockRetrieve.mockResolvedValueOnce(raw);

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.country).toBeNull();
  });

  it('maps defaultCurrency from account.default_currency (lowercase)', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({ default_currency: 'aud' }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.defaultCurrency).toBe('aud');
  });

  it('returns null defaultCurrency when account.default_currency is absent', async () => {
    const raw = makeStripeAccount();
    delete raw['default_currency'];
    mockRetrieve.mockResolvedValueOnce(raw);

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.defaultCurrency).toBeNull();
  });
});

// ─── getAccount — status mapping ──────────────────────────────────────────────

describe('getAccount — status mapping', () => {
  it('maps to Active when details_submitted, charges_enabled, payouts_enabled, no currently_due', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {
          currently_due: [],
          past_due: [],
          disabled_reason: null,
        },
      }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.status).toBe(PaymentAccountStatus.Active);
  });

  it('maps to Pending when details_submitted is false', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({ details_submitted: false }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.status).toBe(PaymentAccountStatus.Pending);
  });

  it('maps to Restricted when charges_enabled but currently_due is non-empty', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {
          currently_due: ['individual.verification.document'],
          past_due: [],
          disabled_reason: null,
        },
      }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.status).toBe(PaymentAccountStatus.Restricted);
  });

  it('maps to Restricted when charges_enabled but payouts_enabled is false', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: false,
        requirements: {
          currently_due: [],
          past_due: [],
          disabled_reason: null,
        },
      }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.status).toBe(PaymentAccountStatus.Restricted);
  });

  it('maps to Restricted when disabled_reason is present', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {
          currently_due: [],
          past_due: [],
          disabled_reason: 'listed',
        },
      }),
    );

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account.status).toBe(PaymentAccountStatus.Restricted);
  });
});

// ─── getAccount — capabilities mapping ────────────────────────────────────────

describe('getAccount — capabilities mapping', () => {
  it('Account capability has status "active"', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    const accountCap = account.capabilities.find((c) => c.name === 'account');
    expect(accountCap).toBeDefined();
    expect(accountCap?.status).toBe('active');
  });

  it('all unimplemented capabilities have status "inactive"', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    // Page-level capabilities (dashboard, payments, paymentTesting, gateway)
    // and all implemented technical capabilities are Available;
    // everything else remains Planned → inactive
    const implemented = new Set([
      'dashboard',
      'payments',
      'paymentTesting',
      'gateway',
      'account',
      'balance',
      'paymentMethods',
      'paymentUnits',
      'refunds',
      'refundListing',
      'refundDetail',
      'refundCreation',
      'partialRefunds',
      'refundReasons',
      'payouts',
      'payoutListing',
      'payoutDetail',
      'payoutFiltering',
      'webhooks',
      'webhookEndpointListing',
      'webhookEndpointDetail',
      'webhookEndpointCreation',
      'webhookEndpointUpdate',
      'webhookEndpointDeletion',
      'webhookEventSelection',
      'webhookDeliveryMonitoring',
    ]);
    const unimplemented = account.capabilities.filter(
      (c) => !implemented.has(c.name),
    );
    for (const cap of unimplemented) {
      expect(cap.status).toBe('inactive');
    }
  });

  it('all capabilities have configurable:false', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    for (const cap of account.capabilities) {
      expect(cap.configurable).toBe(false);
    }
  });
});

// ─── getAccount — security ────────────────────────────────────────────────────

describe('getAccount — security', () => {
  it('does not include secretKey in the result', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);
    const json = JSON.stringify(account);

    expect(json).not.toContain('sk_test_');
    expect(json).not.toContain('sk_live_');
  });

  it('does not include raw Stripe account fields', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const account = await provider.getAccount(TEST_CONTEXT);

    expect(account).not.toHaveProperty('charges_enabled');
    expect(account).not.toHaveProperty('payouts_enabled');
    expect(account).not.toHaveProperty('object');
    expect(account).not.toHaveProperty('tos_acceptance');
    expect(account).not.toHaveProperty('type');
  });
});

// ─── getAccount — error mapping ───────────────────────────────────────────────

describe('getAccount — error mapping', () => {
  it('throws PaymentCredentialsInvalidError for StripeAuthenticationError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAuthenticationError({
        message: 'No such api key',
      }),
    );

    await expect(provider.getAccount(TEST_CONTEXT)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });

  it('throws PaymentCredentialsInvalidError for StripePermissionError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripePermissionError({ message: 'Restricted key' }),
    );

    await expect(provider.getAccount(TEST_CONTEXT)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });

  it('throws PaymentCredentialsInvalidError for StripeInvalidRequestError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid parameter',
      }),
    );

    await expect(provider.getAccount(TEST_CONTEXT)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });

  it('throws PaymentProviderUnavailableError for StripeConnectionError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeConnectionError({ message: 'ECONNREFUSED' }),
    );

    await expect(provider.getAccount(TEST_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('throws PaymentProviderUnavailableError for StripeRateLimitError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeRateLimitError({ message: 'Too many requests' }),
    );

    await expect(provider.getAccount(TEST_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('throws PaymentProviderUnavailableError for StripeAPIError (5xx)', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAPIError({ message: 'Internal server error' }),
    );

    await expect(provider.getAccount(TEST_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('throws PaymentProviderUnavailableError for unknown errors', async () => {
    mockRetrieve.mockRejectedValueOnce(new Error('Something unexpected'));

    await expect(provider.getAccount(TEST_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('throws PaymentCredentialsInvalidError when secretKey is missing from credentials', async () => {
    const ctxNoKey: PaymentProviderContext = {
      ...TEST_CONTEXT,
      credentials: { publishableKey: 'pk_test_x', mode: 'test' },
    };

    await expect(provider.getAccount(ctxNoKey)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });
});

// ─── verifyConnection — result shape ──────────────────────────────────────────

describe('verifyConnection — result shape', () => {
  it('returns valid:true on a successful API call', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const result = await provider.verifyConnection(TEST_CONTEXT);

    expect(result.valid).toBe(true);
  });

  it('returns accountId equal to the credentialsId from context', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const result = await provider.verifyConnection(TEST_CONTEXT);

    expect(result.accountId).toBe(ACCOUNT_ID);
  });

  it('returns providerKey "stripe"', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const result = await provider.verifyConnection(TEST_CONTEXT);

    expect(result.providerKey).toBe('stripe');
  });

  it('verifiedAt is a Date instance', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const before = new Date();
    const result = await provider.verifyConnection(TEST_CONTEXT);
    const after = new Date();

    expect(result.verifiedAt).toBeInstanceOf(Date);
    expect(result.verifiedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(result.verifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('includes status mapped from the account', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const result = await provider.verifyConnection(TEST_CONTEXT);

    expect(Object.values(PaymentAccountStatus)).toContain(result.status);
  });

  it('calls retrieve with null', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    await provider.verifyConnection(TEST_CONTEXT);

    expect(mockRetrieve).toHaveBeenCalledWith(null);
  });
});

// ─── verifyConnection — status values ─────────────────────────────────────────

describe('verifyConnection — status values', () => {
  it('returns status Active for a fully operational account', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const result = await provider.verifyConnection(TEST_CONTEXT);

    expect(result.status).toBe(PaymentAccountStatus.Active);
  });

  it('returns status Pending for an account with details_submitted=false', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({ details_submitted: false }),
    );

    const result = await provider.verifyConnection(TEST_CONTEXT);

    expect(result.status).toBe(PaymentAccountStatus.Pending);
  });

  it('returns status Restricted when currently_due is non-empty', async () => {
    mockRetrieve.mockResolvedValueOnce(
      makeStripeAccount({
        requirements: {
          currently_due: ['company.tax_id'],
          past_due: [],
          disabled_reason: null,
        },
      }),
    );

    const result = await provider.verifyConnection(TEST_CONTEXT);

    expect(result.status).toBe(PaymentAccountStatus.Restricted);
  });
});

// ─── verifyConnection — error mapping ─────────────────────────────────────────

describe('verifyConnection — error mapping', () => {
  it('throws PaymentCredentialsInvalidError for StripeAuthenticationError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAuthenticationError({ message: 'bad key' }),
    );

    await expect(provider.verifyConnection(TEST_CONTEXT)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });

  it('throws PaymentProviderUnavailableError for StripeConnectionError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeConnectionError({ message: 'ECONNREFUSED' }),
    );

    await expect(provider.verifyConnection(TEST_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('throws PaymentProviderUnavailableError for StripeAPIError', async () => {
    mockRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeAPIError({ message: 'Internal server error' }),
    );

    await expect(provider.verifyConnection(TEST_CONTEXT)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────

describe('verifyConnection — security', () => {
  it('does not include credential values in the result', async () => {
    mockRetrieve.mockResolvedValueOnce(makeStripeAccount());

    const result = await provider.verifyConnection(TEST_CONTEXT);
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_');
    expect(json).not.toContain('sk_live_');
  });
});
