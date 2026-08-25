// types/accounting.ts
//
// Frontend types for the Accounting channel.
// Mirrors the canonical backend contracts — never extends or invents fields.

// ─── Provider / Capability ────────────────────────────────────────────────────

export type AccountingCapabilityStatus = 'available' | 'planned' | 'unsupported';

export interface AccountingProviderCapabilitiesResponse {
  providerKey: string;
  displayName: string;
  capabilities: Partial<Record<string, AccountingCapabilityStatus>>;
}

/** One active accounting provider configured for the company. */
export interface AccountingProviderOption {
  /** CompanyChannelProvider._id — primary selection key. */
  ccpId: string;
  /** Provider._id from the catalog. */
  providerId: string;
  /** Stable provider key (e.g. 'xero'). */
  providerKey: string;
  /** Human-readable name (e.g. 'Xero'). */
  displayName: string;
  isActive: boolean;
}

// ─── Credentials ─────────────────────────────────────────────────────────────

/**
 * Safe subset of ProviderCredentials for the accounting channel.
 * Never includes access tokens, refresh tokens, or client secrets.
 */
export interface AccountingCredentialSummary {
  /** ProviderCredentials._id */
  id: string;
  providerKey: string;
  tag: string;
  /** Non-secret display identifier (e.g. client ID or organisation name). */
  displayIdentifier?: string;
  isActive: boolean;
  connectedAt: string | null;
}

// ─── Money ────────────────────────────────────────────────────────────────────

export interface AccountingMoney {
  /** Amount in smallest currency unit (minor units). */
  amountMinor: number;
  /** ISO 4217 currency code (e.g. 'AUD'). */
  currency: string;
}

// ─── Generic list result ──────────────────────────────────────────────────────

export interface AccountingListResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

// ─── Chart of Accounts / Banking ─────────────────────────────────────────────

/** Mirrors backend BankAccountSummary (accounting.types.ts). */
export interface BankAccountSummary {
  id: string;
  name: string;
  code?: string;
  currency?: string;
  isActive?: boolean;
  /** Instrument type from the provider (e.g. BANK, CREDITCARD, PAYPAL). */
  type?: string;
  /** Tax type code (e.g. INPUT, OUTPUT). Present when the backend surfaces it. */
  taxType?: string;
  /** Normalised account status derived from the provider. */
  status?: 'active' | 'archived';
  /** Physical bank account number as stored by the provider. May be masked at source. */
  bankAccountNumber?: string;
  /**
   * Balance calculated by the accounting provider from its recorded transactions.
   * Present only when the list was fetched with withBalances=true.
   * For Xero: "Balance in Xero" from GET /Reports/BankSummary.
   */
  xeroBalance?: AccountingMoney;
  /**
   * Balance per the bank's own records (from imported bank statements).
   * Present only when the list was fetched with withBalances=true.
   * For Xero: "Statement Balance" from GET /Reports/BankSummary.
   */
  statementBalance?: AccountingMoney;
}

/** Mirrors backend BankAccountDetail (accounting-bank-account.contract.ts). */
export interface BankAccountDetail {
  id: string;
  name: string;
  code?: string;
  bankAccountNumber?: string;
  bankAccountType?: 'bank' | 'creditcard' | 'paypal' | string;
  currency?: string;
  isActive: boolean;
  description?: string;
  enablePaymentsToAccount?: boolean;
  /** Xero account type (e.g. BANK, EXPENSE, REVENUE). */
  type?: string;
  /** Tax type code applied to this account. */
  taxType?: string;
  /** Xero system account identifier, if this is a system-managed account. */
  systemAccount?: string;
}

/** Mirrors backend BankAccountBalance (accounting-bank-account.contract.ts).
 * retrievedAt is serialised to ISO string over HTTP. */
export interface BankAccountBalance {
  accountId: string;
  accountName: string;
  currency?: string;
  statementBalance?: AccountingMoney;
  xeroBalance?: AccountingMoney;
  retrievedAt: string;
}

/** Query parameters for GET /accounting/banking/:credentialId/accounts */
export interface ListBankAccountsParams {
  cursor?: string;
  limit?: number;
  search?: string;
  includeArchived?: boolean;
  /**
   * Provider account type filter.
   * 'BANK' (default) — standard bank accounts.
   * 'CREDITCARD'     — credit card accounts.
   * Both types support accounting transactions (BankTransactions endpoint).
   */
  accountType?: 'BANK' | 'CREDITCARD';
  /**
   * When true, the backend fetches GET /Reports/BankSummary in parallel and
   * attaches xeroBalance + statementBalance to each account summary.
   * One extra Xero API call — covers all accounts (no N+1).
   */
  withBalances?: boolean;
}

// ─── Bank Transactions ────────────────────────────────────────────────────────

/** Mirrors backend BankTransactionSummary (accounting.types.ts). */
export interface BankTransactionSummary {
  id: string;
  bankAccountId: string;
  /** Raw provider type (e.g. RECEIVE, SPEND, RECEIVE-TRANSFER). */
  type: string;
  /** Normalised direction derived from provider type. */
  direction: 'in' | 'out';
  status: 'authorised' | 'deleted';
  /** ISO date string YYYY-MM-DD. */
  date?: string;
  contactName?: string;
  description?: string;
  reference?: string;
  total: AccountingMoney;
  isReconciled?: boolean;
}

/** Query params for GET /accounting/banking/:cred/accounts/:bankAccountId/transactions */
export interface ListBankTransactionsParams {
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'authorised' | 'deleted' | 'all';
  search?: string;
}

// ─── Chart of Accounts ────────────────────────────────────────────────────────

/** Mirrors backend AccountSummary (accounting.types.ts). */
export interface AccountSummary {
  /** Provider account identifier (e.g. Xero AccountID). */
  id: string;
  code?: string;
  name: string;
  /** Provider account type string (e.g. 'BANK', 'EXPENSE', 'REVENUE'). */
  type: string;
  /** Provider-computed class (e.g. 'ASSET', 'LIABILITY'). Read-only. */
  class?: string;
  taxType?: string;
  status: 'active' | 'archived';
  systemAccount?: boolean;
  paymentsEnabled?: boolean;
}

/** Mirrors backend AccountDetail. Extends AccountSummary with full fields. */
export interface AccountDetail extends AccountSummary {
  description?: string;
  currency?: string;
  bankAccountNumber?: string;
  bankAccountType?: string;
  showInExpenseClaims?: boolean;
}

/** Input for creating an account. */
export interface CreateAccountInput {
  code?: string;
  name: string;
  type: string;
  taxType?: string;
  description?: string;
  currency?: string;
  paymentsEnabled?: boolean;
  showInExpenseClaims?: boolean;
  organisationId?: string;
}

/** Input for updating an account. Only send editable fields. */
export interface UpdateAccountInput {
  code?: string;
  name?: string;
  taxType?: string;
  description?: string;
  paymentsEnabled?: boolean;
  showInExpenseClaims?: boolean;
  organisationId?: string;
}

export interface ArchiveAccountResult {
  id: string;
  archived: boolean;
}

export interface DeleteAccountResult {
  deleted: boolean;
  message?: string;
}

/** Query parameters for GET /accounting/chart-of-accounts/:credentialId/accounts */
export interface ListAccountsParams {
  cursor?: string;
  limit?: number;
  search?: string;
  /** Filter by account type string (e.g. 'BANK'). Server-side. */
  type?: string;
  /** 'active' (default) | 'archived' | 'all'. Server-side. */
  status?: 'active' | 'archived' | 'all';
}

// ─── Manual Journals ──────────────────────────────────────────────────────────

export interface ManualJournalLine {
  accountCode: string;
  /** Signed amount — positive = debit, negative = credit (external app's responsibility). */
  amount: number;
  description?: string;
  taxType?: string;
  tracking?: Array<{ name: string; option: string }>;
}

export interface ManualJournalSummary {
  id: string;
  providerResourceId: string;
  externalReference?: string;
  date?: string;
  narration?: string;
  status?: string;
  lineAmountType?: string;
  showOnCashBasisReports?: boolean;
  hasAttachments?: boolean;
  updatedAt?: string;
}

export interface ManualJournalDetail extends ManualJournalSummary {
  lines: ManualJournalLine[];
  sourceUrl?: string;
  createdAt?: string;
}

export interface CreateManualJournalInput {
  date: string;
  narration: string;
  lines: ManualJournalLine[];
  status?: 'draft' | 'posted';
  lineAmountType?: 'NoTax' | 'Exclusive' | 'Inclusive';
  showOnCashBasisReports?: boolean;
  externalReference?: string;
  organisationId?: string;
}

export interface UpdateManualJournalInput {
  date?: string;
  narration?: string;
  lines?: ManualJournalLine[];
  status?: 'draft' | 'posted';
  lineAmountType?: 'NoTax' | 'Exclusive' | 'Inclusive';
  showOnCashBasisReports?: boolean;
  externalReference?: string;
  organisationId?: string;
}

export interface ListManualJournalsParams {
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'draft' | 'posted' | 'deleted' | 'voided' | 'all';
}

// ─── General Ledger / Journals ────────────────────────────────────────────────

export interface JournalLineSummary {
  journalLineId?: string;
  accountCode?: string;
  accountName?: string;
  description?: string;
  /** Net amount as signed float (positive = debit, negative = credit). */
  netAmount: number;
  grossAmount?: number;
  taxAmount?: number;
  taxType?: string;
}

export interface JournalSummary {
  id: string;
  journalNumber?: number;
  date?: string;
  createdAt?: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  lines: JournalLineSummary[];
}

export interface ListJournalsParams {
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
  sourceType?: string;
  offset?: number;
}
