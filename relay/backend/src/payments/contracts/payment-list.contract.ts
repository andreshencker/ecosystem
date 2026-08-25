import type { PaymentCanonicalStatus } from '../enums/payment-canonical-status.enum';

export interface PaymentSummary {
  id: string; // = providerPaymentId
  accountId: string; // ProviderCredentials._id
  providerKey: string;
  providerPaymentId: string;
  amountMinor: number;
  currency: string; // lowercase ISO 4217
  status: PaymentCanonicalStatus;
  providerStatus: string; // raw provider status string
  paymentMethodType?: string;
  paymentMethodLabel?: string; // e.g. "Visa •••• 4242"
  description?: string;
  createdAt: Date;
  requiresUserAction: boolean;
  failureCode?: string;
  declineCode?: string;
  failureMessage?: string;
  /**
   * Safe canonical URL for the buyer to complete or view the payment.
   * Populated by providers that surface a per-order payment page (e.g. CoinGate).
   * Never populated for Stripe (receipt URLs live on the detail record only).
   * Never a credential, token or signing secret.
   */
  paymentUrl?: string;
}

export interface PaymentDetail extends PaymentSummary {
  captureMethod?: string;
  confirmationMethod?: string;
  amountReceivedMinor?: number;
  amountCapturableMinor?: number;
  amountRefundedMinor?: number;
  latestChargeId?: string;
  receiptUrl?: string;
  cancellationReason?: string;
  providerMetadata?: Record<string, string>;
}

export interface PaymentListResult {
  data: PaymentSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ListPaymentsParams {
  limit?: number;
  cursor?: string;
  status?: string;
  currency?: string;
  createdFrom?: Date;
  createdTo?: Date;
  search?: string;
}
