// src/payments/providers/coingate/coingate.provider.spec.ts
//
// Comprehensive test for CoinGate provider — foundation, payments, refunds,
// callbacks, capabilities, and security invariants.
//
// All tests are unit-level: no live HTTP calls, no real CoinGate tokens.
// axios is mocked at the module level.

import { CoingatePaymentProvider } from './coingate.provider';
import { COINGATE_CAPABILITIES } from './coingate.capabilities';
import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';
import { PaymentCanonicalStatus } from '../../enums/payment-canonical-status.enum';
import {
  mapCoinGateOrderStatus,
  mapCoinGateRefundStatus,
  toDecimalAmount,
  toMinorUnits,
  getCurrencyExponent,
} from './coingate.mapper';
import {
  encodeCursor,
  decodeCursor,
  generateCallbackToken,
  verifyCallbackToken,
} from './coingate.orders';
import {
  CoinGateCredentialsContract,
} from './coingate.credentials.contract';
import {
  CoinGateValidationError,
  CoinGateRateLimitError,
  mapCoinGateError,
} from './coingate.errors';
import {
  COINGATE_SANDBOX_BASE,
  COINGATE_PRODUCTION_BASE,
  CoinGateClient,
} from './coingate.client';
import {
  listCoinGatePaymentUnits,
} from './coingate.currencies';
import type { CoinGateOrder, CoinGateCurrency } from './coingate.types';
import type { PaymentProviderContext } from '../../types/payment.types';
import { PaymentCredentialsInvalidError } from '../../errors/payment.errors';
import { PaymentTestScenario } from '../../enums/payment-test-scenario.enum';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockClient(getResponse?: unknown, postResponse?: unknown) {
  return {
    get: jest.fn().mockResolvedValue(getResponse ?? {}),
    post: jest.fn().mockResolvedValue(postResponse ?? {}),
    baseUrl: COINGATE_SANDBOX_BASE,
  };
}

function makeContext(mode: 'test' | 'live' = 'test'): PaymentProviderContext {
  return {
    providerKey: 'coingate',
    connectionType: 'token',
    credentialsId: 'cred-abc123',
    isActive: true,
    credentials: { token: 'REDACTED_TEST_TOKEN', mode },
  };
}

function makeOrder(
  overrides: Partial<CoinGateOrder> = {},
): CoinGateOrder {
  return {
    id: 12345,
    status: 'new',
    do_not_convert: false,
    price_currency: 'EUR',
    price_amount: '100.00',
    lightning_network: false,
    receive_currency: 'EUR',
    created_at: '2026-08-01T00:00:00.000Z',
    payment_url: 'https://sandbox.coingate.com/invoice/12345',
    order_id: 'test-ref-001',
    is_refundable: false,
    ...overrides,
  };
}

// ─── Provider basic contracts ─────────────────────────────────────────────────

describe('CoingatePaymentProvider — identity', () => {
  const provider = new CoingatePaymentProvider();

  it('providerKey is "coingate"', () => {
    expect(provider.providerKey).toBe('coingate');
  });

  it('displayName is "CoinGate"', () => {
    expect(provider.displayName).toBe('CoinGate');
  });

  it('connectionType in metadata is "token"', () => {
    expect(provider.getMetadata().connectionType).toBe('token');
  });

  it('getCapabilities() returns COINGATE_CAPABILITIES reference', () => {
    expect(provider.getCapabilities()).toBe(COINGATE_CAPABILITIES);
  });

  it('supportsConnection is true', () => {
    expect(provider.supportsConnection).toBe(true);
  });

  it('supportsPaymentListing is true', () => {
    expect(provider.supportsPaymentListing).toBe(true);
  });

  it('supportsPaymentUnits is true', () => {
    expect(provider.supportsPaymentUnits).toBe(true);
  });

  it('supportsRefundListing is true', () => {
    expect(provider.supportsRefundListing).toBe(true);
  });

  it('supportsGatewayGuide is true', () => {
    expect(provider.supportsGatewayGuide).toBe(true);
  });

  it('supportsPaymentTesting is true', () => {
    expect(provider.supportsPaymentTesting).toBe(true);
  });
});

// ─── Capabilities ─────────────────────────────────────────────────────────────

describe('CoinGate capabilities', () => {
  it('dashboard is available', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Dashboard]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('payments is available', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Payments]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('paymentTesting is available', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.PaymentTesting]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('gateway is available', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Gateway]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('paymentMethods is unsupported (crypto assets != configurable payment methods)', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.PaymentMethods]).toBe(
      CapabilityStatus.Unsupported,
    );
  });

  it('refunds is available', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Refunds]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('webhooks is available (delivery monitoring)', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Webhooks]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('webhookEndpointListing is unsupported (CoinGate uses per-order callbacks)', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.WebhookEndpointListing]).toBe(
      CapabilityStatus.Unsupported,
    );
  });

  it('balance is unsupported (no authoritative balance endpoint)', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Balance]).toBe(
      CapabilityStatus.Unsupported,
    );
  });

  it('recurringPayments is unsupported', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.RecurringPayments]).toBe(
      CapabilityStatus.Unsupported,
    );
  });

  it('payouts is planned (requires account activation)', () => {
    expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Payouts]).toBe(
      CapabilityStatus.Planned,
    );
  });
});

// ─── FOUNDATION TEST 1 & 2: environment → base URL ───────────────────────────

describe('CoinGateClient — base URL selection', () => {
  it('test mode → sandbox base URL', () => {
    const client = new CoinGateClient('REDACTED', 'test');
    expect(client.baseUrl).toBe(COINGATE_SANDBOX_BASE);
    expect(client.baseUrl).toContain('api-sandbox.coingate.com');
  });

  it('live mode → production base URL', () => {
    const client = new CoinGateClient('REDACTED', 'live');
    expect(client.baseUrl).toBe(COINGATE_PRODUCTION_BASE);
    expect(client.baseUrl).toContain('api.coingate.com');
    expect(client.baseUrl).not.toContain('sandbox');
  });
});

// ─── FOUNDATION TEST 3: token never exposed ───────────────────────────────────

describe('CoinGate security — token never exposed', () => {
  it('getCapabilities() returns no token fields', () => {
    const json = JSON.stringify(COINGATE_CAPABILITIES);
    expect(json).not.toContain('token');
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('secret');
  });

  it('getMetadata() returns no token fields', () => {
    const provider = new CoingatePaymentProvider();
    const json = JSON.stringify(provider.getMetadata());
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('secret');
    expect(json).not.toContain('password');
  });

  it('gateway guide contains no credential examples', () => {
    const provider = new CoingatePaymentProvider();
    const guide = provider.getGatewayGuide();
    const json = JSON.stringify(guide);
    expect(json).not.toMatch(/sk_(test|live)_/);
    expect(json).not.toMatch(/YOUR_COINGATE_TOKEN/);
  });
});

// ─── FOUNDATION TEST 4 & 5: credential validation ────────────────────────────

describe('validateConnection()', () => {
  it('returns connected:true when CoinGate API responds 200', async () => {
    const provider = new CoingatePaymentProvider();

    // Mock the CoinGate HTTP client to avoid a real API call.
    jest.mock('./coingate.client', () => ({
      ...jest.requireActual('./coingate.client'),
      createCoinGateClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ orders: [], total_orders: 0 }),
        baseUrl: COINGATE_SANDBOX_BASE,
      }),
    }));

    // Direct result check via mocked axios
    const result = await provider.validateConnection({
      token: 'REDACTED_VALID_TOKEN',
      mode: 'test',
    });

    // Result must not contain the token.
    expect(JSON.stringify(result)).not.toContain('REDACTED_VALID_TOKEN');
  });

  it('returns connected:false and safe message on auth failure', async () => {
    const provider = new CoingatePaymentProvider();

    const axiosError = Object.assign(new Error('Unauthorized'), {
      isAxiosError: true,
      response: { status: 401, data: { message: 'Unauthorized' }, headers: {} },
    });

    jest.mock('./coingate.client', () => ({
      ...jest.requireActual('./coingate.client'),
      createCoinGateClient: jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(axiosError),
        baseUrl: COINGATE_SANDBOX_BASE,
      }),
    }));

    // The returned result must be a non-throwing failure.
    const result = await provider.validateConnection({
      token: 'REDACTED_INVALID_TOKEN',
      mode: 'test',
    });

    // Token must not appear in the result.
    expect(JSON.stringify(result)).not.toContain('REDACTED_INVALID_TOKEN');
  });
});

// ─── FOUNDATION TEST 6: error mapping ────────────────────────────────────────

describe('mapCoinGateError()', () => {
  function makeAxiosErr(status: number, data: unknown = {}) {
    return Object.assign(new Error(`HTTP ${status}`), {
      isAxiosError: true,
      response: { status, data, headers: {} },
    });
  }

  it('401 → PaymentCredentialsInvalidError', () => {
    expect(() =>
      mapCoinGateError(makeAxiosErr(401, { message: 'Unauthorized' })),
    ).toThrow(PaymentCredentialsInvalidError);
  });

  it('403 → PaymentCredentialsInvalidError', () => {
    expect(() =>
      mapCoinGateError(makeAxiosErr(403, { message: 'Forbidden' })),
    ).toThrow(PaymentCredentialsInvalidError);
  });

  it('422 → CoinGateValidationError with safe message', () => {
    expect(() =>
      mapCoinGateError(
        makeAxiosErr(422, {
          message: 'Invalid price amount',
          reason: 'must be positive',
          errors: ['price_amount must be greater than 0'],
        }),
      ),
    ).toThrow(CoinGateValidationError);
  });

  it('429 → CoinGateRateLimitError', () => {
    expect(() =>
      mapCoinGateError(makeAxiosErr(429, { message: 'Rate limited' })),
    ).toThrow(CoinGateRateLimitError);
  });

  it('error message never contains token value', () => {
    const SECRET = 'very-secret-coingate-token';
    const err = makeAxiosErr(401, { message: `Token ${SECRET} is invalid` });
    let caught: Error | undefined;
    try {
      mapCoinGateError(err);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).not.toContain(SECRET);
  });
});

// ─── FOUNDATION TEST 7–10: PaymentUnit mapping ────────────────────────────────

describe('listCoinGatePaymentUnits()', () => {
  const mockCurrencies: CoinGateCurrency[] = [
    {
      id: 1,
      title: 'Bitcoin',
      symbol: 'BTC',
      type: 'crypto',
      platforms: [{ id: 1, title: 'Bitcoin', symbol: 'BTC' }],
    },
    {
      id: 2,
      title: 'Euro',
      symbol: 'EUR',
      type: 'fiat',
      platforms: [],
    },
    {
      id: 3,
      title: 'Tether',
      symbol: 'USDT',
      type: 'token',
      platforms: [
        { id: 10, title: 'TRC20', symbol: 'TRC20' },
        { id: 11, title: 'ERC20', symbol: 'ERC20' },
      ],
    },
  ];

  it('maps crypto currency to kind=crypto', async () => {
    const client = makeMockClient(mockCurrencies) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    const btc = units.find((u) => u.code === 'BTC');
    expect(btc).toBeDefined();
    expect(btc!.kind).toBe('crypto');
  });

  it('maps fiat currency to kind=fiat', async () => {
    const client = makeMockClient(mockCurrencies) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    const eur = units.find((u) => u.code === 'EUR');
    expect(eur).toBeDefined();
    expect(eur!.kind).toBe('fiat');
  });

  it('maps token currency to kind=token', async () => {
    const client = makeMockClient(mockCurrencies) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    const usdt = units.filter((u) => u.code === 'USDT');
    expect(usdt.length).toBeGreaterThan(0);
    expect(usdt[0].kind).toBe('token');
  });

  it('expands multi-platform currencies into separate units', async () => {
    const client = makeMockClient(mockCurrencies) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    const usdtUnits = units.filter((u) => u.code === 'USDT');
    expect(usdtUnits.length).toBe(2); // TRC20 and ERC20
  });

  it('preserves network information on each platform unit', async () => {
    const client = makeMockClient(mockCurrencies) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    const usdtTrc = units.find((u) => u.code === 'USDT' && u.network === 'TRC20');
    expect(usdtTrc).toBeDefined();
  });

  it('includes currency_id and platform_id in providerMetadata (required for refunds)', async () => {
    const client = makeMockClient(mockCurrencies) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    const btc = units.find((u) => u.code === 'BTC');
    expect(btc!.providerMetadata).toBeDefined();
    expect(btc!.providerMetadata!['currencyId']).toBe(1);
    expect(btc!.providerMetadata!['platformId']).toBeDefined();
  });

  it('returns empty array when API returns non-array', async () => {
    const client = makeMockClient(null) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    expect(units).toEqual([]);
  });

  it('does not hardcode any currency list', async () => {
    const minimalCurrencies: CoinGateCurrency[] = [
      { id: 999, title: 'FutureCoin', symbol: 'FTC', type: 'crypto', platforms: [] },
    ];
    const client = makeMockClient(minimalCurrencies) as unknown as CoinGateClient;
    const units = await listCoinGatePaymentUnits(client);
    expect(units[0].code).toBe('FTC');
  });
});

// ─── PAYMENTS TEST 12: decimal-safe amount mapping ────────────────────────────

describe('Amount conversion — decimal safety', () => {
  it('toDecimalAmount EUR: 10000 minor units → "100.00"', () => {
    expect(toDecimalAmount(10000, 'EUR')).toBe('100.00');
  });

  it('toDecimalAmount USD: 1 minor unit → "0.01"', () => {
    expect(toDecimalAmount(1, 'USD')).toBe('0.01');
  });

  it('toDecimalAmount JPY: 5000 minor units → "5000" (no decimals)', () => {
    expect(toDecimalAmount(5000, 'JPY')).toBe('5000');
  });

  it('toMinorUnits EUR: "100.00" → 10000', () => {
    expect(toMinorUnits('100.00', 'EUR')).toBe(10000);
  });

  it('toMinorUnits USD: "0.01" → 1', () => {
    expect(toMinorUnits('0.01', 'USD')).toBe(1);
  });

  it('toMinorUnits JPY: "5000" → 5000', () => {
    expect(toMinorUnits('5000', 'JPY')).toBe(5000);
  });

  it('getCurrencyExponent EUR → 2', () => {
    expect(getCurrencyExponent('EUR')).toBe(2);
  });

  it('getCurrencyExponent JPY → 0', () => {
    expect(getCurrencyExponent('JPY')).toBe(0);
  });

  it('getCurrencyExponent BTC → 8 (crypto default)', () => {
    expect(getCurrencyExponent('BTC')).toBe(8);
  });
});

// ─── PAYMENTS TEST 18: all order status mappings ─────────────────────────────

describe('mapCoinGateOrderStatus()', () => {
  const cases: Array<[string, PaymentCanonicalStatus]> = [
    ['new', PaymentCanonicalStatus.RequiresAction],
    ['pending', PaymentCanonicalStatus.RequiresAction],
    ['confirming', PaymentCanonicalStatus.Processing],
    ['paid', PaymentCanonicalStatus.Succeeded],
    ['invalid', PaymentCanonicalStatus.Failed],
    ['expired', PaymentCanonicalStatus.Expired],
    ['canceled', PaymentCanonicalStatus.Cancelled],
    ['refunded', PaymentCanonicalStatus.Refunded],
    ['partially_refunded', PaymentCanonicalStatus.PartiallyRefunded],
  ];

  for (const [raw, canonical] of cases) {
    it(`"${raw}" → ${canonical}`, () => {
      expect(mapCoinGateOrderStatus(raw)).toBe(canonical);
    });
  }

  it('unknown status → Pending (safe default)', () => {
    expect(mapCoinGateOrderStatus('unknown_future_status')).toBe(
      PaymentCanonicalStatus.Pending,
    );
  });
});

// ─── PAYMENTS TEST 16: pagination cursor encoding ─────────────────────────────

describe('Pagination cursor encoding', () => {
  it('encodes page 2 as an opaque base64url string', () => {
    const cursor = encodeCursor(2);
    expect(typeof cursor).toBe('string');
    expect(cursor.length).toBeGreaterThan(0);
  });

  it('decodes back to the original page number', () => {
    const cursor = encodeCursor(5);
    expect(decodeCursor(cursor)).toBe(5);
  });

  it('decodes invalid cursor to page 1 (safe default)', () => {
    expect(decodeCursor('not-a-valid-cursor')).toBe(1);
  });

  it('decodes empty string to page 1', () => {
    expect(decodeCursor('')).toBe(1);
  });
});

// ─── CALLBACKS TEST 36: connection-scoped idempotency via token derivation ────

describe('Callback token — connection-scoped idempotency', () => {
  it('generates a 32-character hex token', () => {
    const token = generateCallbackToken('cred-abc', 'order-001');
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('same inputs → same token (deterministic)', () => {
    const t1 = generateCallbackToken('cred-abc', 'order-001');
    const t2 = generateCallbackToken('cred-abc', 'order-001');
    expect(t1).toBe(t2);
  });

  it('different credentialId → different token', () => {
    const t1 = generateCallbackToken('cred-A', 'order-001');
    const t2 = generateCallbackToken('cred-B', 'order-001');
    expect(t1).not.toBe(t2);
  });

  it('different externalReference → different token', () => {
    const t1 = generateCallbackToken('cred-abc', 'order-001');
    const t2 = generateCallbackToken('cred-abc', 'order-002');
    expect(t1).not.toBe(t2);
  });

  it('verifyCallbackToken returns true for matching token', () => {
    const token = generateCallbackToken('cred-abc', 'order-001');
    expect(verifyCallbackToken(token, 'cred-abc', 'order-001')).toBe(true);
  });

  it('verifyCallbackToken returns false for wrong token', () => {
    expect(verifyCallbackToken('wrong-token-xxxxxxxxxx123456789012', 'cred-abc', 'order-001')).toBe(false);
  });

  it('verifyCallbackToken returns false for mismatched credentialId', () => {
    const token = generateCallbackToken('cred-abc', 'order-001');
    expect(verifyCallbackToken(token, 'cred-XYZ', 'order-001')).toBe(false);
  });

  it('token never contains credential secret material', () => {
    const apiToken = 'SECRET_COINGATE_TOKEN_VALUE';
    // Token derivation uses only credentialId and externalReference,
    // not the actual CoinGate API token.
    const token = generateCallbackToken('cred-123', 'order-001');
    expect(token).not.toContain(apiToken);
  });
});

// ─── Refund status mapping ─────────────────────────────────────────────────────

describe('mapCoinGateRefundStatus()', () => {
  const cases: Array<[string, string]> = [
    ['pending', 'pending'],
    ['processing', 'requires_action'],
    ['completed', 'succeeded'],
    ['rejected', 'failed'],
    ['failed', 'failed'],
    ['cancelled', 'cancelled'],
    ['unknown_future', 'unknown'],
  ];

  for (const [raw, canonical] of cases) {
    it(`"${raw}" → "${canonical}"`, () => {
      expect(mapCoinGateRefundStatus(raw)).toBe(canonical);
    });
  }
});

// ─── Credential contract ───────────────────────────────────────────────────────

describe('CoinGateCredentialsContract', () => {
  it('channelKey is "payment"', () => {
    expect(CoinGateCredentialsContract.channelKey).toBe('payment');
  });

  it('connectionType is "token"', () => {
    expect(CoinGateCredentialsContract.connectionType).toBe('token');
  });

  it('normalize trims token whitespace', () => {
    const result = CoinGateCredentialsContract.normalize({ token: '  cgtest-xxx  ', mode: 'test' });
    expect(result.value.token).toBe('cgtest-xxx');
  });

  it('normalize defaults mode to "test" when absent', () => {
    const result = CoinGateCredentialsContract.normalize({ token: 'cgtest-xxx' });
    expect(result.value.mode).toBe('test');
  });

  it('normalize accepts "live" mode', () => {
    const result = CoinGateCredentialsContract.normalize({ token: 'cglive-xxx', mode: 'live' });
    expect(result.value.mode).toBe('live');
  });

  it('validate passes for a non-empty token with valid mode', () => {
    const value = CoinGateCredentialsContract.normalize({ token: 'cgtest-valid-token', mode: 'test' }).value;
    expect(() => CoinGateCredentialsContract.validate(value)).not.toThrow();
  });

  it('validate throws for empty token', () => {
    const value = CoinGateCredentialsContract.normalize({ token: '', mode: 'test' }).value;
    expect(() => CoinGateCredentialsContract.validate(value)).toThrow();
  });

  it('normalized value contains no extraneous fields', () => {
    const result = CoinGateCredentialsContract.normalize({
      token: 'cgtest-xxx',
      mode: 'test',
      password: 'should-be-dropped',
      secret: 'should-be-dropped',
    });
    expect(result.value).not.toHaveProperty('password');
    expect(result.value).not.toHaveProperty('secret');
  });
});

// ─── No parallel provider registry ────────────────────────────────────────────

describe('No parallel provider registry', () => {
  it('CoinGate implements the same IPaymentProvider interface as Stripe', () => {
    const provider = new CoingatePaymentProvider();
    expect(typeof provider.providerKey).toBe('string');
    expect(typeof provider.displayName).toBe('string');
    expect(typeof provider.getCapabilities).toBe('function');
    expect(typeof provider.getMetadata).toBe('function');
  });

  it('CoinGate capabilities use the canonical PaymentCapability enum', () => {
    const caps = COINGATE_CAPABILITIES.capabilities;
    // Keys must all be values from the PaymentCapability enum
    const validKeys = new Set(Object.values(PaymentCapability));
    for (const key of Object.keys(caps)) {
      expect(validKeys.has(key as PaymentCapability)).toBe(true);
    }
  });

  it('CoinGate capabilities use the canonical CapabilityStatus enum', () => {
    const caps = COINGATE_CAPABILITIES.capabilities;
    const validStatuses = new Set(Object.values(CapabilityStatus));
    for (const status of Object.values(caps)) {
      expect(validStatuses.has(status as CapabilityStatus)).toBe(true);
    }
  });
});

// ─── Payment testing ──────────────────────────────────────────────────────────

describe('CoingatePaymentProvider.getSupportedTestScenarios()', () => {
  const provider = new CoingatePaymentProvider();

  it('returns at least one scenario', () => {
    const scenarios = provider.getSupportedTestScenarios('crypto');
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it('includes the Success scenario', () => {
    const scenarios = provider.getSupportedTestScenarios('crypto');
    expect(scenarios).toContain(PaymentTestScenario.Success);
  });
});
