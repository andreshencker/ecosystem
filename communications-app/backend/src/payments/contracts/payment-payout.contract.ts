// src/payments/contracts/payment-payout.contract.ts
//
// Canonical representation of a payout (balance → bank account transfer).
// A Payout moves funds from the provider's balance to the operator's bank account.

import type {
  PaymentPayoutStatus,
  PayoutDestinationType,
} from '../enums/payment-payout-status.enum';
import type { PaymentMoney } from '../types/payment.types';

/**
 * Canonical payout.
 *
 * Provider mapping:
 *   Stripe  → POST /v1/payouts / GET /v1/payouts/:id
 *   PayPal  → POST /v1/payments/payouts
 *   Square  → GET /v2/payouts (Square initiates payouts automatically)
 *
 * Amount rule: always integer minor units.
 */
export interface PaymentPayout {
  /** Graphify-generated payout identifier. */
  id: string;

  /** Account this payout belongs to (= ProviderCredentials._id). */
  accountId: string;

  /** Current payout lifecycle status. */
  status: PaymentPayoutStatus;

  /** Amount transferred in the smallest currency unit. */
  amount: PaymentMoney;

  /** Destination type for this payout. */
  destinationType: PayoutDestinationType;

  /** Operator-provided label for this payout (optional). */
  description?: string;

  /** When the payout was created / initiated. */
  initiatedAt: Date;

  /**
   * Estimated date the funds will arrive in the bank account.
   * Null until the provider provides this information.
   */
  estimatedArrival?: Date;

  /**
   * Confirmed date the funds arrived.
   * Null until status transitions to 'paid'.
   */
  arrivedAt?: Date;

  /**
   * Human-readable failure reason.
   * Present only when status is 'failed'.
   */
  failureReason?: string;
}
