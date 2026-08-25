// src/payments/providers/stripe/stripe.payouts.spec.ts
//
// Unit tests for stripe.payouts.ts helpers.
// No real Stripe API calls — mock client objects passed directly.

import {
  mapStripePayoutStatus,
  mapStripePayoutToSummary,
  mapStripePayoutToDetail,
  listStripePayouts,
  getStripePayout,
} from './stripe.payouts';
import type Stripe from 'stripe';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOUNT_ID = 'cred_abc123';

function makePayout(
  overrides: Partial<Record<string, unknown>> = {},
): Stripe.Payout {
  return {
    id: 'po_test_001',
    object: 'payout',
    amount: 10000,
    currency: 'aud',
    status: 'paid',
    method: 'standard',
    type: 'bank_account',
    automatic: true,
    created: 1700000000,
    arrival_date: 1700259200,
    description: null,
    destination: null,
    balance_transaction: 'txn_001',
    failure_balance_transaction: null,
    failure_code: null,
    failure_message: null,
    metadata: {},
    statement_descriptor: null,
    source_type: 'card',
    ...overrides,
  } as unknown as Stripe.Payout;
}

function makeBankAccountDest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ba_test_001',
    object: 'bank_account',
    bank_name: 'STRIPE TEST BANK',
    last4: '6789',
    ...overrides,
  };
}

function makeMockClient(
  overrides: {
    listResult?: Partial<Stripe.ApiList<Stripe.Payout>>;
    retrieveResult?: Partial<Stripe.Payout>;
    listFn?: jest.Mock;
    retrieveFn?: jest.Mock;
  } = {},
): Stripe {
  const listFn =
    overrides.listFn ??
    jest.fn().mockResolvedValue({
      data: overrides.listResult?.data ?? [makePayout()],
      has_more: overrides.listResult?.has_more ?? false,
      ...overrides.listResult,
    });

  const retrieveFn =
    overrides.retrieveFn ??
    jest.fn().mockResolvedValue(overrides.retrieveResult ?? makePayout());

  return {
    payouts: { list: listFn, retrieve: retrieveFn },
  } as unknown as Stripe;
}

// ─── Status mapping ───────────────────────────────────────────────────────────

describe('mapStripePayoutStatus()', () => {
  it.each([
    ['pending', 'pending'],
    ['in_transit', 'in_transit'],
    ['paid', 'paid'],
    ['failed', 'failed'],
    ['canceled', 'cancelled'], // Stripe uses US spelling; canonical uses double-l
  ] as const)(
    'maps Stripe "%s" → canonical "%s"',
    (stripeStatus, canonical) => {
      const payout = makePayout({ status: stripeStatus });
      expect(mapStripePayoutStatus(payout)).toBe(canonical);
    },
  );

  it('maps unknown status → "unknown"', () => {
    const payout = makePayout({ status: 'some_future_status' });
    expect(mapStripePayoutStatus(payout)).toBe('unknown');
  });
});

// ─── mapStripePayoutToSummary ─────────────────────────────────────────────────

describe('mapStripePayoutToSummary()', () => {
  it('id equals providerPayoutId', () => {
    const s = mapStripePayoutToSummary(makePayout(), ACCOUNT_ID);
    expect(s.id).toBe(s.providerPayoutId);
    expect(s.id).toBe('po_test_001');
  });

  it('sets providerKey to "stripe"', () => {
    const s = mapStripePayoutToSummary(makePayout(), ACCOUNT_ID);
    expect(s.providerKey).toBe('stripe');
  });

  it('preserves amountMinor and currency', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ amount: 5000, currency: 'usd' }),
      ACCOUNT_ID,
    );
    expect(s.amountMinor).toBe(5000);
    expect(s.currency).toBe('usd');
  });

  it('maps Stripe unix timestamp to Date for createdAt', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ created: 1700000000 }),
      ACCOUNT_ID,
    );
    expect(s.createdAt).toBeInstanceOf(Date);
    expect(s.createdAt.getTime()).toBe(1700000000 * 1000);
  });

  it('maps arrival_date to estimatedArrivalAt', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ arrival_date: 1700259200 }),
      ACCOUNT_ID,
    );
    expect(s.estimatedArrivalAt).toBeInstanceOf(Date);
    expect(s.estimatedArrivalAt!.getTime()).toBe(1700259200 * 1000);
  });

  it('sets estimatedArrivalAt to undefined when arrival_date is missing', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ arrival_date: null }),
      ACCOUNT_ID,
    );
    expect(s.estimatedArrivalAt).toBeUndefined();
  });

  it('sets automatic flag', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ automatic: true }),
      ACCOUNT_ID,
    );
    expect(s.automatic).toBe(true);
  });

  it('preserves method and type fields', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ method: 'instant', type: 'bank_account' }),
      ACCOUNT_ID,
    );
    expect(s.method).toBe('instant');
    expect(s.type).toBe('bank_account');
  });

  it('extracts safe metadata', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ metadata: { ref: 'order-123', secret: 'sk_live_x' } }),
      ACCOUNT_ID,
    );
    // string values are included — it is the callers responsibility to avoid
    // storing secrets in metadata; the adapter copies string values faithfully
    expect(s.metadata).toEqual({ ref: 'order-123', secret: 'sk_live_x' });
  });

  it('returns undefined metadata when metadata is empty', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ metadata: {} }),
      ACCOUNT_ID,
    );
    expect(s.metadata).toBeUndefined();
  });

  it('sets destinationLabel for expanded bank account', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ destination: makeBankAccountDest() }),
      ACCOUNT_ID,
    );
    expect(s.destinationLabel).toBe('STRIPE TEST BANK •••• 6789');
    expect(s.destinationType).toBe('bank_account');
  });

  it('sets destinationLabel to undefined when destination is null', () => {
    const s = mapStripePayoutToSummary(
      makePayout({ destination: null }),
      ACCOUNT_ID,
    );
    expect(s.destinationLabel).toBeUndefined();
    expect(s.destinationType).toBe('unknown');
  });

  it('does not expose full bank account numbers — only last 4 digits', () => {
    const s = mapStripePayoutToSummary(
      makePayout({
        destination: makeBankAccountDest({
          last4: '1234',
          account_number: '000123456789',
        }),
      }),
      ACCOUNT_ID,
    );
    const json = JSON.stringify(s);
    expect(json).not.toContain('000123456789');
    expect(json).toContain('1234');
  });

  it('does not contain credential values', () => {
    const s = mapStripePayoutToSummary(makePayout(), ACCOUNT_ID);
    const json = JSON.stringify(s);
    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_');
  });
});

// ─── mapStripePayoutToDetail ──────────────────────────────────────────────────

describe('mapStripePayoutToDetail()', () => {
  it('extends summary fields', () => {
    const d = mapStripePayoutToDetail(makePayout(), ACCOUNT_ID);
    expect(d.id).toBeDefined();
    expect(d.amountMinor).toBeDefined();
  });

  it('extracts balanceTransactionId from string reference', () => {
    const d = mapStripePayoutToDetail(
      makePayout({ balance_transaction: 'txn_abc' }),
      ACCOUNT_ID,
    );
    expect(d.balanceTransactionId).toBe('txn_abc');
  });

  it('extracts failureBalanceTransactionId', () => {
    const d = mapStripePayoutToDetail(
      makePayout({ failure_balance_transaction: 'txn_fail_001' }),
      ACCOUNT_ID,
    );
    expect(d.failureBalanceTransactionId).toBe('txn_fail_001');
  });

  it('extracts destinationId and destinationLast4 for bank account', () => {
    const d = mapStripePayoutToDetail(
      makePayout({
        destination: makeBankAccountDest({ id: 'ba_safe_001', last4: '4242' }),
      }),
      ACCOUNT_ID,
    );
    expect(d.destinationId).toBe('ba_safe_001');
    expect(d.destinationLast4).toBe('4242');
    expect(d.destinationBankName).toBe('STRIPE TEST BANK');
  });

  it('includes sourceType when present', () => {
    const d = mapStripePayoutToDetail(
      makePayout({ source_type: 'card' }),
      ACCOUNT_ID,
    );
    expect(d.sourceType).toBe('card');
  });

  it('includes statementDescriptor when present', () => {
    const d = mapStripePayoutToDetail(
      makePayout({ statement_descriptor: 'MYCO PAYOUT' }),
      ACCOUNT_ID,
    );
    expect(d.statementDescriptor).toBe('MYCO PAYOUT');
  });
});

// ─── listStripePayouts ────────────────────────────────────────────────────────

describe('listStripePayouts()', () => {
  it('returns paginated results', async () => {
    const client = makeMockClient({
      listResult: {
        data: [makePayout(), makePayout({ id: 'po_002' })],
        has_more: false,
      },
    });
    const result = await listStripePayouts(client, ACCOUNT_ID, {});
    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(false);
  });

  it('sets nextCursor to the last item id when has_more is true', async () => {
    const last = makePayout({ id: 'po_last' });
    const client = makeMockClient({
      listResult: { data: [makePayout(), last], has_more: true },
    });
    const result = await listStripePayouts(client, ACCOUNT_ID, {});
    expect(result.nextCursor).toBe('po_last');
  });

  it('sets nextCursor to undefined when has_more is false', async () => {
    const client = makeMockClient({
      listResult: { data: [makePayout()], has_more: false },
    });
    const result = await listStripePayouts(client, ACCOUNT_ID, {});
    expect(result.nextCursor).toBeUndefined();
  });

  it('passes cursor as starting_after to Stripe', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ listFn });
    await listStripePayouts(client, ACCOUNT_ID, { cursor: 'po_cursor' });
    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ starting_after: 'po_cursor' }),
    );
  });

  it('passes currency (lowercased) to Stripe', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ listFn });
    await listStripePayouts(client, ACCOUNT_ID, { currency: 'AUD' });
    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'aud' }),
    );
  });

  it('passes status filter to Stripe', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ listFn });
    await listStripePayouts(client, ACCOUNT_ID, { status: 'paid' });
    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paid' }),
    );
  });

  it('maps canonical "cancelled" back to Stripe "canceled" for the filter', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ listFn });
    await listStripePayouts(client, ACCOUNT_ID, { status: 'cancelled' });
    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' }),
    );
  });

  it('filters by po_ prefix search client-side', async () => {
    const match = makePayout({ id: 'po_target' });
    const other = makePayout({ id: 'po_other' });
    const client = makeMockClient({
      listResult: { data: [match, other], has_more: false },
    });
    const result = await listStripePayouts(client, ACCOUNT_ID, {
      search: 'po_target',
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].providerPayoutId).toBe('po_target');
  });

  it('caps limit at 100', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ listFn });
    await listStripePayouts(client, ACCOUNT_ID, { limit: 999 });
    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it('returned data contains no credential values', async () => {
    const client = makeMockClient();
    const result = await listStripePayouts(client, ACCOUNT_ID, {});
    expect(JSON.stringify(result)).not.toContain('secretKey');
    expect(JSON.stringify(result)).not.toContain('sk_');
  });
});

// ─── getStripePayout ──────────────────────────────────────────────────────────

describe('getStripePayout()', () => {
  it('returns a PayoutDetail', async () => {
    const client = makeMockClient({
      retrieveResult: makePayout({ destination: makeBankAccountDest() }),
    });
    const detail = await getStripePayout(client, ACCOUNT_ID, 'po_test_001');
    expect(detail.providerPayoutId).toBe('po_test_001');
    expect(detail.destinationLabel).toBeDefined();
  });

  it('calls retrieve with expand on destination and balance_transaction', async () => {
    const retrieveFn = jest
      .fn()
      .mockResolvedValue(makePayout({ destination: makeBankAccountDest() }));
    const client = makeMockClient({ retrieveFn });
    await getStripePayout(client, ACCOUNT_ID, 'po_test_001');
    expect(retrieveFn).toHaveBeenCalledWith(
      'po_test_001',
      expect.objectContaining({
        expand: expect.arrayContaining(['destination', 'balance_transaction']),
      }),
    );
  });

  it('does not expose full bank account numbers', async () => {
    const client = makeMockClient({
      retrieveResult: makePayout({
        destination: makeBankAccountDest({ account_number: '000123456789' }),
      }),
    });
    const detail = await getStripePayout(client, ACCOUNT_ID, 'po_test_001');
    const json = JSON.stringify(detail);
    expect(json).not.toContain('000123456789');
  });
});
