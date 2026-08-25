// src/payments/enums/payment-refund-status.enum.ts

/**
 * Canonical lifecycle states for a payment refund.
 */
export enum PaymentRefundStatus {
  /** Refund initiated; not yet processed by the provider. */
  Pending = 'pending',

  /** Funds returned to the payer. */
  Succeeded = 'succeeded',

  /** Refund could not be processed; failureReason is set. */
  Failed = 'failed',

  /** Refund was cancelled before processing. */
  Cancelled = 'cancelled',

  /** Refund requires additional user action (e.g. 3DS authentication). */
  RequiresAction = 'requires_action',

  /** Refund status is unrecognised or not yet mapped. */
  Unknown = 'unknown',
}

/**
 * Canonical reason codes for issuing a refund.
 * Providers translate these to their internal reason codes.
 */
export enum PaymentRefundReason {
  Duplicate = 'duplicate',
  Fraudulent = 'fraudulent',
  RequestedByCustomer = 'requested_by_customer',
  ExpiredUncapturedCharge = 'expired_uncaptured_charge',
  Other = 'other',
}
