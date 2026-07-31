// src/payments/contracts/payment-session.contract.ts
//
// Canonical representation of a browser-hosted checkout session.
//
// A PaymentSession is created when the application cannot collect payment
// details directly (e.g. a web checkout flow). The payer is redirected to
// the provider-hosted page; on completion the provider redirects back.
//
// This contract deliberately does NOT expose Stripe CheckoutSession fields,
// PayPal Order approval links, or Square Checkout URLs directly — each
// provider adapter translates from its native session to this shape.

import type { PaymentSessionStatus } from '../enums/payment-session-status.enum';
import type { PaymentMoney } from '../types/payment.types';

/**
 * Canonical browser-hosted payment session.
 *
 * Provider mapping:
 *   Stripe  → checkout.sessions.create (mode: 'payment')
 *   PayPal  → Orders.create (intent: CAPTURE) + approve HATEOAS link
 *   Square  → POST /v2/online-checkout/payment-links
 */
export interface PaymentSession {
  /** Graphify-generated session identifier. */
  id: string;

  /** Account that owns this session (= ProviderCredentials._id). */
  accountId: string;

  /** Current session lifecycle status. */
  status: PaymentSessionStatus;

  /** Payment amount in the smallest currency unit. */
  amount: PaymentMoney;

  /**
   * Caller-provided correlation key.
   * Used to link the session to an upstream order or reference.
   */
  reference?: string;

  /**
   * URL to which the application must redirect the payer's browser immediately
   * after session creation.
   */
  redirectUrl: string;

  /**
   * URL to which the provider redirects the payer after successful payment.
   * Must be an HTTPS URL accessible to the payer's browser.
   */
  successUrl: string;

  /**
   * URL to which the provider redirects the payer if they choose to cancel.
   */
  cancelUrl: string;

  /**
   * Graphify payment identifier.
   * Populated when status transitions to 'completed'.
   * Null until the session is successfully completed.
   */
  paymentId?: string;

  /** When this session expires without completion. */
  expiresAt: Date;

  createdAt: Date;
  completedAt?: Date;
}
