// src/payments/providers/coingate/coingate.reference-data.ts
//
// CoinGate provider-backed reference data.
//
// Three semantically distinct source concepts:
//
//   price_currencies  — fiat currencies valid for POST /orders price_currency.
//   receive_currencies — assets the merchant settles into (receive_currency).
//   payment_assets     — all assets a buyer can use at checkout.
//
// All filtering is performed here — never in the generic frontend.
//
// ── Classification (confirmed from live CoinGate v2 sandbox response) ──────────
//
// CoinGate GET /v2/currencies returns a flat array. Each entry includes:
//   id, title, symbol, kind, [platforms]
//
// The `kind` field is the authoritative classifier:
//   kind === "fiat"   → EUR, USD, GBP, PLN, CZK, etc.
//                       No `platforms` field present.
//                       Valid for POST /orders price_currency.
//   kind === "crypto" → BTC, ETH, LTC, TRX, XRP, SOL, USDT, USDC, etc.
//                       `platforms` array present (may be empty for single-network).
//
// The `type` field and `merchant_pay` field are NOT present in the live v2 API.
// They appear only in older API versions and test mocks — handled as fallbacks.

import type { CoinGateClient } from './coingate.client';
import type { CoinGateCurrency } from './coingate.types';
import type {
  PaymentReferenceDataOption,
  PaymentReferenceDataResponse,
  PaymentReferenceDataSource,
} from '../../contracts/payment-reference-data.contract';

// ─── Fiat classifier ──────────────────────────────────────────────────────────

/**
 * Returns true when a CoinGate currency is a fiat price-denomination currency
 * valid for POST /orders price_currency.
 *
 * Classification precedence (most-to-least authoritative):
 *   1. kind === "fiat"          — live CoinGate v2 API (confirmed from sandbox)
 *   2. type === "fiat"          — legacy / older API versions and test mocks
 *   3. merchant_pay === false   — older API versions without kind/type fields
 *   4. Otherwise: not fiat
 */
function isFiatCurrency(c: CoinGateCurrency): boolean {
  if (c.kind !== undefined) return c.kind.toLowerCase() === 'fiat';
  if (c.type !== undefined) return c.type.toLowerCase() === 'fiat';
  if (typeof c.merchant_pay === 'boolean') return c.merchant_pay === false;
  return false;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchCurrencies(
  client: CoinGateClient,
): Promise<CoinGateCurrency[]> {
  const result = await client.get<unknown>('/currencies');
  if (Array.isArray(result)) return result as CoinGateCurrency[];
  // Handle any possible wrapped response shape
  const wrapped = result as Record<string, unknown>;
  for (const key of ['currencies', 'data', 'items']) {
    if (Array.isArray(wrapped[key])) return wrapped[key] as CoinGateCurrency[];
  }
  return [];
}

// ─── price_currencies ─────────────────────────────────────────────────────────

/**
 * Returns only fiat currencies valid for CoinGate POST /orders price_currency.
 *
 * Uses isFiatCurrency() — see classification note above.
 * Fiat entries from the live API have no `platforms` field; they are not expanded.
 * Deduplicates by symbol (uppercase). Sorts alphabetically by code.
 */
export async function getCoinGatePriceCurrencies(
  client: CoinGateClient,
  connectionId: string,
): Promise<PaymentReferenceDataResponse> {
  const currencies = await fetchCurrencies(client);

  const seen = new Set<string>();
  const options: PaymentReferenceDataOption[] = [];

  for (const c of currencies) {
    if (!isFiatCurrency(c)) continue;
    const code = (c.symbol ?? '').toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);

    options.push({
      value: code,
      label: c.title ?? code,
      group: 'Fiat',
      metadata: { currencyId: c.id },
    });
  }

  options.sort((a, b) => a.value.localeCompare(b.value));

  return {
    providerKey: 'coingate',
    connectionId,
    source: 'price_currencies',
    options,
    meta: {
      authoritative: true,
      providerBacked: true,
      note:
        'Fiat currencies from CoinGate GET /currencies (kind==="fiat"). ' +
        'Valid for POST /orders price_currency.',
    },
  };
}

// ─── receive_currencies ───────────────────────────────────────────────────────

/**
 * Returns assets valid for CoinGate POST /orders receive_currency.
 *
 * Includes non-fiat entries (kind === "crypto" and any unclassified entries).
 * Network variants use a composite value "CODE:PLATFORM_SYMBOL" so each
 * network is unambiguously selectable.
 */
export async function getCoinGateReceiveCurrencies(
  client: CoinGateClient,
  connectionId: string,
): Promise<PaymentReferenceDataResponse> {
  const currencies = await fetchCurrencies(client);

  const seen = new Set<string>();
  const options: PaymentReferenceDataOption[] = [];

  for (const c of currencies) {
    if (isFiatCurrency(c)) continue;

    const code = (c.symbol ?? '').toUpperCase();
    if (!code) continue;

    if (c.platforms && c.platforms.length > 0) {
      for (const platform of c.platforms) {
        const platformSymbol = (
          platform.symbol ??
          platform.title ??
          ''
        ).toUpperCase();
        const compositeValue = platformSymbol
          ? `${code}:${platformSymbol}`
          : code;

        if (seen.has(compositeValue)) continue;
        seen.add(compositeValue);

        options.push({
          value: compositeValue,
          label: platformSymbol ? `${c.title} (${platformSymbol})` : c.title,
          group: 'Crypto',
          metadata: {
            currencyCode: code,
            currencyId: c.id,
            platformId: platform.id,
            platformTitle: platform.title,
            platformSymbol,
          },
        });
      }
    } else {
      if (seen.has(code)) continue;
      seen.add(code);

      options.push({
        value: code,
        label: c.title,
        group: 'Crypto',
        metadata: {
          currencyCode: code,
          currencyId: c.id,
        },
      });
    }
  }

  options.sort((a, b) => a.label.localeCompare(b.label));

  return {
    providerKey: 'coingate',
    connectionId,
    source: 'receive_currencies',
    options,
    meta: {
      authoritative: true,
      providerBacked: true,
      note:
        'Crypto/non-fiat assets from CoinGate GET /currencies. ' +
        'Valid for POST /orders receive_currency.',
    },
  };
}

// ─── payment_assets ───────────────────────────────────────────────────────────

/**
 * Returns all assets from CoinGate GET /currencies (both fiat and crypto).
 *
 * Semantically distinct from price_currencies (fiat only) and
 * receive_currencies (crypto only). Not intended for price_currency or
 * receive_currency submission fields.
 */
export async function getCoinGatePaymentAssets(
  client: CoinGateClient,
  connectionId: string,
): Promise<PaymentReferenceDataResponse> {
  const currencies = await fetchCurrencies(client);

  const seen = new Set<string>();
  const options: PaymentReferenceDataOption[] = [];

  for (const c of currencies) {
    const code = (c.symbol ?? '').toUpperCase();
    if (!code) continue;
    const fiat = isFiatCurrency(c);

    if (c.platforms && c.platforms.length > 0) {
      for (const platform of c.platforms) {
        const platformSymbol = (
          platform.symbol ??
          platform.title ??
          ''
        ).toUpperCase();
        const compositeValue = platformSymbol
          ? `${code}:${platformSymbol}`
          : code;

        if (seen.has(compositeValue)) continue;
        seen.add(compositeValue);

        options.push({
          value: compositeValue,
          label: platformSymbol ? `${c.title} (${platformSymbol})` : c.title,
          group: fiat ? 'Fiat' : 'Crypto',
          metadata: {
            currencyCode: code,
            currencyId: c.id,
            platformId: platform.id,
            platformSymbol,
          },
        });
      }
    } else {
      if (seen.has(code)) continue;
      seen.add(code);

      options.push({
        value: code,
        label: c.title,
        group: fiat ? 'Fiat' : 'Crypto',
        metadata: { currencyCode: code, currencyId: c.id },
      });
    }
  }

  options.sort((a, b) => a.label.localeCompare(b.label));

  return {
    providerKey: 'coingate',
    connectionId,
    source: 'payment_assets',
    options,
    meta: {
      authoritative: true,
      providerBacked: true,
      note:
        'All assets from CoinGate GET /currencies. ' +
        'Represents assets available to a buyer at checkout.',
    },
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function getCoinGateReferenceData(
  client: CoinGateClient,
  connectionId: string,
  source: PaymentReferenceDataSource,
): Promise<PaymentReferenceDataResponse> {
  switch (source) {
    case 'price_currencies':
      return getCoinGatePriceCurrencies(client, connectionId);
    case 'receive_currencies':
      return getCoinGateReceiveCurrencies(client, connectionId);
    case 'payment_assets':
      return getCoinGatePaymentAssets(client, connectionId);
    default:
      return {
        providerKey: 'coingate',
        connectionId,
        source,
        options: [],
        meta: {
          authoritative: false,
          providerBacked: false,
          note: `Source "${source}" is not supported by CoinGate.`,
        },
      };
  }
}
