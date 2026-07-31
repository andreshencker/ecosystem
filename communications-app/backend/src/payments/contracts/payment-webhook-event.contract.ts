// src/payments/contracts/payment-webhook-event.contract.ts
//
// Canonical payment event envelope for webhook forwarding.
//
// Graphify receives raw provider events (Stripe webhook, PayPal IPN, etc.),
// validates their signatures, translates them into this canonical shape,
// and delivers them to application-configured webhook endpoints.
//
// Consumers never receive raw provider event objects.

/**
 * Canonical payment event types.
 *
 * These are stable string identifiers — never change a value once published.
 * Provider-specific event names are mapped to these by each provider adapter.
 *
 * Stripe mapping examples:
 *   payment_intent.succeeded → payment.succeeded
 *   charge.refunded          → payment.refunded
 *   payout.paid              → payout.paid
 *   account.updated          → account.updated
 */
export type CanonicalPaymentEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.requires_action'
  | 'payment.refunded'
  | 'payment.partially_refunded'
  | 'refund.succeeded'
  | 'refund.failed'
  | 'payout.paid'
  | 'payout.failed'
  | 'session.completed'
  | 'session.expired'
  | 'account.updated'
  | 'account.capability.updated'
  | 'dispute.opened'
  | 'dispute.resolved';

/**
 * Type of the primary resource referenced by the event.
 */
export type PaymentEventResourceType =
  | 'payment'
  | 'refund'
  | 'payout'
  | 'session'
  | 'account'
  | 'dispute';

/**
 * Canonical payment webhook event envelope.
 *
 * This envelope is what Graphify delivers to application webhook endpoints
 * after normalising the raw provider event. Raw provider event objects must
 * never appear in this type or its nested `data` field.
 */
export interface PaymentWebhookEvent {
  /** Graphify-generated event identifier. */
  id: string;

  /** Account this event belongs to (= ProviderCredentials._id). */
  accountId: string;

  /** Canonical provider key that emitted this event. */
  providerKey: string;

  /** Canonical event type. */
  eventType: CanonicalPaymentEventType;

  /** Type of the primary affected resource. */
  resourceType: PaymentEventResourceType;

  /** Identifier of the primary affected resource. */
  resourceId: string;

  /**
   * Snapshot of the canonical resource at the time of the event.
   * Contains only provider-independent, non-sensitive fields.
   * Must never include raw provider response objects.
   */
  data: Record<string, unknown>;

  /** When the event occurred at the provider. */
  occurredAt: Date;

  /** When Graphify received and validated the raw provider event. */
  receivedAt: Date;

  /**
   * Original provider event identifier.
   * Included for debugging and idempotency — not for consumer logic.
   * Consumers must use Graphify `id`, not this field, for deduplication.
   */
  providerEventId: string;
}
