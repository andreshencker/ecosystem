// src/payments/contracts/payment.contract.ts
//
// Canonical representation of a payment transaction.
//
// This contract deliberately does NOT mirror Stripe's PaymentIntent, PayPal's
// Order, or Square's Payment. Provider-specific concepts are translated by each
// provider adapter into this canonical shape.

import type { PaymentStatus } from '../enums/payment-status.enum';
import type { PaymentMethodType } from '../enums/payment-method-type.enum';
import type { PaymentMoney } from '../types/payment.types';

/**
 * Safe, non-sensitive summary of the payment method used.
 * Contains only display-safe information — never raw card numbers or secrets.
 */
export interface PaymentMethodSummary {
  /** Canonical payment method type. */
  type: PaymentMethodType;

  /** Human-readable display string (e.g. 'Visa •••• 4242'). */
  displayName: string;

  /** Last 4 digits of the card number. Present only for card payments. */
  last4?: string;

  /** Card brand in lowercase (e.g. 'visa', 'mastercard', 'amex'). */
  brand?: string;

  /** ISO 3166-1 alpha-2 country of the card issuer. */
  country?: string;

  /** Card expiry month (1–12). */
  expiryMonth?: number;

  /** Card expiry year (4-digit). */
  expiryYear?: number;
}

/**
 * Canonical payment transaction.
 *
 * Provider mapping:
 *   Stripe  → PaymentIntent (confirmed/captured) or Charge
 *   PayPal  → Order (CAPTURE intent, completed)
 *   Square  → Payment
 *
 * Amount rule: always integer minor units — never floating-point.
 */
export interface Payment {
  /** Graphify-generated payment identifier. */
  id: string;

  /** Account that processed this payment (= ProviderCredentials._id). */
  accountId: string;

  /** Current lifecycle status. */
  status: PaymentStatus;

  /** Payment amount in the smallest currency unit. */
  amount: PaymentMoney;

  /**
   * Summary of the payment method used.
   * Present once the payment method is confirmed — may be absent for 'pending'.
   */
  paymentMethod?: PaymentMethodSummary;

  /** Operator-provided description or statement descriptor. */
  description?: string;

  /**
   * Caller-provided idempotency key.
   * The same `reference` will not produce two successful payments.
   */
  reference?: string;

  /** Provider-independent key-value metadata (max 50 pairs). */
  metadata?: Record<string, string>;

  /**
   * Human-readable failure reason.
   * Present only when status is 'failed'. Never exposes raw provider errors.
   */
  failureReason?: string;

  /**
   * Whether the payment was authorised manually (funds reserved but not captured)
   * or automatically (funds captured immediately on authorisation).
   */
  captureMethod: 'automatic' | 'manual';

  /** When the payment was authorised (funds reserved). */
  authorisedAt?: Date;

  /** When the payment was captured (funds collected). */
  capturedAt?: Date;

  /** When the payment was cancelled. */
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
