// src/payments/enums/payment-status.enum.ts

/**
 * Canonical payment lifecycle states.
 *
 * State machine (simplified):
 *
 *   pending → processing → requires_action → authorised → succeeded
 *                        ↓                             ↓
 *                      failed                  partially_captured
 *                        |                             ↓
 *                     cancelled              succeeded (full capture)
 *
 *   succeeded → refunded / partially_refunded / disputed
 *
 * Provider mapping examples:
 *   Stripe:  PaymentIntent status + captured state
 *   PayPal:  Order status (CREATED → APPROVED → COMPLETED)
 *   Square:  Payment status (PENDING → COMPLETED)
 */
export enum PaymentStatus {
  /** Received, not yet sent to the provider. */
  Pending = 'pending',

  /** Being processed by the provider. */
  Processing = 'processing',

  /** Payer must complete an action (3DS redirect, wallet confirmation). */
  RequiresAction = 'requires_action',

  /**
   * Funds authorised (reserved) but not yet captured.
   * Only set when captureMethod is 'manual'.
   */
  Authorised = 'authorised',

  /**
   * Part of the authorised amount was captured.
   * Relevant for partial captures before the full amount is settled.
   */
  PartiallyCaptured = 'partially_captured',

  /** Full payment amount captured successfully. */
  Succeeded = 'succeeded',

  /** Processing failed; failureReason describes the cause. */
  Failed = 'failed',

  /** Payment was cancelled before capture. */
  Cancelled = 'cancelled',

  /** Payment has been fully reversed through one or more refunds. */
  Refunded = 'refunded',

  /** Payment has been partially reversed; further refunds may still be possible. */
  PartiallyRefunded = 'partially_refunded',

  /** A payer dispute (chargeback) has been opened. */
  Disputed = 'disputed',
}
