// src/payments/providers/coingate/coingate.mapper.ts
//
// Maps raw CoinGate API values into canonical Graphify payment contracts.
// All CoinGate-specific terminology stays in this file.

import { PaymentCanonicalStatus } from '../../enums/payment-canonical-status.enum';
import type { CoinGateOrderStatus, CoinGateRefundStatus } from './coingate.types';
import type { RefundCanonicalStatus } from '../../contracts/payment-refund-list.contract';

// ─── Amount helpers ───────────────────────────────────────────────────────────

/** Map of ISO 4217 fiat currency codes to their minor-unit exponent. */
const FIAT_EXPONENTS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, AUD: 2, CAD: 2, CHF: 2, NZD: 2, SGD: 2,
  HKD: 2, SEK: 2, NOK: 2, DKK: 2, PLN: 2, CZK: 2, HUF: 2, RON: 2,
  BGN: 2, HRK: 2, MXN: 2, BRL: 2, ZAR: 2, INR: 2, THB: 2, PHP: 2,
  MYR: 2, IDR: 2, KRW: 0, JPY: 0, VND: 0, CLP: 0, KWD: 3, BHD: 3,
  OMR: 3, JOD: 3,
};

/**
 * Returns the exponent (decimal places) for a currency code.
 * Fiat uses FIAT_EXPONENTS lookup; crypto uses 8 (satoshi precision).
 * Defaults to 2 for unknown fiat currencies.
 */
export function getCurrencyExponent(currency: string): number {
  const upper = currency.toUpperCase();
  if (upper in FIAT_EXPONENTS) return FIAT_EXPONENTS[upper];
  // Common crypto convention: 8 decimal places (Bitcoin satoshi basis)
  // For display-only use: 8 is the safe default for crypto.
  return 8;
}

/**
 * Converts a decimal string amount to integer minor units.
 * Uses Decimal-safe arithmetic (avoids floating-point drift for fiat).
 *
 * Examples:
 *   "100.00", "EUR" → 10000
 *   "0.001", "BTC"  → 100000 (0.001 * 10^8 = 100000 satoshis)
 */
export function toMinorUnits(decimalStr: string, currency: string): number {
  if (!decimalStr) return 0;
  const exp = getCurrencyExponent(currency);
  if (exp === 0) return Math.round(parseFloat(decimalStr));
  // Shift the decimal point by multiplying as integer strings to avoid float errors.
  const parts = decimalStr.split('.');
  const integerPart = parts[0] ?? '0';
  const fractionalPart = (parts[1] ?? '').padEnd(exp, '0').slice(0, exp);
  return parseInt(integerPart + fractionalPart, 10);
}

/**
 * Converts integer minor units to a decimal string.
 * Used when sending price_amount to the CoinGate API.
 *
 * Examples:
 *   10000, "EUR" → "100.00"
 *   100000, "BTC" → "0.00100000"
 */
export function toDecimalAmount(amountMinor: number, currency: string): string {
  const exp = getCurrencyExponent(currency);
  if (exp === 0) return String(amountMinor);
  const factor = Math.pow(10, exp);
  return (amountMinor / factor).toFixed(exp);
}

// ─── Order status mapping ─────────────────────────────────────────────────────

/**
 * Maps CoinGate order statuses to the canonical PaymentCanonicalStatus.
 *
 * CoinGate → Canonical:
 *   new               → requires_action  (shopper must select currency + pay)
 *   pending           → requires_action  (awaiting payment from shopper)
 *   confirming        → processing       (waiting for blockchain confirmations)
 *   paid              → succeeded        (payment confirmed by network)
 *   invalid           → failed           (not confirmed or AML/CTF issue)
 *   expired           → expired          (order timed out)
 *   canceled          → cancelled        (shopper cancelled)
 *   refunded          → refunded         (full refund issued)
 *   partially_refunded→ partially_refunded
 */
export function mapCoinGateOrderStatus(
  status: CoinGateOrderStatus | string,
): PaymentCanonicalStatus {
  switch (status) {
    case 'new':
    case 'pending':
      return PaymentCanonicalStatus.RequiresAction;
    case 'confirming':
      return PaymentCanonicalStatus.Processing;
    case 'paid':
      return PaymentCanonicalStatus.Succeeded;
    case 'invalid':
      return PaymentCanonicalStatus.Failed;
    case 'expired':
      return PaymentCanonicalStatus.Expired;
    case 'canceled':
      return PaymentCanonicalStatus.Cancelled;
    case 'refunded':
      return PaymentCanonicalStatus.Refunded;
    case 'partially_refunded':
      return PaymentCanonicalStatus.PartiallyRefunded;
    default:
      return PaymentCanonicalStatus.Pending;
  }
}

// ─── Refund status mapping ────────────────────────────────────────────────────

/**
 * Maps CoinGate refund statuses to the canonical RefundCanonicalStatus.
 *
 * CoinGate → Canonical:
 *   pending     → pending
 *   processing  → requires_action (broad "in progress")
 *   completed   → succeeded
 *   rejected    → failed (provider rejected; see rejectionReason)
 *   failed      → failed
 *   cancelled   → cancelled
 */
export function mapCoinGateRefundStatus(
  status: CoinGateRefundStatus | string,
): RefundCanonicalStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'processing':
      return 'requires_action';
    case 'completed':
      return 'succeeded';
    case 'rejected':
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}
