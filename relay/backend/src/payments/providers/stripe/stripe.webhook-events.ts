// src/payments/providers/stripe/stripe.webhook-events.ts
//
// Stripe event type catalogue for use in endpoint creation / update.
// Provided by the Stripe adapter — never hardcoded in generic frontend code.

/** Stripe event types recommended for payment-related endpoint configuration. */
export const STRIPE_RECOMMENDED_EVENT_TYPES: readonly string[] = [
  // ─── Connect Checkout ──────────────────────────────────────────────────────
  'checkout.session.completed',
  'checkout.session.expired',

  // ─── PaymentIntent ──────────────────────────────────────────────────────────
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.processing',
  'payment_intent.canceled',
  'payment_intent.created',
  'payment_intent.amount_capturable_updated',
  'payment_intent.partially_funded',
  'payment_intent.requires_action',

  // ─── Charge ─────────────────────────────────────────────────────────────────
  'charge.succeeded',
  'charge.failed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
  'charge.dispute.funds_reinstated',
  'charge.dispute.funds_withdrawn',

  // ─── Refund ─────────────────────────────────────────────────────────────────
  'refund.created',
  'refund.updated',
  'refund.failed',

  // ─── Payout ─────────────────────────────────────────────────────────────────
  'payout.created',
  'payout.updated',
  'payout.paid',
  'payout.failed',
  'payout.canceled',
  'payout.reconciliation_completed',

  // ─── Account ────────────────────────────────────────────────────────────────
  'account.updated',
  'account.external_account.created',
  'account.external_account.updated',
  'account.external_account.deleted',

  // ─── Balance ────────────────────────────────────────────────────────────────
  'balance.available',

  // ─── Setup Intent ───────────────────────────────────────────────────────────
  'setup_intent.succeeded',
  'setup_intent.setup_failed',
  'setup_intent.canceled',

  // ─── Customer ───────────────────────────────────────────────────────────────
  'payment_method.attached',
  'payment_method.detached',
  'payment_method.updated',
] as const;

/** Special Stripe "receive all" sentinel value. */
export const STRIPE_ALL_EVENTS = '*' as const;

/** Returns the recommended event types provided by this adapter. */
export function getStripeRecommendedEventTypes(): string[] {
  return [...STRIPE_RECOMMENDED_EVENT_TYPES];
}
