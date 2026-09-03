export type ConnectedPaymentAccountStatus =
  | 'pending'
  | 'enabled'
  | 'restricted'
  | 'disabled';

export interface ConnectedPaymentAccountState {
  providerAccountId: string;
  status: ConnectedPaymentAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country?: string;
  defaultCurrency?: string;
  requirementsCurrentlyDue: string[];
  requirementsEventuallyDue: string[];
  disabledReason?: string;
}

export interface CreateConnectedPaymentAccountParams {
  connectedOrganizationId: string;
  country?: string;
  email?: string;
  businessName?: string;
}

export interface CreateConnectOnboardingParams {
  providerAccountId: string;
  refreshUrl: string;
  returnUrl: string;
}

export interface ConnectOnboardingResult {
  url: string;
  expiresAt: Date;
}

export interface CreateConnectAccountSessionParams {
  providerAccountId: string;
}

export interface ConnectAccountSessionResult {
  clientSecret: string;
  expiresAt: Date;
}

export interface CreateConnectCheckoutParams {
  providerAccountId: string;
  externalReference: string;
  amountMinor: number;
  applicationFeeMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
}

export interface ConnectCheckoutResult {
  providerSessionId: string;
  providerPaymentId?: string;
  redirectUrl: string;
  status: string;
  expiresAt: Date;
}
