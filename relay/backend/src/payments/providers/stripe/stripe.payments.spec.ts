// src/payments/providers/stripe/stripe.payments.spec.ts
//
// Unit tests for stripe.payments.ts helpers.
// No real Stripe API calls — mock client objects are passed directly.

import {
  mapStripePaymentStatus,
  mapStripeIntentToSummary,
  mapStripeIntentToDetail,
  listStripePayments,
  getStripePayment,
} from './stripe.payments';
import { PaymentCanonicalStatus } from '../../enums/payment-canonical-status.enum';
import type Stripe from 'stripe';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOUNT_ID = 'cred_abc123';

/** Builds a minimal Stripe.PaymentIntent-shaped object. */
function makeIntent(
  overrides: Partial<Record<string, unknown>> = {},
): Stripe.PaymentIntent {
  return {
    id: 'pi_test_001',
    object: 'payment_intent',
    amount: 5000,
    currency: 'aud',
    status: 'succeeded',
    created: 1700000000,
    description: null,
    payment_method: null,
    last_payment_error: null,
    latest_charge: null,
    metadata: {},
    capture_method: 'automatic',
    confirmation_method: 'automatic',
    amount_received: 5000,
    amount_capturable: 0,
    ...overrides,
  } as unknown as Stripe.PaymentIntent;
}

/** Builds a minimal Stripe.PaymentMethod card object. */
function makeCardPm(brand = 'visa', last4 = '4242'): Stripe.PaymentMethod {
  return {
    id: 'pm_test_card',
    object: 'payment_method',
    type: 'card',
    card: { brand, last4 },
  } as unknown as Stripe.PaymentMethod;
}

/** Builds a mock Stripe client with controllable methods. */
function makeMockClient(
  overrides: {
    listResult?: Partial<Stripe.ApiList<Stripe.PaymentIntent>>;
    retrieveResult?: Partial<Stripe.PaymentIntent>;
    listFn?: jest.Mock;
    retrieveFn?: jest.Mock;
    searchFn?: jest.Mock;
  } = {},
): Stripe {
  const listFn =
    overrides.listFn ??
    jest.fn().mockResolvedValue({
      data: [],
      has_more: false,
      ...overrides.listResult,
    });
  const retrieveFn =
    overrides.retrieveFn ??
    jest.fn().mockResolvedValue(makeIntent(overrides.retrieveResult ?? {}));
  const searchFn =
    overrides.searchFn ??
    jest.fn().mockResolvedValue({
      data: [],
      has_more: false,
      next_page: undefined,
    });

  return {
    paymentIntents: {
      list: listFn,
      retrieve: retrieveFn,
      search: searchFn,
    },
  } as unknown as Stripe;
}

// ─── mapStripePaymentStatus ───────────────────────────────────────────────────

describe('mapStripePaymentStatus()', () => {
  it('maps "succeeded" → Succeeded', () => {
    expect(mapStripePaymentStatus(makeIntent({ status: 'succeeded' }))).toBe(
      PaymentCanonicalStatus.Succeeded,
    );
  });

  it('maps "processing" → Processing', () => {
    expect(mapStripePaymentStatus(makeIntent({ status: 'processing' }))).toBe(
      PaymentCanonicalStatus.Processing,
    );
  });

  it('maps "requires_action" → RequiresAction', () => {
    expect(
      mapStripePaymentStatus(makeIntent({ status: 'requires_action' })),
    ).toBe(PaymentCanonicalStatus.RequiresAction);
  });

  it('maps "requires_confirmation" → RequiresConfirmation', () => {
    expect(
      mapStripePaymentStatus(makeIntent({ status: 'requires_confirmation' })),
    ).toBe(PaymentCanonicalStatus.RequiresConfirmation);
  });

  it('maps "requires_capture" → RequiresCapture', () => {
    expect(
      mapStripePaymentStatus(makeIntent({ status: 'requires_capture' })),
    ).toBe(PaymentCanonicalStatus.RequiresCapture);
  });

  it('maps "canceled" → Cancelled', () => {
    expect(mapStripePaymentStatus(makeIntent({ status: 'canceled' }))).toBe(
      PaymentCanonicalStatus.Cancelled,
    );
  });

  it('maps "requires_payment_method" with last_payment_error → Failed', () => {
    const intent = makeIntent({
      status: 'requires_payment_method',
      last_payment_error: { code: 'card_declined', message: 'declined' },
    });
    expect(mapStripePaymentStatus(intent)).toBe(PaymentCanonicalStatus.Failed);
  });

  it('maps "requires_payment_method" without error → Pending', () => {
    const intent = makeIntent({
      status: 'requires_payment_method',
      last_payment_error: null,
    });
    expect(mapStripePaymentStatus(intent)).toBe(PaymentCanonicalStatus.Pending);
  });

  it('maps unknown status → Pending (default)', () => {
    const intent = makeIntent({ status: 'unknown_future_status' });
    expect(mapStripePaymentStatus(intent)).toBe(PaymentCanonicalStatus.Pending);
  });
});

// ─── mapStripeIntentToSummary ─────────────────────────────────────────────────

describe('mapStripeIntentToSummary()', () => {
  it('maps a succeeded intent correctly', () => {
    const intent = makeIntent({ status: 'succeeded', id: 'pi_abc' });
    const result = mapStripeIntentToSummary(intent, ACCOUNT_ID);

    expect(result.id).toBe('pi_abc');
    expect(result.providerPaymentId).toBe('pi_abc');
    expect(result.status).toBe(PaymentCanonicalStatus.Succeeded);
    expect(result.providerKey).toBe('stripe');
    expect(result.accountId).toBe(ACCOUNT_ID);
  });

  it('preserves amountMinor exactly', () => {
    const result = mapStripeIntentToSummary(
      makeIntent({ amount: 12345 }),
      ACCOUNT_ID,
    );
    expect(result.amountMinor).toBe(12345);
  });

  it('preserves currency in lowercase', () => {
    const result = mapStripeIntentToSummary(
      makeIntent({ currency: 'aud' }),
      ACCOUNT_ID,
    );
    expect(result.currency).toBe('aud');
  });

  it('converts unix timestamp to Date', () => {
    const ts = 1700000000;
    const result = mapStripeIntentToSummary(
      makeIntent({ created: ts }),
      ACCOUNT_ID,
    );
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(ts * 1000);
  });

  it('maps failureCode from last_payment_error.code', () => {
    const intent = makeIntent({
      status: 'requires_payment_method',
      last_payment_error: { code: 'card_declined', message: 'declined' },
    });
    const result = mapStripeIntentToSummary(intent, ACCOUNT_ID);
    expect(result.failureCode).toBe('card_declined');
  });

  it('maps declineCode from last_payment_error.decline_code', () => {
    const intent = makeIntent({
      status: 'requires_payment_method',
      last_payment_error: {
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'insufficient funds',
      },
    });
    const result = mapStripeIntentToSummary(intent, ACCOUNT_ID);
    expect(result.declineCode).toBe('insufficient_funds');
  });

  it('maps paymentMethodLabel for card with brand and last4', () => {
    const intent = makeIntent({
      status: 'succeeded',
      payment_method: makeCardPm('visa', '4242'),
    });
    const result = mapStripeIntentToSummary(intent, ACCOUNT_ID);
    expect(result.paymentMethodLabel).toBe('Visa •••• 4242');
  });

  it('sets requiresUserAction true only for requires_action', () => {
    const actionRequired = makeIntent({ status: 'requires_action' });
    const succeeded = makeIntent({ status: 'succeeded' });
    expect(
      mapStripeIntentToSummary(actionRequired, ACCOUNT_ID).requiresUserAction,
    ).toBe(true);
    expect(
      mapStripeIntentToSummary(succeeded, ACCOUNT_ID).requiresUserAction,
    ).toBe(false);
  });
});

// ─── mapStripeIntentToDetail ──────────────────────────────────────────────────

describe('mapStripeIntentToDetail()', () => {
  it('includes captureMethod from intent', () => {
    const intent = makeIntent({ capture_method: 'manual' });
    const result = mapStripeIntentToDetail(intent, ACCOUNT_ID);
    expect(result.captureMethod).toBe('manual');
  });

  it('includes amountReceivedMinor', () => {
    const intent = makeIntent({ amount_received: 7500 });
    const result = mapStripeIntentToDetail(intent, ACCOUNT_ID);
    expect(result.amountReceivedMinor).toBe(7500);
  });

  it('excludes graphify_ metadata keys', () => {
    const intent = makeIntent({
      metadata: {
        graphify_test_id: 'gfy_001',
        graphify_scenario: 'success',
        user_ref: 'order_abc',
      },
    });
    const result = mapStripeIntentToDetail(intent, ACCOUNT_ID);
    expect(result.providerMetadata).toBeDefined();
    expect(result.providerMetadata).not.toHaveProperty('graphify_test_id');
    expect(result.providerMetadata).not.toHaveProperty('graphify_scenario');
  });

  it('preserves non-graphify metadata', () => {
    const intent = makeIntent({
      metadata: {
        graphify_internal: 'skip',
        user_order_id: 'ord_123',
        customer_note: 'rush',
      },
    });
    const result = mapStripeIntentToDetail(intent, ACCOUNT_ID);
    expect(result.providerMetadata).toEqual({
      user_order_id: 'ord_123',
      customer_note: 'rush',
    });
  });

  it('providerMetadata is undefined when all metadata is graphify_ prefixed', () => {
    const intent = makeIntent({
      metadata: { graphify_test_id: 'x', graphify_ref: 'y' },
    });
    const result = mapStripeIntentToDetail(intent, ACCOUNT_ID);
    expect(result.providerMetadata).toBeUndefined();
  });

  it('providerMetadata is undefined when metadata is empty', () => {
    const intent = makeIntent({ metadata: {} });
    const result = mapStripeIntentToDetail(intent, ACCOUNT_ID);
    expect(result.providerMetadata).toBeUndefined();
  });
});

// ─── listStripePayments ───────────────────────────────────────────────────────

describe('listStripePayments()', () => {
  it('calls paymentIntents.list with correct params', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ listFn });

    await listStripePayments(client, ACCOUNT_ID, {
      limit: 10,
      currency: 'usd',
    });

    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, currency: 'usd' }),
    );
  });

  it('returns mapped data from provider', async () => {
    const intent = makeIntent({ id: 'pi_xyz', amount: 2000, currency: 'aud' });
    const listFn = jest.fn().mockResolvedValue({
      data: [intent],
      has_more: false,
    });
    const client = makeMockClient({ listFn });

    const result = await listStripePayments(client, ACCOUNT_ID, {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('pi_xyz');
    expect(result.data[0].amountMinor).toBe(2000);
  });

  it('passes cursor as starting_after', async () => {
    const listFn = jest.fn().mockResolvedValue({ data: [], has_more: false });
    const client = makeMockClient({ listFn });

    await listStripePayments(client, ACCOUNT_ID, { cursor: 'pi_cursor_001' });

    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ starting_after: 'pi_cursor_001' }),
    );
  });

  it('sets hasMore true when Stripe returns has_more=true', async () => {
    const intent = makeIntent({ id: 'pi_last' });
    const listFn = jest.fn().mockResolvedValue({
      data: [intent],
      has_more: true,
    });
    const client = makeMockClient({ listFn });

    const result = await listStripePayments(client, ACCOUNT_ID, {});

    expect(result.hasMore).toBe(true);
  });

  it('sets nextCursor to last item id when has_more is true', async () => {
    const intent = makeIntent({ id: 'pi_last_item' });
    const listFn = jest.fn().mockResolvedValue({
      data: [intent],
      has_more: true,
    });
    const client = makeMockClient({ listFn });

    const result = await listStripePayments(client, ACCOUNT_ID, {});

    expect(result.nextCursor).toBe('pi_last_item');
  });

  it('nextCursor is undefined when has_more is false', async () => {
    const intent = makeIntent({ id: 'pi_only' });
    const listFn = jest.fn().mockResolvedValue({
      data: [intent],
      has_more: false,
    });
    const client = makeMockClient({ listFn });

    const result = await listStripePayments(client, ACCOUNT_ID, {});

    expect(result.nextCursor).toBeUndefined();
  });

  it('applies status filter client-side', async () => {
    const succeeded = makeIntent({ id: 'pi_s', status: 'succeeded' });
    const failed = makeIntent({
      id: 'pi_f',
      status: 'requires_payment_method',
      last_payment_error: { code: 'card_declined', message: 'declined' },
    });
    const listFn = jest.fn().mockResolvedValue({
      data: [succeeded, failed],
      has_more: false,
    });
    const client = makeMockClient({ listFn });

    const result = await listStripePayments(client, ACCOUNT_ID, {
      status: 'succeeded',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('pi_s');
  });

  it('uses search API when search param is provided', async () => {
    const searchFn = jest.fn().mockResolvedValue({
      data: [],
      has_more: false,
      next_page: undefined,
    });
    const client = makeMockClient({ searchFn });

    await listStripePayments(client, ACCOUNT_ID, { search: 'order_abc' });

    expect(searchFn).toHaveBeenCalled();
  });
});

// ─── getStripePayment ─────────────────────────────────────────────────────────

describe('getStripePayment()', () => {
  it('calls paymentIntents.retrieve with expand', async () => {
    const retrieveFn = jest.fn().mockResolvedValue(makeIntent());
    const client = makeMockClient({ retrieveFn });

    await getStripePayment(client, ACCOUNT_ID, 'pi_test_abc');

    expect(retrieveFn).toHaveBeenCalledWith(
      'pi_test_abc',
      expect.objectContaining<{ expand: string[] }>({
        expand: expect.arrayContaining([
          'payment_method',
          'latest_charge',
        ]) as string[],
      }),
    );
  });

  it('returns a PaymentDetail with no raw Stripe object', async () => {
    const intent = makeIntent({
      id: 'pi_detail',
      object: 'payment_intent',
      livemode: false,
      client_secret: 'pi_secret_xxx',
    });
    const retrieveFn = jest.fn().mockResolvedValue(intent);
    const client = makeMockClient({ retrieveFn });

    const result = await getStripePayment(client, ACCOUNT_ID, 'pi_detail');

    expect(result.id).toBe('pi_detail');
    expect(result).not.toHaveProperty('object');
    expect(result).not.toHaveProperty('livemode');
    expect(result).not.toHaveProperty('client_secret');
  });

  it('does not include secret key in the returned result', async () => {
    const retrieveFn = jest
      .fn()
      .mockResolvedValue(makeIntent({ id: 'pi_sec' }));
    const client = makeMockClient({ retrieveFn });

    const result = await getStripePayment(client, ACCOUNT_ID, 'pi_sec');
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_');
    expect(json).not.toContain('secretKey');
  });
});
