// src/payments/providers/coingate/coingate.currencies.ts
//
// CoinGate payment unit (currency/asset) discovery.
// Uses GET /currencies to return the list of supported payment currencies.
//
// API notes:
//   - GET /currencies requires authentication (Authorization: Token header).
//   - Returns all currencies CoinGate supports for payment.
//   - The `type` field distinguishes crypto ('crypto'), platform tokens
//     ('native'), and fiat settlement currencies.
//
// No hardcoded currency list. All units are sourced from the provider.

import type { CoinGateClient } from './coingate.client';
import type { CoinGateCurrency } from './coingate.types';
import type { PaymentUnit, PaymentUnitKind } from '../../contracts/payment-unit.contract';

/** Maps CoinGate type strings to canonical PaymentUnitKind. */
function mapKind(type: string | undefined): PaymentUnitKind {
  switch ((type ?? '').toLowerCase()) {
    case 'fiat':
      return 'fiat';
    case 'crypto':
      return 'crypto';
    case 'native':
    case 'token':
      return 'token';
    default:
      return 'unknown';
  }
}

/**
 * Fetches the list of CoinGate supported currencies and maps them to
 * canonical PaymentUnit records.
 *
 * Each currency is mapped to one PaymentUnit per platform.
 * When a currency has multiple platforms (e.g. USDT on TRC20, ERC20, BEP20),
 * one PaymentUnit per platform is returned with the network populated.
 *
 * Fiat settlement currencies (EUR, BTC direct) appear without a network.
 */
export async function listCoinGatePaymentUnits(
  client: CoinGateClient,
): Promise<PaymentUnit[]> {
  const currencies = await client.get<CoinGateCurrency[]>('/currencies');

  if (!Array.isArray(currencies)) return [];

  const units: PaymentUnit[] = [];
  const seen = new Set<string>();

  for (const currency of currencies) {
    const code = (currency.symbol ?? '').toUpperCase();
    if (!code) continue;

    const kind = mapKind(currency.type);

    if (currency.platforms && currency.platforms.length > 0) {
      // One unit per platform to preserve network/chain information.
      for (const platform of currency.platforms) {
        const network = platform.symbol ?? platform.title;
        const dedupeKey = `${code}:${network ?? ''}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        units.push({
          code,
          label: `${currency.title} (${platform.title})`,
          kind,
          symbol: code,
          ...(network ? { network } : {}),
          providerMetadata: {
            currencyId: currency.id,
            platformId: platform.id,
            platformTitle: platform.title,
          },
        });
      }
    } else {
      const dedupeKey = `${code}:`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      units.push({
        code,
        label: currency.title,
        kind,
        symbol: code,
        providerMetadata: {
          currencyId: currency.id,
        },
      });
    }
  }

  return units.sort((a, b) => a.code.localeCompare(b.code));
}
