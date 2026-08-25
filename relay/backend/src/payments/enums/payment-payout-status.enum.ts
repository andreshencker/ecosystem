// src/payments/enums/payment-payout-status.enum.ts

/**
 * Canonical lifecycle states for a provider payout (balance → bank transfer).
 */
export enum PaymentPayoutStatus {
  /** Payout created; not yet sent to the banking network. */
  Pending = 'pending',

  /** In transit to the bank account. */
  InTransit = 'in_transit',

  /** Successfully deposited in the bank account. */
  Paid = 'paid',

  /** Transfer failed; failureReason is set. */
  Failed = 'failed',

  /** Payout cancelled before it reached the banking network. */
  Cancelled = 'cancelled',
}

/**
 * Canonical destination types for a payout.
 */
export enum PayoutDestinationType {
  BankAccount = 'bank_account',
  DebitCard = 'debit_card',
}
