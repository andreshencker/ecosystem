// src/payments/tests/coingate-reference-data.spec.ts
//
// Focused tests for CoinGate reference-data classification.
//
// Tests both response shapes:
//   A — Live v2 API (confirmed from sandbox): kind field ('fiat'/'crypto'), no type/merchant_pay.
//   B — Legacy / mock: type field present ('fiat', 'crypto', etc.), no kind field.
//
// The isFiatCurrency() helper in coingate.reference-data.ts handles both shapes.
//
// No live HTTP calls — CoinGateClient.get is mocked.

import {
  getCoinGatePriceCurrencies,
  getCoinGateReceiveCurrencies,
  getCoinGatePaymentAssets,
} from '../providers/coingate/coingate.reference-data';
import type { CoinGateClient } from '../providers/coingate/coingate.client';
import type { CoinGateCurrency } from '../providers/coingate/coingate.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONNECTION_ID = 'test-connection-id';

function makeMockClient(currencies: CoinGateCurrency[]): CoinGateClient {
  return {
    get: jest.fn().mockResolvedValue(currencies),
    post: jest.fn(),
    baseUrl: 'https://api-sandbox.coingate.com/v2',
  } as unknown as CoinGateClient;
}

// ── Shape A: Real v2 API — uses `kind` field, no type/merchant_pay ─────────
// Confirmed from live CoinGate sandbox GET /currencies response:
//   kind: "fiat"   → EUR, USD, GBP, PLN, CZK (no platforms field)
//   kind: "crypto" → BTC, ETH, LTC, TRX, USDT (platforms array present)

const REAL_API_CURRENCIES: CoinGateCurrency[] = [
  // Fiat: kind=fiat, no platforms field
  { id: 2, title: 'Euro', symbol: 'EUR', kind: 'fiat' },
  { id: 3, title: 'United States dollar', symbol: 'USD', kind: 'fiat' },
  { id: 4, title: 'British Pound', symbol: 'GBP', kind: 'fiat' },
  { id: 11, title: 'Polish Zloty', symbol: 'PLN', kind: 'fiat' },
  // Crypto: kind=crypto, platforms present
  {
    id: 1,
    title: 'Bitcoin',
    symbol: 'BTC',
    kind: 'crypto',
    platforms: [{ id: 1, title: 'Bitcoin', symbol: 'BTC' }],
  },
  {
    id: 5,
    title: 'Ethereum',
    symbol: 'ETH',
    kind: 'crypto',
    platforms: [{ id: 2, title: 'Ethereum', symbol: 'ETH' }],
  },
  {
    id: 20,
    title: 'Solana',
    symbol: 'SOL',
    kind: 'crypto',
    platforms: [{ id: 5, title: 'Solana', symbol: 'SOL' }],
  },
  {
    id: 30,
    title: 'Tether',
    symbol: 'USDT',
    kind: 'crypto',
    platforms: [
      { id: 10, title: 'TRC20', symbol: 'TRC20' },
      { id: 11, title: 'ERC20', symbol: 'ERC20' },
    ],
  },
];

// ── Shape B: Legacy/mock API — type field present, no kind field ───────────

const LEGACY_CURRENCIES: CoinGateCurrency[] = [
  { id: 2, title: 'Euro', symbol: 'EUR', type: 'fiat' },
  { id: 3, title: 'US Dollar', symbol: 'USD', type: 'fiat' },
  { id: 1, title: 'Bitcoin', symbol: 'BTC', type: 'crypto', platforms: [] },
  {
    id: 10,
    title: 'Ethereum',
    symbol: 'ETH',
    type: 'crypto',
    platforms: [{ id: 1, title: 'Ethereum', symbol: 'ETH' }],
  },
  {
    id: 30,
    title: 'Tether',
    symbol: 'USDT',
    type: 'token',
    platforms: [
      { id: 10, title: 'TRC20', symbol: 'TRC20' },
      { id: 11, title: 'ERC20', symbol: 'ERC20' },
    ],
  },
];

// ─── Test 1: Real v2 API response is parsed correctly ─────────────────────────

describe('Test 1: Real v2 API response (kind field) is parsed correctly', () => {
  it('price_currencies uses kind===fiat to find fiat entries from real API', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const codes = result.options.map((o) => o.value);
    expect(codes).toContain('EUR');
    expect(codes).toContain('USD');
    expect(codes).toContain('GBP');
  });

  it('price_currencies uses type===fiat for legacy/mocked API', async () => {
    const client = makeMockClient(LEGACY_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const codes = result.options.map((o) => o.value);
    expect(codes).toContain('EUR');
    expect(codes).toContain('USD');
  });
});

// ─── Test 2: price currencies are not accidentally filtered to zero ────────────

describe('Test 2: price_currencies is not empty when fiat entries exist', () => {
  it('returns entries when real v2 API (kind=fiat) is used', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options.length).toBeGreaterThan(0);
  });

  it('returns entries when legacy API (type=fiat) is used', async () => {
    const client = makeMockClient(LEGACY_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options.length).toBeGreaterThan(0);
  });
});

// ─── Test 3: Fiat entries map to canonical options ─────────────────────────────

describe('Test 3: fiat entries map to canonical options', () => {
  it('EUR maps to option with value EUR, label containing Euro, group Fiat', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const eur = result.options.find((o) => o.value === 'EUR');
    expect(eur).toBeDefined();
    expect(eur?.label).toContain('Euro');
    expect(eur?.group).toBe('Fiat');
  });

  it('option values are uppercase codes', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    result.options.forEach((o) => {
      expect(o.value).toBe(o.value.toUpperCase());
    });
  });
});

// ─── Test 4: Crypto entries are excluded from price_currencies ────────────────

describe('Test 4: crypto entries are excluded from price_currencies', () => {
  it('price_currencies has no entries with kind===crypto', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const codes = result.options.map((o) => o.value);
    expect(codes).not.toContain('ETH');
    expect(codes).not.toContain('BTC');
  });

  it('all price_currency options have group Fiat', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    result.options.forEach((o) => expect(o.group).toBe('Fiat'));
  });
});

// ─── Test 5: SOL excluded from price_currencies ───────────────────────────────

describe('Test 5: SOL is excluded from price_currencies', () => {
  it('SOL does not appear in price_currencies (kind=crypto)', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const sol = result.options.find((o) => o.value === 'SOL');
    expect(sol).toBeUndefined();
  });

  it('SOL does not appear in price_currencies even with type classification', async () => {
    const withSol: CoinGateCurrency[] = [
      ...LEGACY_CURRENCIES,
      { id: 40, title: 'Solana', symbol: 'SOL', type: 'crypto', platforms: [] },
    ];
    const client = makeMockClient(withSol);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options.find((o) => o.value === 'SOL')).toBeUndefined();
  });
});

// ─── Test 6: BTC excluded from price_currencies ───────────────────────────────

describe('Test 6: BTC is excluded from price_currencies', () => {
  it('BTC does not appear in price_currencies', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options.find((o) => o.value === 'BTC')).toBeUndefined();
  });
});

// ─── Test 7: USDT network variants excluded from price_currencies ─────────────

describe('Test 7: USDT network variants are excluded from price_currencies', () => {
  it('neither USDT nor USDT:TRC20 nor USDT:ERC20 appear in price_currencies', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const codes = result.options.map((o) => o.value);
    expect(codes.some((c) => c.startsWith('USDT'))).toBe(false);
  });
});

// ─── Test 8: Fiat entries not expanded by platform ───────────────────────────

describe('Test 8: fiat entries are not expanded by platform', () => {
  it('EUR appears exactly once even if it had platforms', async () => {
    const withPlatforms: CoinGateCurrency[] = [
      {
        id: 2,
        title: 'Euro',
        symbol: 'EUR',
        kind: 'fiat',
        platforms: [{ id: 99, title: 'SomePlatform', symbol: 'SP' }],
      },
    ];
    const client = makeMockClient(withPlatforms);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const eurEntries = result.options.filter((o) => o.value === 'EUR');
    expect(eurEntries).toHaveLength(1);
    // Value must be plain 'EUR' not 'EUR:SOMEPLATFORM'
    expect(eurEntries[0].value).toBe('EUR');
  });
});

// ─── Test 9: Duplicate fiat codes are removed ─────────────────────────────────

describe('Test 9: duplicate fiat codes are removed', () => {
  it('price_currencies deduplicates EUR when returned multiple times', async () => {
    const withDupes: CoinGateCurrency[] = [
      { id: 2, title: 'Euro', symbol: 'EUR', kind: 'fiat' },
      { id: 99, title: 'Euro (duplicate)', symbol: 'EUR', kind: 'fiat' },
    ];
    const client = makeMockClient(withDupes);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const eurEntries = result.options.filter((o) => o.value === 'EUR');
    expect(eurEntries).toHaveLength(1);
  });
});

// ─── Test 10: Option values are uppercase ─────────────────────────────────────

describe('Test 10: option values are uppercase', () => {
  it('all price_currency option values are uppercase', async () => {
    const withLowercase: CoinGateCurrency[] = [
      { id: 2, title: 'Euro', symbol: 'eur', kind: 'fiat' },
    ];
    const client = makeMockClient(withLowercase);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options[0].value).toBe('EUR');
  });
});

// ─── Test 11: Options are deterministically ordered ───────────────────────────

describe('Test 11: options are deterministically ordered', () => {
  it('price_currencies are sorted alphabetically by code', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const codes = result.options.map((o) => o.value);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });
});

// ─── Test 12: Empty provider response maps to options: [] ─────────────────────

describe('Test 12: empty provider response maps to options: []', () => {
  it('returns empty options when CoinGate returns an empty array', async () => {
    const client = makeMockClient([]);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options).toEqual([]);
    expect(result.source).toBe('price_currencies');
    expect(result.providerKey).toBe('coingate');
  });

  it('returns empty options when CoinGate returns all crypto (no fiat)', async () => {
    const allCrypto: CoinGateCurrency[] = [
      { id: 1, title: 'Bitcoin', symbol: 'BTC', kind: 'crypto', platforms: [] },
      {
        id: 10,
        title: 'Ethereum',
        symbol: 'ETH',
        kind: 'crypto',
        platforms: [],
      },
    ];
    const client = makeMockClient(allCrypto);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options).toHaveLength(0);
  });
});

// ─── Test 13: Provider failure is a safe reference-data error ─────────────────

describe('Test 13: provider failure is safe', () => {
  it('propagates errors from the client — no credential leakage', async () => {
    const client = {
      get: jest.fn().mockRejectedValue(new Error('Network timeout')),
      post: jest.fn(),
      baseUrl: 'https://api-sandbox.coingate.com/v2',
    } as unknown as CoinGateClient;

    await expect(
      getCoinGatePriceCurrencies(client, CONNECTION_ID),
    ).rejects.toThrow('Network timeout');
  });
});

// ─── Test 14: Credentials never returned ─────────────────────────────────────

describe('Test 14: credentials are never returned', () => {
  it('response does not contain token or credential fields', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    const json = JSON.stringify(result);
    expect(json).not.toContain('token');
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('Authorization');
    expect(result).not.toHaveProperty('credentials');
  });
});

// ─── Tests for receive_currencies ─────────────────────────────────────────────

describe('receive_currencies uses non-fiat entries', () => {
  it('BTC appears in receive_currencies (as BTC:BTC since mock includes a platform)', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGateReceiveCurrencies(client, CONNECTION_ID);
    // BTC has a platform in the mock → composite value BTC:BTC
    const btcEntry = result.options.find((o) => o.value.startsWith('BTC'));
    expect(btcEntry).toBeDefined();
  });

  it('EUR does not appear in receive_currencies', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGateReceiveCurrencies(client, CONNECTION_ID);
    expect(result.options.find((o) => o.value === 'EUR')).toBeUndefined();
  });

  it('USDT network variants use composite value CODE:PLATFORM', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGateReceiveCurrencies(client, CONNECTION_ID);
    const usdtTrc20 = result.options.find((o) => o.value === 'USDT:TRC20');
    expect(usdtTrc20).toBeDefined();
    expect(usdtTrc20?.metadata?.['platformSymbol']).toBe('TRC20');
  });
});

// ─── Tests for payment_assets ─────────────────────────────────────────────────

describe('payment_assets is distinct from price_currencies', () => {
  it('payment_assets includes SOL (crypto), price_currencies does not', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const [assets, prices] = await Promise.all([
      getCoinGatePaymentAssets(client, CONNECTION_ID),
      getCoinGatePriceCurrencies(client, CONNECTION_ID),
    ]);
    // SOL has a platform in the mock → composite value 'SOL:SOL'
    const solInAssets = assets.options.some((o) => o.value.startsWith('SOL'));
    expect(solInAssets).toBe(true);
    // SOL must never appear in price_currencies (it's crypto)
    const solInPrices = prices.options.some((o) => o.value.startsWith('SOL'));
    expect(solInPrices).toBe(false);
  });

  it('payment_assets includes both EUR (fiat) and BTC (crypto)', async () => {
    const client = makeMockClient(REAL_API_CURRENCIES);
    const result = await getCoinGatePaymentAssets(client, CONNECTION_ID);
    const codes = result.options.map((o) => o.value);
    expect(codes).toContain('EUR');
    // BTC has a platform in the mock → composite value BTC:BTC
    expect(codes.some((c) => c.startsWith('BTC'))).toBe(true);
  });
});

// ─── Regression: previous type===fiat filter vs new merchant_pay filter ────────

describe('Regression: previous empty-selector bugs', () => {
  it('old filter (type===fiat) returns empty when real API uses kind field — confirmed bug', () => {
    // Reproduces the first bug: real API returns kind not type,
    // so c.type === 'fiat' never matches.
    const realApiEntry = { id: 2, title: 'Euro', symbol: 'EUR', kind: 'fiat' };
    const oldFilter = [realApiEntry].filter(
      (c) => (c as unknown as { type?: string }).type === 'fiat',
    );
    expect(oldFilter).toHaveLength(0); // Bug: drops EUR because type field is absent
  });

  it('old classifier (merchant_pay===false) returns empty when real API uses kind field', () => {
    // Reproduces the second bug: real API uses kind not merchant_pay.
    const realApiEntry = { id: 2, title: 'Euro', symbol: 'EUR', kind: 'fiat' };
    const oldFilter = [realApiEntry].filter(
      (c) =>
        typeof (c as unknown as { merchant_pay?: boolean }).merchant_pay ===
          'boolean' &&
        (c as unknown as { merchant_pay?: boolean }).merchant_pay === false,
    );
    expect(oldFilter).toHaveLength(0); // Bug: drops EUR because merchant_pay is absent
  });

  it('new classifier (kind===fiat) correctly identifies EUR from real API shape', async () => {
    const realApiOnly: CoinGateCurrency[] = [
      { id: 2, title: 'Euro', symbol: 'EUR', kind: 'fiat' },
      { id: 1, title: 'Bitcoin', symbol: 'BTC', kind: 'crypto', platforms: [] },
    ];
    const client = makeMockClient(realApiOnly);
    const result = await getCoinGatePriceCurrencies(client, CONNECTION_ID);
    expect(result.options.map((o) => o.value)).toEqual(['EUR']);
  });
});
