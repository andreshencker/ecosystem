// src/payments/providers/stripe/stripe.testing.ts
//
// Stripe-specific payment testing logic.
//
// ALL Stripe test payment method IDs and scenario mappings live here.
// Nothing in this file may be imported from outside src/payments/providers/stripe/.
//
// Architecture: the generic PaymentsTestingService passes a canonical
// PaymentTestScenario to StripePaymentProvider.createPaymentTest(). That
// method delegates here. The UI never sees Stripe PM IDs or error codes.

import Stripe from 'stripe';
import { PaymentTestScenario } from '../../enums/payment-test-scenario.enum';
import type {
  CreatePaymentTestParams,
  PaymentTestResult,
  PaymentTestStatus,
} from '../../types/payment-testing.types';

// ─── Stripe test PaymentMethod IDs ───────────────────────────────────────────
//
// These are Stripe's PERMANENT test PaymentMethod objects.
// They are available on ALL Stripe test accounts without requiring
// Raw Card Data API access.
//
// Reference: https://stripe.com/docs/testing#payment-methods
//
// pm_card_*                              → Stripe permanent test PM
// pm_card_chargeDeclinedInsufficientFunds → code=card_declined, decline_code=insufficient_funds
// pm_card_chargeDeclinedExpiredCard       → code=expired_card,   decline_code=expired_card
// pm_card_chargeDeclinedIncorrectCvc      → code=incorrect_cvc,  decline_code=incorrect_cvc
// pm_card_chargeDeclinedProcessingError   → code=processing_error

const STRIPE_SCENARIO_PM: Record<PaymentTestScenario, string> = {
  [PaymentTestScenario.Success]: 'pm_card_visa',
  [PaymentTestScenario.CardDeclined]: 'pm_card_chargeDeclined',
  [PaymentTestScenario.InsufficientFunds]:
    'pm_card_chargeDeclinedInsufficientFunds',
  [PaymentTestScenario.AuthenticationRequired]:
    'pm_card_authenticationRequired',
  [PaymentTestScenario.ExpiredCard]: 'pm_card_chargeDeclinedExpiredCard',
  [PaymentTestScenario.IncorrectCvc]: 'pm_card_chargeDeclinedIncorrectCvc',
  [PaymentTestScenario.ProcessingError]:
    'pm_card_chargeDeclinedProcessingError',
};

// All card-based scenarios that support programmatic server-side testing.
// Wallet / redirect methods (Apple Pay, Google Pay, etc.) cannot be tested
// automatically server-side and are excluded.
const TESTABLE_CARD_METHOD_KEYS = new Set([
  'card',
  'cartes_bancaires',
  'jcb',
  'kr_card',
]);

// ─── Public exports ───────────────────────────────────────────────────────────

export function getStripeTestScenarios(
  paymentMethodKey: string,
): PaymentTestScenario[] {
  if (TESTABLE_CARD_METHOD_KEYS.has(paymentMethodKey)) {
    return Object.values(PaymentTestScenario) as PaymentTestScenario[];
  }
  return [];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateTestId(): string {
  return `gfy_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapStripeStatus(stripeStatus: string): PaymentTestStatus {
  switch (stripeStatus) {
    case 'succeeded':
      return 'succeeded';
    case 'requires_action':
      return 'requires_action';
    case 'processing':
      return 'processing';
    case 'canceled':
      return 'cancelled';
    default:
      return 'failed';
  }
}

// ─── Main test executor ───────────────────────────────────────────────────────

export async function executeStripeTest(
  client: Stripe,
  connectionId: string,
  params: CreatePaymentTestParams,
): Promise<PaymentTestResult> {
  const testId = generateTestId();
  const createdAt = new Date();

  // Resolve the Stripe permanent test PM for this canonical scenario.
  // This keeps all Stripe-specific IDs inside this file.
  const stripePaymentMethodId = STRIPE_SCENARIO_PM[params.scenario];

  try {
    const intent = await client.paymentIntents.create({
      amount: params.amountMinor,
      currency: params.currency.toLowerCase(),
      // Use pre-created Stripe test PaymentMethod objects.
      // These work on any standard Stripe test account without requiring
      // Raw Card Data API access. No raw card numbers are ever sent.
      payment_method: stripePaymentMethodId,
      confirm: true,
      return_url: 'https://placeholder.graphify.app/payments/testing/return',
      description: params.description,
      metadata: {
        graphify_test_id: testId,
        graphify_scenario: params.scenario,
        ...(params.reference ? { graphify_reference: params.reference } : {}),
      },
    });

    return {
      providerKey: 'stripe',
      connectionId,
      environment: 'test',
      testId,
      providerPaymentId: intent.id,
      paymentMethod: params.paymentMethodKey,
      amountMinor: params.amountMinor,
      currency: params.currency.toLowerCase(),
      status: mapStripeStatus(intent.status),
      scenario: params.scenario,
      requiresUserAction: intent.status === 'requires_action',
      createdAt,
    };
  } catch (err) {
    return mapStripeError(err, connectionId, testId, params, createdAt);
  }
}

// ─── Error mapping ────────────────────────────────────────────────────────────
//
// Raw Stripe error fields are preserved — no sanitisation.
// The service layer and frontend receive the actual provider error.

function mapStripeError(
  err: unknown,
  connectionId: string,
  testId: string,
  params: CreatePaymentTestParams,
  createdAt: Date,
): PaymentTestResult {
  const base: Omit<
    PaymentTestResult,
    'failureCode' | 'failureMessage' | 'stripeDeclineCode' | 'stripeRequestId'
  > = {
    providerKey: 'stripe',
    connectionId,
    environment: 'test',
    testId,
    paymentMethod: params.paymentMethodKey,
    amountMinor: params.amountMinor,
    currency: params.currency.toLowerCase(),
    status: 'failed',
    scenario: params.scenario,
    requiresUserAction: false,
    createdAt,
  };

  if (err instanceof Stripe.errors.StripeError) {
    const cardErr = err as Stripe.errors.StripeCardError;
    return {
      ...base,
      failureCode: err.code ?? undefined,
      failureMessage: err.message,
      stripeDeclineCode: cardErr.decline_code ?? undefined,
      stripeRequestId: err.requestId ?? undefined,
    };
  }

  // Non-Stripe errors indicate internal issues, not provider responses.
  // Use a safe generic message to avoid leaking internal error details.
  return {
    ...base,
    failureMessage: 'An unexpected error occurred during the test.',
  };
}
