// src/accounting/contracts/banking/accounting-bank-account.contract.ts
//
// Canonical representations for the Accounting Banking domain.
//
// These are live views fetched from the provider — never persisted by the
// platform. The `id` field is the provider's own account identifier.

import type { AccountingMoney } from '../../types/accounting.types';

/**
 * Canonical bank account detail.
 *
 * Richer than BankAccountSummary — includes bank-specific fields.
 * Always fetched live from the provider.
 *
 * Provider mapping:
 *   Xero → GET /api.xro/2.0/Accounts/{AccountID}
 */
export interface BankAccountDetail {
  /** Provider-specific account identifier (e.g. Xero AccountID UUID). */
  id: string;

  /** Account display name. */
  name: string;

  /** User-defined chart-of-accounts code (e.g. '090'). */
  code?: string;

  /** Physical bank account number. Provider-controlled; may be masked. */
  bankAccountNumber?: string;

  /** Type of banking instrument. */
  bankAccountType?: 'bank' | 'creditcard' | 'paypal' | string;

  /** ISO 4217 currency code (e.g. 'AUD', 'USD'). */
  currency?: string;

  /** Whether the account is currently active in the provider. */
  isActive: boolean;

  /** Optional account description. */
  description?: string;

  /** Whether payments can be made from this account through the provider. */
  enablePaymentsToAccount?: boolean;
}

/**
 * Canonical bank account balance.
 *
 * Represents a point-in-time snapshot of funds in a bank account.
 * Always fetched live from the provider — never cached by the platform.
 *
 * Provider mapping:
 *   Xero → GET /api.xro/2.0/Reports/BankSummary (filtered by accountId)
 *
 * Both balances may be absent if the provider cannot determine them
 * (e.g. if no transactions have been recorded yet).
 */
export interface BankAccountBalance {
  /** Provider-specific bank account identifier. */
  accountId: string;

  /** Account name at time of retrieval. */
  accountName: string;

  /** ISO 4217 currency code. Null when the provider does not report it. */
  currency?: string;

  /**
   * Balance per the bank's own records (from imported bank statements).
   * Null when the provider has no imported statement for this account.
   */
  statementBalance?: AccountingMoney;

  /**
   * Balance calculated by the provider from recorded transactions.
   * May differ from statementBalance when transactions are unreconciled.
   */
  xeroBalance?: AccountingMoney;

  /** When this balance snapshot was retrieved from the provider. */
  retrievedAt: Date;
}
