export enum PaymentCanonicalStatus {
  Succeeded = 'succeeded',
  Failed = 'failed',
  Processing = 'processing',
  Pending = 'pending',
  RequiresAction = 'requires_action',
  RequiresConfirmation = 'requires_confirmation',
  RequiresCapture = 'requires_capture',
  Cancelled = 'cancelled',
  // Extended for CoinGate and future providers that expose these lifecycle states.
  Expired = 'expired',
  Refunded = 'refunded',
  PartiallyRefunded = 'partially_refunded',
}
