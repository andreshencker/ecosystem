// src/payments/enums/payment-method-type.enum.ts

/**
 * Canonical, provider-agnostic payment method types.
 *
 * These map to provider-specific concepts internally:
 *   card          → Stripe card, PayPal card, Square card tender
 *   bank_transfer → ACH (US), SEPA (EU), BECS (AU)
 *   wallet        → Apple Pay, Google Pay, PayPal Wallet
 *   buy_now_pay_later → Afterpay, Klarna, Affirm
 *   voucher       → Boleto (BR), OXXO (MX), offline vouchers
 *   direct_debit  → Bank debit mandates (GoCardless, BACS)
 *   crypto        → Cryptocurrency-based payments
 *   other         → Catch-all for provider-specific or future methods
 */
export enum PaymentMethodType {
  Card = 'card',
  BankTransfer = 'bank_transfer',
  Wallet = 'wallet',
  BuyNowPayLater = 'buy_now_pay_later',
  Voucher = 'voucher',
  DirectDebit = 'direct_debit',
  Crypto = 'crypto',
  Other = 'other',
}
