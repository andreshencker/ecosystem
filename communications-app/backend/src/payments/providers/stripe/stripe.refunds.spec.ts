// src/payments/providers/stripe/stripe.refunds.spec.ts
//
// Unit tests for stripe.refunds.ts helpers.
// No real Stripe API calls — mock client objects are passed directly.

import {
  mapStripeRefundStatus,
  mapStripeRefundToSummary,
  mapStripeRefundToDetail,
  listStripeRefunds,
  getStripeRefund,
  createStripeRefund,
} from './stripe.refunds';
import {
  PaymentCredentialsInvalidError,
  PaymentProviderUnavailableError,
} from '../../errors/payment.errors';
import type Stripe from 'stripe';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOUNT_ID = 'cred_refund_abc';
const REFUND_ID = 're_test_001';
const PAYMENT_INTENT_ID = 'pi_test_001';
const CHARGE_ID = 'ch_test_001';

function makeStripeRefund(
  overrides: Partial<Record<string, unknown>> = {},
): Stripe.Refund {
  return {
    id: REFUND_ID,
    object: 'refund',
    amount: 2500,
    currency: 'aud',
    status: 'succeeded',
    created: 1700000000,
    payment_intent: PAYMENT_INTENT_ID,
    charge: CHARGE_ID,
    reason: null,
    receipt_number: null,
    balance_transaction: null,
    metadata: {},
    ...overrides,
  } as unknown as Stripe.Refund;
}

function makeStripeCharge(
  overrides: Partial<Record<string, unknown>> = {},
): Stripe.Charge {
  return {
    id: CHARGE_ID,
    object: 'charge',
    amount: 5000,
    amount_refunded: 2500,
    currency: 'aud',
    ...overrides,
  } as unknown as Stripe.Charge;
}

function makeStripePaymentIntent(
  overrides: Partial<Record<string, unknown>> = {},
): Stripe.PaymentIntent {
  return {
    id: PAYMENT_INTENT_ID,
    object: 'payment_intent',
    status: 'succeeded',
    amount: 5000,
    amount_received: 5000,
    currency: 'aud',
    latest_charge: makeStripeCharge(),
    ...overrides,
  } as unknown as Stripe.PaymentIntent;
}

function makeMockClient(
  overrides: {
    refundsListFn?: jest.Mock;
    refundsRetrieveFn?: jest.Mock;
    refundsCreateFn?: jest.Mock;
    paymentIntentsRetrieveFn?: jest.Mock;
  } = {},
): Stripe {
  return {
    refunds: {
      list:
        overrides.refundsListFn ??
        jest.fn().mockResolvedValue({ data: [], has_more: false }),
      retrieve:
        overrides.refundsRetrieveFn ??
        jest.fn().mockResolvedValue(makeStripeRefund()),
      create:
        overrides.refundsCreateFn ??
        jest.fn().mockResolvedValue(makeStripeRefund()),
    },
    paymentIntents: {
      retrieve:
        overrides.paymentIntentsRetrieveFn ??
        jest.fn().mockResolvedValue(makeStripePaymentIntent()),
    },
  } as unknown as Stripe;
}

// ─── mapStripeRefundStatus ─────────────────────────────────────────────────────

describe('mapStripeRefundStatus()', () => {
  it('maps "succeeded" → "succeeded"', () => {
    expect(
      mapStripeRefundStatus(makeStripeRefund({ status: 'succeeded' })),
    ).toBe('succeeded');
  });

  it('maps "pending" → "pending"', () => {
    expect(mapStripeRefundStatus(makeStripeRefund({ status: 'pending' }))).toBe(
      'pending',
    );
  });

  it('maps "requires_action" → "requires_action"', () => {
    expect(
      mapStripeRefundStatus(makeStripeRefund({ status: 'requires_action' })),
    ).toBe('requires_action');
  });

  it('maps "failed" → "failed"', () => {
    expect(mapStripeRefundStatus(makeStripeRefund({ status: 'failed' }))).toBe(
      'failed',
    );
  });

  it('maps "canceled" (Stripe US spelling) → "cancelled" (canonical)', () => {
    // Stripe uses US "canceled" — canonical contract uses British "cancelled".
    expect(
      mapStripeRefundStatus(makeStripeRefund({ status: 'canceled' })),
    ).toBe('cancelled');
  });

  it('maps unknown status → "unknown"', () => {
    expect(
      mapStripeRefundStatus(makeStripeRefund({ status: 'unknown_future' })),
    ).toBe('unknown');
  });

  it('maps null/undefined status → "unknown"', () => {
    expect(mapStripeRefundStatus(makeStripeRefund({ status: null }))).toBe(
      'unknown',
    );
  });
});

// ─── mapStripeRefundToSummary ──────────────────────────────────────────────────

describe('mapStripeRefundToSummary()', () => {
  it('maps a succeeded refund correctly', () => {
    const refund = makeStripeRefund({ id: 're_abc', status: 'succeeded' });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);

    expect(result.id).toBe('re_abc');
    expect(result.providerRefundId).toBe('re_abc');
    expect(result.status).toBe('succeeded');
    expect(result.providerKey).toBe('stripe');
    expect(result.accountId).toBe(ACCOUNT_ID);
  });

  it('preserves amountMinor exactly', () => {
    const result = mapStripeRefundToSummary(
      makeStripeRefund({ amount: 12345 }),
      ACCOUNT_ID,
    );
    expect(result.amountMinor).toBe(12345);
  });

  it('preserves currency in lowercase', () => {
    const result = mapStripeRefundToSummary(
      makeStripeRefund({ currency: 'usd' }),
      ACCOUNT_ID,
    );
    expect(result.currency).toBe('usd');
  });

  it('converts unix timestamp to Date', () => {
    const ts = 1700000000;
    const result = mapStripeRefundToSummary(
      makeStripeRefund({ created: ts }),
      ACCOUNT_ID,
    );
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(ts * 1000);
  });

  it('extracts providerPaymentId from payment_intent string', () => {
    const refund = makeStripeRefund({ payment_intent: 'pi_xyz' });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.providerPaymentId).toBe('pi_xyz');
  });

  it('extracts providerPaymentId from expanded payment_intent object', () => {
    const refund = makeStripeRefund({
      payment_intent: { id: 'pi_expanded', object: 'payment_intent' },
    });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.providerPaymentId).toBe('pi_expanded');
  });

  it('extracts providerChargeId from charge string', () => {
    const refund = makeStripeRefund({ charge: 'ch_xyz' });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.providerChargeId).toBe('ch_xyz');
  });

  it('extracts providerChargeId from expanded charge object', () => {
    const refund = makeStripeRefund({
      charge: { id: 'ch_expanded', object: 'charge' },
    });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.providerChargeId).toBe('ch_expanded');
  });

  it('copies only string values from metadata', () => {
    const refund = makeStripeRefund({
      metadata: { key1: 'value1', numeric: 123, bool: true },
    });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.metadata).toBeDefined();
    expect(result.metadata!['key1']).toBe('value1');
    expect(result.metadata).not.toHaveProperty('numeric');
    expect(result.metadata).not.toHaveProperty('bool');
  });

  it('metadata is undefined when empty', () => {
    const refund = makeStripeRefund({ metadata: {} });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.metadata).toBeUndefined();
  });

  it('maps reason from refund.reason', () => {
    const refund = makeStripeRefund({ reason: 'fraudulent' });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.reason).toBe('fraudulent');
  });

  it('reason is undefined when reason is null', () => {
    const refund = makeStripeRefund({ reason: null });
    const result = mapStripeRefundToSummary(refund, ACCOUNT_ID);
    expect(result.reason).toBeUndefined();
  });
});

// ─── mapStripeRefundToDetail ───────────────────────────────────────────────────

describe('mapStripeRefundToDetail()', () => {
  it('includes summary fields', () => {
    const refund = makeStripeRefund({ id: 're_detail_001' });
    const result = mapStripeRefundToDetail(refund, ACCOUNT_ID);
    expect(result.id).toBe('re_detail_001');
    expect(result.providerKey).toBe('stripe');
    expect(result.accountId).toBe(ACCOUNT_ID);
  });

  it('includes charge-level amounts when charge is provided', () => {
    const refund = makeStripeRefund({ amount: 2500 });
    const charge = makeStripeCharge({
      amount: 5000,
      amount_refunded: 2500,
    });
    const result = mapStripeRefundToDetail(refund, ACCOUNT_ID, charge);

    expect(result.paymentAmountMinor).toBe(5000);
    expect(result.refundedAmountMinor).toBe(2500);
    expect(result.remainingRefundableAmountMinor).toBe(2500);
  });

  it('charge amounts are undefined when no charge is provided', () => {
    const refund = makeStripeRefund();
    const result = mapStripeRefundToDetail(refund, ACCOUNT_ID, null);

    expect(result.paymentAmountMinor).toBeUndefined();
    expect(result.refundedAmountMinor).toBeUndefined();
    expect(result.remainingRefundableAmountMinor).toBeUndefined();
  });

  it('sets balanceTransactionId from string balance_transaction', () => {
    const refund = makeStripeRefund({ balance_transaction: 'txn_abc' });
    const result = mapStripeRefundToDetail(refund, ACCOUNT_ID);
    expect(result.balanceTransactionId).toBe('txn_abc');
  });

  it('sets balanceTransactionId from expanded balance_transaction object', () => {
    const refund = makeStripeRefund({
      balance_transaction: {
        id: 'txn_expanded',
        object: 'balance_transaction',
      },
    });
    const result = mapStripeRefundToDetail(refund, ACCOUNT_ID);
    expect(result.balanceTransactionId).toBe('txn_expanded');
  });

  it('sets receiptNumber from refund.receipt_number', () => {
    const refund = makeStripeRefund({ receipt_number: 'REC-0001' });
    const result = mapStripeRefundToDetail(refund, ACCOUNT_ID);
    expect(result.receiptNumber).toBe('REC-0001');
  });

  it('providerMetadata matches summary metadata', () => {
    const refund = makeStripeRefund({ metadata: { order: 'ord_001' } });
    const result = mapStripeRefundToDetail(refund, ACCOUNT_ID);
    expect(result.providerMetadata).toEqual({ order: 'ord_001' });
  });
});

// ─── listStripeRefunds ─────────────────────────────────────────────────────────

describe('listStripeRefunds()', () => {
  it('calls refunds.list with limit', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    await listStripeRefunds(client, ACCOUNT_ID, { limit: 10 });

    expect(listFn).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('passes cursor as starting_after', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    await listStripeRefunds(client, ACCOUNT_ID, { cursor: 're_cursor_001' });

    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ starting_after: 're_cursor_001' }),
    );
  });

  it('returns mapped data', async () => {
    const refund = makeStripeRefund({ id: 're_xyz', amount: 3000 });
    const listFn = jest
      .fn()
      .mockResolvedValue({ data: [refund], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    const result = await listStripeRefunds(client, ACCOUNT_ID, {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('re_xyz');
    expect(result.data[0].amountMinor).toBe(3000);
  });

  it('sets hasMore and nextCursor correctly when has_more is true', async () => {
    const refund = makeStripeRefund({ id: 're_last' });
    const listFn = jest
      .fn()
      .mockResolvedValue({ data: [refund], has_more: true });
    const client = makeMockClient({ refundsListFn: listFn });

    const result = await listStripeRefunds(client, ACCOUNT_ID, {});

    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('re_last');
  });

  it('nextCursor is undefined when has_more is false', async () => {
    const refund = makeStripeRefund({ id: 're_only' });
    const listFn = jest
      .fn()
      .mockResolvedValue({ data: [refund], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    const result = await listStripeRefunds(client, ACCOUNT_ID, {});

    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('filters by payment_intent when search starts with pi_', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    await listStripeRefunds(client, ACCOUNT_ID, { search: 'pi_test_abc' });

    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_test_abc' }),
    );
  });

  it('filters by charge when search starts with ch_', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    await listStripeRefunds(client, ACCOUNT_ID, { search: 'ch_test_xyz' });

    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ charge: 'ch_test_xyz' }),
    );
  });

  it('filters by refund ID client-side when search starts with re_', async () => {
    const matchingRefund = makeStripeRefund({ id: 're_match' });
    const otherRefund = makeStripeRefund({ id: 're_other' });
    const listFn = jest.fn().mockResolvedValue({
      data: [matchingRefund, otherRefund],
      has_more: false,
    });
    const client = makeMockClient({ refundsListFn: listFn });

    const result = await listStripeRefunds(client, ACCOUNT_ID, {
      search: 're_match',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('re_match');
  });

  it('filters by currency client-side', async () => {
    const audRefund = makeStripeRefund({ id: 're_aud', currency: 'aud' });
    const usdRefund = makeStripeRefund({ id: 're_usd', currency: 'usd' });
    const listFn = jest
      .fn()
      .mockResolvedValue({ data: [audRefund, usdRefund], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    const result = await listStripeRefunds(client, ACCOUNT_ID, {
      currency: 'aud',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('re_aud');
  });

  it('applies createdFrom date filter client-side', async () => {
    const older = makeStripeRefund({ id: 're_old', created: 1000000000 });
    const newer = makeStripeRefund({ id: 're_new', created: 1700000000 });
    const listFn = jest
      .fn()
      .mockResolvedValue({ data: [older, newer], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    const result = await listStripeRefunds(client, ACCOUNT_ID, {
      createdFrom: new Date(1600000000000),
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('re_new');
  });

  it('caps limit at 100', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ refundsListFn: listFn });

    await listStripeRefunds(client, ACCOUNT_ID, { limit: 200 });

    const [calledParams] = listFn.mock.calls[0] as [{ limit: number }];
    expect(calledParams.limit).toBe(100);
  });
});

// ─── getStripeRefund ───────────────────────────────────────────────────────────

describe('getStripeRefund()', () => {
  it('calls refunds.retrieve with expand', async () => {
    const retrieveFn = jest.fn().mockResolvedValue(makeStripeRefund());
    const client = makeMockClient({ refundsRetrieveFn: retrieveFn });

    await getStripeRefund(client, ACCOUNT_ID, 're_test_abc');

    expect(retrieveFn).toHaveBeenCalledWith(
      're_test_abc',
      expect.objectContaining({
        expand: expect.arrayContaining([
          'balance_transaction',
          'charge',
        ]) as string[],
      }),
    );
  });

  it('returns a RefundDetail without raw Stripe object fields', async () => {
    const refund = makeStripeRefund({ id: 're_detail' });
    const retrieveFn = jest.fn().mockResolvedValue(refund);
    const client = makeMockClient({ refundsRetrieveFn: retrieveFn });

    const result = await getStripeRefund(client, ACCOUNT_ID, 're_detail');

    expect(result.id).toBe('re_detail');
    expect(result).not.toHaveProperty('object');
    expect(result).not.toHaveProperty('livemode');
  });

  it('does not include secret key in the returned result', async () => {
    const retrieveFn = jest.fn().mockResolvedValue(makeStripeRefund());
    const client = makeMockClient({ refundsRetrieveFn: retrieveFn });

    const result = await getStripeRefund(client, ACCOUNT_ID, 're_test_001');
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_');
    expect(json).not.toContain('secretKey');
  });
});

// ─── createStripeRefund ────────────────────────────────────────────────────────

describe('createStripeRefund()', () => {
  it('creates a full refund when amountMinor is omitted', async () => {
    const createFn = jest
      .fn()
      .mockResolvedValue(makeStripeRefund({ amount: 5000 }));
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        amount_received: 5000,
        latest_charge: makeStripeCharge({ amount: 5000, amount_refunded: 0 }),
      }),
    );
    const client = makeMockClient({
      refundsCreateFn: createFn,
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    const result = await createStripeRefund(client, ACCOUNT_ID, {
      paymentId: PAYMENT_INTENT_ID,
    });

    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: PAYMENT_INTENT_ID,
        amount: 5000,
      }),
    );
    expect(result.amountMinor).toBe(5000);
  });

  it('creates a partial refund when amountMinor is specified', async () => {
    const createFn = jest
      .fn()
      .mockResolvedValue(makeStripeRefund({ amount: 1000 }));
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        amount_received: 5000,
        latest_charge: makeStripeCharge({ amount: 5000, amount_refunded: 0 }),
      }),
    );
    const client = makeMockClient({
      refundsCreateFn: createFn,
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await createStripeRefund(client, ACCOUNT_ID, {
      paymentId: PAYMENT_INTENT_ID,
      amountMinor: 1000,
    });

    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000 }),
    );
  });

  it('throws PaymentCredentialsInvalidError when payment is not succeeded', async () => {
    const intentRetrieveFn = jest
      .fn()
      .mockResolvedValue(makeStripePaymentIntent({ status: 'processing' }));
    const client = makeMockClient({
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await expect(
      createStripeRefund(client, ACCOUNT_ID, {
        paymentId: PAYMENT_INTENT_ID,
      }),
    ).rejects.toThrow(PaymentCredentialsInvalidError);
  });

  it('throws PaymentCredentialsInvalidError when payment is already fully refunded', async () => {
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        amount_received: 5000,
        latest_charge: makeStripeCharge({
          amount: 5000,
          amount_refunded: 5000, // fully refunded
        }),
      }),
    );
    const client = makeMockClient({
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await expect(
      createStripeRefund(client, ACCOUNT_ID, {
        paymentId: PAYMENT_INTENT_ID,
      }),
    ).rejects.toThrow(PaymentCredentialsInvalidError);
  });

  it('throws PaymentCredentialsInvalidError when requested amount exceeds refundable', async () => {
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        amount_received: 5000,
        latest_charge: makeStripeCharge({
          amount: 5000,
          amount_refunded: 3000, // 2000 remaining
        }),
      }),
    );
    const client = makeMockClient({
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await expect(
      createStripeRefund(client, ACCOUNT_ID, {
        paymentId: PAYMENT_INTENT_ID,
        amountMinor: 3000, // exceeds refundable of 2000
      }),
    ).rejects.toThrow(PaymentCredentialsInvalidError);
  });

  it('throws PaymentCredentialsInvalidError when amount is zero', async () => {
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        amount_received: 5000,
        latest_charge: makeStripeCharge({ amount: 5000, amount_refunded: 0 }),
      }),
    );
    const client = makeMockClient({
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await expect(
      createStripeRefund(client, ACCOUNT_ID, {
        paymentId: PAYMENT_INTENT_ID,
        amountMinor: 0,
      }),
    ).rejects.toThrow(PaymentCredentialsInvalidError);
  });

  it('maps canonical reason "duplicate" to Stripe reason', async () => {
    const createFn = jest.fn().mockResolvedValue(makeStripeRefund());
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        latest_charge: makeStripeCharge({ amount: 5000, amount_refunded: 0 }),
      }),
    );
    const client = makeMockClient({
      refundsCreateFn: createFn,
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await createStripeRefund(client, ACCOUNT_ID, {
      paymentId: PAYMENT_INTENT_ID,
      reason: 'duplicate',
    });

    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'duplicate' }),
    );
  });

  it('omits reason from Stripe call when reason is "other" (no Stripe equivalent)', async () => {
    const createFn = jest.fn().mockResolvedValue(makeStripeRefund());
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        latest_charge: makeStripeCharge({ amount: 5000, amount_refunded: 0 }),
      }),
    );
    const client = makeMockClient({
      refundsCreateFn: createFn,
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await createStripeRefund(client, ACCOUNT_ID, {
      paymentId: PAYMENT_INTENT_ID,
      reason: 'other',
    });

    const [calledParams] = createFn.mock.calls[0] as [Record<string, unknown>];
    expect(calledParams).not.toHaveProperty('reason');
  });

  it('returned detail does not expose credential values', async () => {
    const createFn = jest.fn().mockResolvedValue(makeStripeRefund());
    const intentRetrieveFn = jest.fn().mockResolvedValue(
      makeStripePaymentIntent({
        latest_charge: makeStripeCharge({ amount: 5000, amount_refunded: 0 }),
      }),
    );
    const client = makeMockClient({
      refundsCreateFn: createFn,
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    const result = await createStripeRefund(client, ACCOUNT_ID, {
      paymentId: PAYMENT_INTENT_ID,
    });

    const json = JSON.stringify(result);
    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_');
  });

  it('propagates PaymentProviderUnavailableError from Stripe client errors', async () => {
    const intentRetrieveFn = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const client = makeMockClient({
      paymentIntentsRetrieveFn: intentRetrieveFn,
    });

    await expect(
      createStripeRefund(client, ACCOUNT_ID, {
        paymentId: PAYMENT_INTENT_ID,
      }),
    ).rejects.toThrow(PaymentProviderUnavailableError);
  });
});
