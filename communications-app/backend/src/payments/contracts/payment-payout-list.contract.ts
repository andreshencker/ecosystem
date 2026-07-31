// src/payments/contracts/payment-payout-list.contract.ts
//
// Provider-centric contract for payout listing and detail.
// Transport-only — no local MongoDB persistence.
// The provider (e.g. Stripe) is the single source of truth for all payout data.
//
// A payout represents funds sent by the payment provider from the provider
// balance to an external destination such as a bank account.

/**
 * Canonical payout status.
 * String literal union so JSON serialisation is unambiguous.
 */
export type PayoutCanonicalStatus =
  | 'pending'
  | 'in_transit'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'reversed'
  | 'unknown';

/** Canonical destination type. */
export type PayoutDestinationType = 'bank_account' | 'debit_card' | 'unknown';

/**
 * Paginated payout summary — one row in the payout list table.
 *
 * Field naming rules:
 *   - `id` equals `providerPayoutId` so DataGrid row identity works.
 *   - `currency` is lowercase ISO 4217 (Stripe always returns lowercase).
 *   - `amountMinor` is an integer in the smallest currency unit.
 *   - `createdAt` / `estimatedArrivalAt` are Dates in the service layer;
 *     the controller serialises them to ISO strings at the HTTP boundary.
 *   - Destination fields contain only safe, masked values.
 */
export interface PayoutSummary {
  /** = providerPayoutId; used as the DataGrid row key. */
  id: string;
  /** ProviderCredentials._id (the Payments account identifier). */
  accountId: string;
  /** Stable canonical provider key (e.g. 'stripe'). */
  providerKey: string;
  /** Provider-native payout identifier (e.g. Stripe: po_xxx). */
  providerPayoutId: string;
  /** Amount in the smallest currency unit. */
  amountMinor: number;
  /** Lowercase ISO 4217 currency code (e.g. 'aud', 'usd'). */
  currency: string;
  /** Canonical lifecycle status. */
  status: PayoutCanonicalStatus;
  /** Raw status string returned by the provider. */
  providerStatus: string;
  /** Payout method: 'standard' | 'instant' — provider-dependent. */
  method?: string;
  /** Payout type: 'bank_account' | 'card' — provider-dependent. */
  type?: string;
  /** Canonical destination type. */
  destinationType?: PayoutDestinationType;
  /**
   * Masked destination label for display — never the full account number.
   * Example: "STRIPE TEST BANK •••• 6789"
   */
  destinationLabel?: string;
  /** Timestamp when the payout was created by the provider. */
  createdAt: Date;
  /** Estimated date the funds will arrive at the destination. */
  estimatedArrivalAt?: Date;
  /** True when the payout was triggered automatically by the provider. */
  automatic?: boolean;
  /** Provider-supplied description or statement descriptor. */
  description?: string;
  /** Provider failure code when status is 'failed'. */
  failureCode?: string;
  /** Human-readable failure message when status is 'failed'. */
  failureMessage?: string;
  /** Safe key-value metadata attached to the payout. */
  metadata?: Record<string, string>;
}

/**
 * Extended payout detail — returned by the single-payout endpoint.
 * Includes additional provider fields when available.
 */
export interface PayoutDetail extends PayoutSummary {
  /** Balance transaction ID associated with this payout. */
  balanceTransactionId?: string;
  /**
   * Safe destination identifier — never a full account number.
   * Stripe returns ba_xxx or card_xxx; only the ID is exposed here.
   */
  destinationId?: string;
  /** Bank name from the destination object (safe). */
  destinationBankName?: string;
  /** Last four digits of the destination account (safe). */
  destinationLast4?: string;
  /** Statement descriptor shown on bank statements. */
  statementDescriptor?: string;
  /** Source type for the payout (e.g. 'card', 'bank_account', 'fpx'). */
  sourceType?: string;
  /** Reconciliation status when supported by the provider. */
  reconciliationStatus?: string;
  /** Balance transaction ID for a failed payout reversal. */
  failureBalanceTransactionId?: string;
  /** Provider-generated idempotency key or request ID. */
  providerRequestId?: string;
  /** Provider-level metadata (same as metadata, for explicitness). */
  providerMetadata?: Record<string, string>;
}

/** Paginated list result returned by the provider. */
export interface PayoutListResult {
  data: PayoutSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Query parameters for listing payouts.
 * All filters are optional — absent filters return all payouts.
 *
 * Provider compatibility notes (Stripe):
 *   - `status`, `currency`, `createdFrom/To`, `arrivalFrom/To` are applied natively.
 *   - `search` is applied client-side (Stripe has no text-search on payouts).
 *   - `cursor` maps to Stripe `starting_after`.
 */
export interface ListPayoutsParams {
  /** Max records per page (1–100). Default: 20. */
  limit?: number;
  /** Opaque cursor returned by the previous page. */
  cursor?: string;
  /** Filter by canonical or provider status. */
  status?: string;
  /** Filter by lowercase ISO 4217 currency code. */
  currency?: string;
  /** Lower bound (inclusive) for createdAt. */
  createdFrom?: Date;
  /** Upper bound (inclusive) for createdAt. */
  createdTo?: Date;
  /** Lower bound (inclusive) for estimatedArrivalAt. */
  arrivalFrom?: Date;
  /** Upper bound (inclusive) for arrivalTo. */
  arrivalTo?: Date;
  /** Text search: payout ID (po_) applied client-side; other fields provider-dependent. */
  search?: string;
}
