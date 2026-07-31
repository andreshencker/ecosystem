// src/payments/providers/stripe/stripe.testing.spec.ts
//
// Unit tests for stripe.testing.ts helpers.
// The Stripe SDK is fully mocked — no real API calls, no real credentials.

import Stripe from 'stripe';
import { getStripeTestScenarios, executeStripeTest } from './stripe.testing';
import { PaymentTestScenario } from '../../enums/payment-test-scenario.enum';

// ─── Stripe SDK mock ──────────────────────────────────────────────────────────

const mockPaymentIntentsCreate = jest.fn();

jest.mock('stripe', () => {
  // StripeError base — all error classes extend this so instanceof checks work
  class StripeError extends Error {
    code?: string;
    requestId?: string;
    statusCode?: number;
    type?: string;
    decline_code?: string;
    constructor(raw?: {
      message?: string;
      code?: string;
      requestId?: string;
      decline_code?: string;
    }) {
      super(raw?.message ?? 'StripeError');
      this.code = raw?.code;
      this.requestId = raw?.requestId ?? 'req_mock123';
      this.decline_code = raw?.decline_code;
    }
  }
  class StripeCardError extends StripeError {
    constructor(raw?: {
      message?: string;
      code?: string;
      requestId?: string;
      decline_code?: string;
    }) {
      super(raw);
      this.name = 'StripeCardError';
    }
  }
  class StripeInvalidRequestError extends StripeError {
    constructor(raw?: { message?: string; code?: string; requestId?: string }) {
      super(raw);
      this.name = 'StripeInvalidRequestError';
    }
  }
  class StripeAuthenticationError extends StripeError {
    constructor(raw?: { message?: string; requestId?: string }) {
      super(raw);
      this.name = 'StripeAuthenticationError';
    }
  }
  class StripePermissionError extends StripeError {
    constructor(raw?: { message?: string; requestId?: string }) {
      super(raw);
      this.name = 'StripePermissionError';
    }
  }
  class StripeConnectionError extends StripeError {
    constructor(raw?: { message?: string }) {
      super(raw);
      this.name = 'StripeConnectionError';
    }
  }
  class StripeRateLimitError extends StripeError {
    constructor(raw?: { message?: string }) {
      super(raw);
      this.name = 'StripeRateLimitError';
    }
  }
  class StripeAPIError extends StripeError {
    constructor(raw?: { message?: string }) {
      super(raw);
      this.name = 'StripeAPIError';
    }
  }

  const StripeErrors = {
    StripeError,
    StripeCardError,
    StripeInvalidRequestError,
    StripeAuthenticationError,
    StripePermissionError,
    StripeConnectionError,
    StripeRateLimitError,
    StripeAPIError,
  };

  const MockStripe = Object.assign(
    jest.fn().mockImplementation(() => ({
      paymentIntents: { create: mockPaymentIntentsCreate },
    })),
    { errors: StripeErrors },
  );
  return { __esModule: true, default: MockStripe };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ALL_SCENARIOS = Object.values(
  PaymentTestScenario,
) as PaymentTestScenario[];

function makeMockClient(): Stripe {
  return new Stripe('sk_test_mock', {} as Stripe.StripeConfig);
}

function makeSuccessParams(
  overrides: Partial<Parameters<typeof executeStripeTest>[2]> = {},
) {
  return {
    paymentMethodKey: 'card',
    amountMinor: 1000,
    currency: 'aud',
    scenario: PaymentTestScenario.Success,
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getStripeTestScenarios ───────────────────────────────────────────────────

describe('getStripeTestScenarios()', () => {
  it('returns all 7 scenarios for "card"', () => {
    const result = getStripeTestScenarios('card');
    expect(result).toHaveLength(7);
    expect(result).toEqual(ALL_SCENARIOS);
  });

  it('returns all 7 scenarios for "cartes_bancaires"', () => {
    expect(getStripeTestScenarios('cartes_bancaires')).toHaveLength(7);
  });

  it('returns all 7 scenarios for "jcb"', () => {
    expect(getStripeTestScenarios('jcb')).toHaveLength(7);
  });

  it('returns all 7 scenarios for "kr_card"', () => {
    expect(getStripeTestScenarios('kr_card')).toHaveLength(7);
  });

  it('includes ExpiredCard and IncorrectCvc in the list', () => {
    const result = getStripeTestScenarios('card');
    expect(result).toContain(PaymentTestScenario.ExpiredCard);
    expect(result).toContain(PaymentTestScenario.IncorrectCvc);
  });

  it('returns empty array for "apple_pay"', () => {
    expect(getStripeTestScenarios('apple_pay')).toEqual([]);
  });

  it('returns empty array for "google_pay"', () => {
    expect(getStripeTestScenarios('google_pay')).toEqual([]);
  });

  it('returns empty array for "paypal"', () => {
    expect(getStripeTestScenarios('paypal')).toEqual([]);
  });

  it('returns empty array for unknown method key', () => {
    expect(getStripeTestScenarios('unknown_method')).toEqual([]);
  });
});

// ─── No raw card numbers ──────────────────────────────────────────────────────

describe('executeStripeTest() — no raw card numbers', () => {
  it('uses payment_method (pm_card_*) not payment_method_data with raw card', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'succeeded',
    });

    const client = makeMockClient();
    await executeStripeTest(client, 'cred-1', makeSuccessParams());

    const call = (
      mockPaymentIntentsCreate.mock.calls[0] as unknown as [
        Record<string, unknown>,
      ]
    )[0];
    // Must use payment_method (pm_card_*), not payment_method_data with card numbers
    expect(call['payment_method']).toBeDefined();
    expect(call['payment_method']).toMatch(/^pm_card_/);
    expect(call['payment_method_data']).toBeUndefined();
  });

  it('Success scenario uses pm_card_visa', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_ok',
      status: 'succeeded',
    });

    const client = makeMockClient();
    await executeStripeTest(
      client,
      'cred-1',
      makeSuccessParams({ scenario: PaymentTestScenario.Success }),
    );

    expect(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0]['payment_method'],
    ).toBe('pm_card_visa');
  });

  it('CardDeclined scenario uses pm_card_chargeDeclined', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'declined',
        code: 'card_declined',
      }),
    );

    const client = makeMockClient();
    await executeStripeTest(
      client,
      'cred-1',
      makeSuccessParams({ scenario: PaymentTestScenario.CardDeclined }),
    );

    expect(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0]['payment_method'],
    ).toBe('pm_card_chargeDeclined');
  });

  it('InsufficientFunds scenario uses pm_card_chargeDeclinedInsufficientFunds', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'insufficient',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      }),
    );

    const client = makeMockClient();
    await executeStripeTest(
      client,
      'c',
      makeSuccessParams({ scenario: PaymentTestScenario.InsufficientFunds }),
    );

    expect(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0]['payment_method'],
    ).toBe('pm_card_chargeDeclinedInsufficientFunds');
  });

  it('ExpiredCard scenario uses pm_card_chargeDeclinedExpiredCard', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'expired',
        code: 'expired_card',
      }),
    );

    const client = makeMockClient();
    await executeStripeTest(
      client,
      'c',
      makeSuccessParams({ scenario: PaymentTestScenario.ExpiredCard }),
    );

    expect(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0]['payment_method'],
    ).toBe('pm_card_chargeDeclinedExpiredCard');
  });

  it('IncorrectCvc scenario uses pm_card_chargeDeclinedIncorrectCvc', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'cvc',
        code: 'incorrect_cvc',
      }),
    );

    const client = makeMockClient();
    await executeStripeTest(
      client,
      'c',
      makeSuccessParams({ scenario: PaymentTestScenario.IncorrectCvc }),
    );

    expect(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0]['payment_method'],
    ).toBe('pm_card_chargeDeclinedIncorrectCvc');
  });

  it('AuthenticationRequired scenario uses pm_card_authenticationRequired', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_3ds',
      status: 'requires_action',
    });

    const client = makeMockClient();
    await executeStripeTest(
      client,
      'c',
      makeSuccessParams({
        scenario: PaymentTestScenario.AuthenticationRequired,
      }),
    );

    expect(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0]['payment_method'],
    ).toBe('pm_card_authenticationRequired');
  });

  it('ProcessingError scenario uses pm_card_chargeDeclinedProcessingError', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'processing',
        code: 'processing_error',
      }),
    );

    const client = makeMockClient();
    await executeStripeTest(
      client,
      'c',
      makeSuccessParams({ scenario: PaymentTestScenario.ProcessingError }),
    );

    expect(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0]['payment_method'],
    ).toBe('pm_card_chargeDeclinedProcessingError');
  });

  it('never sends card.number in any call', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'succeeded',
    });

    const client = makeMockClient();
    await executeStripeTest(client, 'c', makeSuccessParams());

    const call = (
      mockPaymentIntentsCreate.mock.calls[0] as unknown as [
        Record<string, unknown>,
      ]
    )[0];
    const json = JSON.stringify(call);
    expect(json).not.toContain('"number"');
    expect(json).not.toContain('4242');
  });
});

// ─── executeStripeTest — success paths ───────────────────────────────────────

describe('executeStripeTest() — success', () => {
  it('returns status "succeeded" for a successful intent', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_test_123',
      status: 'succeeded',
    });

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams(),
    );

    expect(result.status).toBe('succeeded');
    expect(result.providerPaymentId).toBe('pi_test_123');
    expect(result.requiresUserAction).toBe(false);
  });

  it('returns status "requires_action" for authentication required', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_3ds',
      status: 'requires_action',
    });

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams({
        scenario: PaymentTestScenario.AuthenticationRequired,
      }),
    );

    expect(result.status).toBe('requires_action');
    expect(result.requiresUserAction).toBe(true);
  });

  it('sets providerKey to "stripe"', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'succeeded',
    });
    const result = await executeStripeTest(
      makeMockClient(),
      'cred-abc',
      makeSuccessParams(),
    );
    expect(result.providerKey).toBe('stripe');
  });

  it('sets environment to "test"', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'succeeded',
    });
    const result = await executeStripeTest(
      makeMockClient(),
      'cred-abc',
      makeSuccessParams(),
    );
    expect(result.environment).toBe('test');
  });

  it('normalises currency to lowercase', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_ccy',
      status: 'succeeded',
    });
    const result = await executeStripeTest(
      makeMockClient(),
      'cred-abc',
      makeSuccessParams({ currency: 'AUD' }),
    );
    expect(result.currency).toBe('aud');
  });

  it('returns a testId with the expected prefix', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'succeeded',
    });
    const result = await executeStripeTest(
      makeMockClient(),
      'cred-abc',
      makeSuccessParams(),
    );
    expect(result.testId).toMatch(/^gfy_test_/);
  });

  it('createdAt is a Date', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'succeeded',
    });
    const result = await executeStripeTest(
      makeMockClient(),
      'cred-abc',
      makeSuccessParams(),
    );
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('does not include raw Stripe intent object in the result', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_raw',
      status: 'succeeded',
      object: 'payment_intent',
      livemode: false,
      client_secret: 'pi_secret_xxx',
    });

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams(),
    );

    expect(result).not.toHaveProperty('object');
    expect(result).not.toHaveProperty('livemode');
    expect(result).not.toHaveProperty('client_secret');
  });

  it('each call is independent — no shared Stripe state between calls', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
    });

    await executeStripeTest(makeMockClient(), 'c1', makeSuccessParams());
    await executeStripeTest(makeMockClient(), 'c2', makeSuccessParams());

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(2);
  });
});

// ─── executeStripeTest — Stripe errors preserved ──────────────────────────────

describe('executeStripeTest() — raw Stripe error preservation', () => {
  it('exposes the raw Stripe error message (no sanitisation)', async () => {
    const rawMessage = 'Your card was declined.';
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: rawMessage,
        code: 'card_declined',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams({ scenario: PaymentTestScenario.CardDeclined }),
    );

    expect(result.status).toBe('failed');
    expect(result.failureMessage).toBe(rawMessage);
  });

  it('exposes error.code directly', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'declined',
        code: 'card_declined',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams(),
    );

    expect(result.failureCode).toBe('card_declined');
  });

  it('exposes stripeDeclineCode from decline_code', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'insufficient',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams({ scenario: PaymentTestScenario.InsufficientFunds }),
    );

    expect(result.stripeDeclineCode).toBe('insufficient_funds');
  });

  it('exposes stripeRequestId', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'declined',
        code: 'card_declined',
        requestId: 'req_abc123',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams(),
    );

    expect(result.stripeRequestId).toBe('req_abc123');
  });

  it('maps InsufficientFunds to status "failed" with correct failureCode', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'Your card has insufficient funds.',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams({ scenario: PaymentTestScenario.InsufficientFunds }),
    );

    expect(result.status).toBe('failed');
    expect(result.failureCode).toBe('card_declined');
    expect(result.stripeDeclineCode).toBe('insufficient_funds');
  });

  it('maps ExpiredCard error correctly', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'Your card has expired.',
        code: 'expired_card',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams({ scenario: PaymentTestScenario.ExpiredCard }),
    );

    expect(result.status).toBe('failed');
    expect(result.failureCode).toBe('expired_card');
  });

  it('maps IncorrectCvc error correctly', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: "Your card's security code is incorrect.",
        code: 'incorrect_cvc',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams({ scenario: PaymentTestScenario.IncorrectCvc }),
    );

    expect(result.status).toBe('failed');
    expect(result.failureCode).toBe('incorrect_cvc');
  });

  it('maps ProcessingError correctly', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeCardError({
        message: 'Processing error.',
        code: 'processing_error',
      }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams({ scenario: PaymentTestScenario.ProcessingError }),
    );

    expect(result.status).toBe('failed');
    expect(result.failureCode).toBe('processing_error');
  });

  it('maps StripeInvalidRequestError (StripeError) with raw message', async () => {
    const rawMsg = 'Invalid amount: must be a positive integer.';
    mockPaymentIntentsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({ message: rawMsg }),
    );

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams(),
    );

    expect(result.status).toBe('failed');
    expect(result.failureMessage).toBe(rawMsg);
  });

  it('returns a generic message for non-Stripe errors', async () => {
    mockPaymentIntentsCreate.mockRejectedValueOnce(new Error('Internal bug'));

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams(),
    );

    expect(result.status).toBe('failed');
    expect(result.failureMessage).toBe(
      'An unexpected error occurred during the test.',
    );
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────

describe('executeStripeTest() — security', () => {
  it('never includes secretKey in the returned result', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_sec',
      status: 'succeeded',
    });

    const result = await executeStripeTest(
      makeMockClient(),
      'cred-123',
      makeSuccessParams(),
    );

    const json = JSON.stringify(result);
    expect(json).not.toContain('sk_test_');
    expect(json).not.toContain('secretKey');
  });

  it('never sends raw card number 4242424242424242 to Stripe', async () => {
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'succeeded',
    });

    await executeStripeTest(makeMockClient(), 'c', makeSuccessParams());

    const callJson = JSON.stringify(
      (
        mockPaymentIntentsCreate.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0],
    );
    expect(callJson).not.toContain('4242');
    expect(callJson).not.toContain('4000');
  });
});
