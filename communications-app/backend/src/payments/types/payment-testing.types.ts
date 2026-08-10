// src/payments/types/payment-testing.types.ts

import type { PaymentTestScenario } from '../enums/payment-test-scenario.enum';

export type PaymentTestStatus =
  | 'succeeded'
  | 'failed'
  | 'requires_action'
  | 'processing'
  | 'cancelled';

export interface CreatePaymentTestParams {
  paymentMethodKey: string;
  amountMinor: number;
  currency: string;
  scenario: PaymentTestScenario;
  description?: string;
  reference?: string;
  /**
   * Provider-specific extension values.
   * Used to pass receive_currency to CoinGate without adding it to the
   * canonical CreatePaymentTestParams interface as a first-class field.
   * Never contains credentials or secrets.
   */
  providerExtensions?: Record<string, unknown>;
}

export interface PaymentTestResult {
  providerKey: string;
  connectionId: string;
  environment: 'test' | 'live';
  testId: string;
  providerPaymentId?: string;
  paymentMethod: string;
  amountMinor: number;
  currency: string;
  status: PaymentTestStatus;
  scenario: PaymentTestScenario;
  requiresUserAction: boolean;
  /**
   * Provider-hosted payment URL — for redirect-flow providers (CoinGate).
   * Open in browser to complete the test payment. Not present for Stripe.
   */
  paymentUrl?: string;
  /** Stripe error.code (e.g. 'card_declined', 'expired_card'). */
  failureCode?: string;
  /** Raw provider error message — not sanitised. */
  failureMessage?: string;
  /** Stripe decline_code (e.g. 'insufficient_funds', 'generic_decline'). */
  stripeDeclineCode?: string;
  /** Stripe request ID — use for support and Stripe Dashboard lookup. */
  stripeRequestId?: string;
  createdAt: Date;
}

export interface PaymentTestScenariosResult {
  connectionId: string;
  paymentMethodKey: string;
  scenarios: PaymentTestScenario[];
}
