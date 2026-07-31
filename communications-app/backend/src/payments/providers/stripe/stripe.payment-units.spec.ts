// src/payments/providers/stripe/stripe.payment-units.spec.ts
//
// Unit tests for listStripePaymentUnits.
// Stripe SDK client is fully mocked — no network calls.

import { listStripePaymentUnits } from './stripe.payments';
import type Stripe from 'stripe';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeIntent(currency: string): Partial<Stripe.PaymentIntent> {
  return { id: `pi_${currency}`, currency };
}

function makeBalanceLine(currency: string): Partial<Stripe.Balance.Available> {
  return { amount: 1000, currency, source_types: {} };
}

function makeStripeClient(
  intentsCurrencies: string[],
  balanceCurrencies: string[],
): Partial<Stripe> {
  return {
    paymentIntents: {
      list: jest.fn().mockResolvedValue({
        data: intentsCurrencies.map(makeIntent),
        has_more: false,
      }),
    } as unknown as Stripe['paymentIntents'],
    balance: {
      retrieve: jest.fn().mockResolvedValue({
        available: balanceCurrencies.map(makeBalanceLine),
        pending: [],
      }),
    } as unknown as Stripe['balance'],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('listStripePaymentUnits()', () => {
  it('returns uppercase codes from PaymentIntents', async () => {
    const client = makeStripeClient(['aud'], []);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units).toHaveLength(1);
    expect(units[0].code).toBe('AUD');
  });

  it('returns uppercase codes from Balance', async () => {
    const client = makeStripeClient([], ['usd']);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units).toHaveLength(1);
    expect(units[0].code).toBe('USD');
  });

  it('merges and deduplicates codes from PaymentIntents and Balance', async () => {
    const client = makeStripeClient(['aud', 'usd'], ['usd', 'eur']);
    const units = await listStripePaymentUnits(client as Stripe);

    const codes = units.map((u) => u.code).sort();
    expect(codes).toEqual(['AUD', 'EUR', 'USD']);
  });

  it('deduplicates when the same code appears multiple times in PaymentIntents', async () => {
    const client = makeStripeClient(['aud', 'aud', 'aud'], []);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units).toHaveLength(1);
    expect(units[0].code).toBe('AUD');
  });

  it('returns codes sorted alphabetically', async () => {
    const client = makeStripeClient(['usd', 'aud', 'eur'], []);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units.map((u) => u.code)).toEqual(['AUD', 'EUR', 'USD']);
  });

  it('returns kind=fiat for all Stripe units', async () => {
    const client = makeStripeClient(['aud'], []);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units.every((u) => u.kind === 'fiat')).toBe(true);
  });

  it('label equals the uppercase code when provider supplies no friendly name', async () => {
    const client = makeStripeClient(['aud'], []);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units[0].label).toBe('AUD');
  });

  it('returns empty array when no intents and no balance currencies exist', async () => {
    const client = makeStripeClient([], []);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units).toEqual([]);
  });

  it('does not return a global hardcoded currency list — only provider data', async () => {
    // Only AUD is present in the Stripe account.
    const client = makeStripeClient(['aud'], []);
    const units = await listStripePaymentUnits(client as Stripe);

    expect(units).toHaveLength(1);
    // Ensure common non-AUD codes are absent — they would appear if a global
    // catalogue were being returned.
    const codes = units.map((u) => u.code);
    expect(codes).not.toContain('USD');
    expect(codes).not.toContain('EUR');
    expect(codes).not.toContain('GBP');
  });

  it('recovers from PaymentIntents error and falls back to balance only', async () => {
    const client: Partial<Stripe> = {
      paymentIntents: {
        list: jest.fn().mockRejectedValue(new Error('API error')),
      } as unknown as Stripe['paymentIntents'],
      balance: {
        retrieve: jest.fn().mockResolvedValue({
          available: [makeBalanceLine('usd')],
          pending: [],
        }),
      } as unknown as Stripe['balance'],
    };

    const units = await listStripePaymentUnits(client as Stripe);

    expect(units).toHaveLength(1);
    expect(units[0].code).toBe('USD');
  });

  it('recovers from balance error and returns PaymentIntents currencies only', async () => {
    const client: Partial<Stripe> = {
      paymentIntents: {
        list: jest.fn().mockResolvedValue({
          data: [makeIntent('aud')],
          has_more: false,
        }),
      } as unknown as Stripe['paymentIntents'],
      balance: {
        retrieve: jest.fn().mockRejectedValue(new Error('Balance unavailable')),
      } as unknown as Stripe['balance'],
    };

    const units = await listStripePaymentUnits(client as Stripe);

    expect(units).toHaveLength(1);
    expect(units[0].code).toBe('AUD');
  });
});
