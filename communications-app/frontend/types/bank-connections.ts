// types/bank-connections.ts
//
// Frontend types for the Bank Connections feature.
// Mirrors the backend BankConnectionResponse and related DTOs.
//
// Bank Connections represent links to external financial institutions via
// Open Banking providers (e.g. Basiq, TrueLayer, Plaid).
// They are NOT Xero bank accounts from the Chart of Accounts.

import type { AccountingListResult } from './accounting';

export type BankConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'error'
  | 'pending';

export type BankConsentStatus = 'active' | 'expired' | 'pending';

/** Canonical bank connection as returned by the platform API. */
export interface BankConnection {
  id: string;
  companyId: string;
  /** Stable key of the Open Banking provider (e.g. 'basiq', 'truelayer'). */
  providerKey: string;
  /** Connection identifier assigned by the provider. Null until consent completes. */
  providerConnectionId: string | null;
  institutionId: string | null;
  institutionName: string | null;
  status: BankConnectionStatus;
  consentStatus: BankConsentStatus | null;
  consentExpiresAt: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  accountsCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Query parameters for GET /accounting/bank-connections */
export interface ListBankConnectionsParams {
  provider?: string;
  institution?: string;
  status?: BankConnectionStatus;
  search?: string;
  limit?: number;
  cursor?: string;
}

/** A registered Open Banking provider (from GET /accounting/bank-connections/providers). */
export interface BankConnectionProvider {
  providerKey: string;
  displayName: string;
}

export type BankConnectionListResult = AccountingListResult<BankConnection>;
