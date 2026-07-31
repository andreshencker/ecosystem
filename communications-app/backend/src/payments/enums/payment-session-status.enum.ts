// src/payments/enums/payment-session-status.enum.ts

/**
 * Canonical lifecycle states for a hosted payment session.
 *
 * Stripe mapping:
 *   created   → Session created, url available
 *   active    → User redirected to checkout
 *   completed → payment_status = 'paid'
 *   expired   → expires_at passed without completion
 *   cancelled → User clicked cancel / back
 *
 * PayPal mapping:
 *   created   → Order created, approve link available
 *   active    → User redirected to PayPal
 *   completed → Order status = COMPLETED
 *   expired   → Order expiry reached
 *   cancelled → User cancelled on PayPal
 */
export enum PaymentSessionStatus {
  Created = 'created',
  Active = 'active',
  Completed = 'completed',
  Expired = 'expired',
  Cancelled = 'cancelled',
}
