// src/payments/contracts/payment-refund-list.contract.ts
//
// Provider-centric contract for refund listing and creation.
// This contract is transport-only — no local MongoDB persistence.
// The provider is the single source of truth for all refund data.

/**
 * Canonical status type for HTTP transport.
 * String literal union — not an enum — so JSON serialisation is unambiguous.
 */
export type RefundCanonicalStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'requires_action'
  | 'unknown';

/**
 * Canonical reason type for HTTP transport.
 */
export type RefundCanonicalReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | 'expired_uncaptured_charge'
  | 'other';

/**
 * Paginated refund summary — one row in the refund list table.
 *
 * Field naming rules:
 *   - All IDs use the provider's own ID format (re_xxx, pi_xxx, ch_xxx for Stripe).
 *   - `id` is always equal to `providerRefundId` so DataGrid row identity works.
 *   - `currency` is lowercase ISO 4217.
 *   - `amountMinor` is an integer (smallest currency unit).
 *   - `createdAt` is a Date in service/provider layer; serialised to ISO string at
 *     the HTTP boundary by the controller.
 */
export interface RefundSummary {
  /** = providerRefundId; used as the DataGrid row key. */
  id: string;
  /** ProviderCredentials._id (the Payments account identifier). */
  accountId: string;
  /** Stable canonical provider key (e.g. 'stripe'). */
  providerKey: string;
  /** Provider-native refund identifier (e.g. Stripe: re_xxx). */
  providerRefundId: string;
  /** Provider-native payment identifier (e.g. Stripe: pi_xxx). */
  providerPaymentId: string;
  /** Provider-native charge identifier (e.g. Stripe: ch_xxx). Optional. */
  providerChargeId?: string;
  /** Amount refunded in the smallest currency unit. */
  amountMinor: number;
  /** Lowercase ISO 4217 currency code. */
  currency: string;
  /** Canonical refund status. */
  status: RefundCanonicalStatus;
  /** Raw status string returned by the provider. */
  providerStatus: string;
  /** Canonical reason code, if provided. */
  reason?: string;
  /** Provider failure code when status is 'failed'. */
  failureCode?: string;
  /** Human-readable failure message when status is 'failed'. */
  failureMessage?: string;
  /** Timestamp when the refund was created by the provider. */
  createdAt: Date;
  /** User-supplied metadata attached to the refund. */
  metadata?: Record<string, string>;
}

/**
 * Extended refund detail — returned for the single-refund endpoint.
 * Includes charge-level amounts when available (requires expand).
 */
export interface RefundDetail extends RefundSummary {
  /** Original payment amount in minor units. */
  paymentAmountMinor?: number;
  /** Total already refunded on the payment (across all refunds). */
  refundedAmountMinor?: number;
  /** Amount still eligible for refund = paymentAmount − alreadyRefunded. */
  remainingRefundableAmountMinor?: number;
  /** Provider receipt number, if available. */
  receiptNumber?: string;
  /** Balance transaction ID from the provider. */
  balanceTransactionId?: string;
  /** Provider-generated idempotency key / request ID. */
  providerRequestId?: string;
  /** Provider-level metadata (same as metadata but for explicitness). */
  providerMetadata?: Record<string, string>;
}

/**
 * Paginated list result from the provider.
 */
export interface RefundListResult {
  data: RefundSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Query parameters for listing refunds.
 * All filters are optional — absent filters return all refunds.
 */
export interface ListRefundsParams {
  /** Max records per page (1–100). Default: 20. */
  limit?: number;
  /** Opaque pagination cursor returned by the previous page. */
  cursor?: string;
  /** Filter by ISO 4217 currency code (lowercase). */
  currency?: string;
  /** Text search: refund ID (re_), payment ID (pi_), or charge ID (ch_). */
  search?: string;
  /** Lower bound (inclusive) for createdAt. */
  createdFrom?: Date;
  /** Upper bound (inclusive) for createdAt. */
  createdTo?: Date;
}

/**
 * Parameters for creating a new refund via the provider.
 */
export interface CreateRefundParams {
  /** Provider payment intent ID (e.g. Stripe: pi_xxx). Must have status 'succeeded'. */
  paymentId: string;
  /** Amount to refund in minor units. Omit for a full refund. */
  amountMinor?: number;
  /** Canonical refund reason. */
  reason?: RefundCanonicalReason;
  /** Optional key-value metadata to attach to the refund. */
  metadata?: Record<string, string>;
}
