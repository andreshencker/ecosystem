// src/payments/types/payment-account-verification.types.ts

import type { PaymentAccountStatus } from '../enums/payment-account-status.enum';

export interface PaymentAccountVerificationResult {
  accountId: string;
  providerKey: string;
  valid: boolean;
  status: PaymentAccountStatus;
  verifiedAt: Date;
  message?: string;
}

export interface PaymentAccountSummary {
  /** ProviderCredentials._id */
  id: string;
  providerKey: string;
  connectionType: string;
  tag: string;
  displayIdentifier?: string;
  isActive: boolean;
  /** ProviderCredentials.createdAt — null when the createdAt field is not populated. */
  connectedAt: Date | null;
  /** Derived from displayIdentifier prefix: pk_test_ → test, pk_live_ → live. */
  environment: 'test' | 'live' | null;
}
