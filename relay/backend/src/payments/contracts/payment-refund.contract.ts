// src/payments/contracts/payment-refund.contract.ts
//
// Canonical representation of a payment refund.
// A Refund reverses some or all of a succeeded Payment.

import type {
  PaymentRefundStatus,
  PaymentRefundReason,
} from '../enums/payment-refund-status.enum';
import type { PaymentMoney } from '../types/payment.types';

/**
 * Canonical payment refund.
 *
 * Provider mapping:
 *   Stripe  → refunds.create / refunds.retrieve
 *   PayPal  → Captures.refundCapturedPayment
 *   Square  → Refunds.refundPayment
 *
 * Amount rule: always integer minor units.
 *   - Total refunded across all Refunds for a Payment must not exceed Payment.amount.
 *   - The provider enforces this limit — Graphify propagates the error canonically.
 */
export interface PaymentRefund {
  /** Graphify-generated refund identifier. */
  id: string;

  /**
   * Identifier of the payment being refunded.
   * The referenced Payment must have status 'succeeded' or 'partially_refunded'.
   */
  paymentId: string;

  /** Account that processed the original payment (= ProviderCredentials._id). */
  accountId: string;

  /** Current refund lifecycle status. */
  status: PaymentRefundStatus;

  /**
   * Amount to refund in the smallest currency unit.
   * Must be in the same currency as the original payment.
   * Must be ≤ (Payment.amount − sum of prior succeeded refunds).
   */
  amount: PaymentMoney;

  /** Canonical reason for the refund. */
  reason: PaymentRefundReason;

  /**
   * Operator-provided free-text note.
   * Required when reason is 'other'.
   * Never exposed to the payer directly.
   */
  description?: string;

  /**
   * Human-readable failure reason.
   * Present only when status is 'failed'.
   */
  failureReason?: string;

  createdAt: Date;
  succeededAt?: Date;
  failedAt?: Date;
}
