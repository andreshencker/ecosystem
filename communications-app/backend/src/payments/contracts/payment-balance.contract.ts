// src/payments/contracts/payment-balance.contract.ts
//
// Canonical representation of the funds held by a payment provider.
// Always fetched live from the provider — never persisted by Graphify.

import type { PaymentMoney } from '../types/payment.types';

/**
 * Source type for a balance line.
 * Describes which type of transaction contributed to this portion of the balance.
 */
export type BalanceSourceType = 'card' | 'bank_transfer' | 'other';

/**
 * A single balance amount for a specific currency and source type.
 */
export interface PaymentBalanceLine {
  /** Amount in the smallest currency unit (minor unit). Never floating-point. */
  amountMinor: PaymentMoney['amountMinor'];

  /** ISO 4217 lowercase currency code. */
  currency: PaymentMoney['currency'];

  /** Type of transaction that produced this balance portion. */
  sourceType: BalanceSourceType;
}

/**
 * Canonical account balance.
 *
 * Multi-currency: each array may contain lines for different currencies.
 *
 * Provider mapping:
 *   Stripe  → GET /v1/balance (balance.available[], balance.pending[], balance.connect_reserved[])
 *   PayPal  → GET /v1/reporting/balances (available_balance, pending_balance)
 *   Square  → GET /v2/merchants/:id (limited; partial result may be returned)
 */
export interface PaymentBalance {
  /**
   * Account identifier (= ProviderCredentials._id).
   */
  accountId: string;

  /**
   * Funds available for immediate payout to a bank account.
   * One entry per currency (and optionally per source type).
   */
  available: PaymentBalanceLine[];

  /**
   * Funds in the clearing period — not yet available for payout.
   * Timing depends on the provider and payment method type.
   */
  pending: PaymentBalanceLine[];

  /**
   * Funds reserved by the provider for disputes, refund reserves, etc.
   * May be empty if the provider does not expose this concept.
   */
  reserved: PaymentBalanceLine[];

  /**
   * When this balance was retrieved from the provider.
   * Consumers must treat this as a snapshot, not live data.
   */
  retrievedAt: Date;
}
