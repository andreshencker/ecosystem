// src/accounting/types/accounting.types.ts
//
// Runtime context and foundation domain types for the Accounting channel.
//
// Provider metadata and context types mirror the Payments domain pattern.
// Placeholder domain types (BankAccountSummary, InvoiceSummary, etc.) carry
// only the minimum fields needed to make the adapter interface self-documenting.
// Their field sets will be expanded when each operation is implemented.

import type {
  AccountingCapability,
  AccountingCapabilityStatus,
} from '../enums/accounting-capability.enum';

// ─── Capabilities ─────────────────────────────────────────────────────────────

export interface AccountingProviderCapabilities {
  capabilities: Partial<
    Record<AccountingCapability, AccountingCapabilityStatus>
  >;
}

// ─── Provider metadata ────────────────────────────────────────────────────────

export interface AccountingProviderMetadata {
  providerKey: string;
  displayName: string;
  description: string;
  connectionType: string;
}

// ─── Runtime context ──────────────────────────────────────────────────────────

/**
 * Fully resolved provider context for a single Accounting request.
 *
 * Produced by AccountingResolverService — never constructed directly by
 * controllers or adapters. Credentials are decrypted in-memory only and
 * must not be serialised, logged, or returned to callers.
 */
export interface AccountingProviderContext {
  readonly providerKey: string;
  readonly connectionType: string;
  readonly credentialsId: string;
  readonly isActive: boolean;
  /** Pre-decrypted credentials. Scope: current request only. */
  readonly credentials: Record<string, unknown>;
  /**
   * Communications-internal organisation ID selected by the caller.
   * When present, the provider resolves it to the provider-specific tenant
   * context (e.g. Xero tenantId) rather than any default stored in the
   * credential.  External callers never supply raw Xero tenant IDs.
   */
  readonly organisationId?: string;
}

// ─── Connection validation ────────────────────────────────────────────────────

/**
 * Result returned by any accounting provider's connection test.
 *
 * Contains only provider-independent fields. Provider-specific information
 * (e.g. Xero tenantId, org name) belongs inside `metadata`.
 * Credential values must never appear here.
 */
export interface AccountingConnectionResult {
  connected: boolean;
  providerKey: string;
  checkedAt: Date;
  message?: string;
  /** Safe, non-sensitive provider-specific metadata. */
  metadata?: Record<string, unknown>;
}

// ─── Generic list result ──────────────────────────────────────────────────────

/**
 * Generic paged list result — wraps all listing operations.
 * Cursor-based; providers that use page numbers encode the page as a cursor.
 */
export interface AccountingListResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

// ─── Common list parameters ───────────────────────────────────────────────────

export interface AccountingListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  updatedSince?: string; // ISO date — incremental sync
}

// ─── Money ────────────────────────────────────────────────────────────────────

/**
 * Provider-independent monetary value.
 * Uses minor units (smallest currency unit) to avoid floating-point errors.
 */
export interface AccountingMoney {
  /** Amount in the smallest currency unit (e.g. cents for AUD). */
  amountMinor: number;
  /** ISO 4217 currency code (e.g. 'AUD', 'USD', 'GBP'). */
  currency: string;
}

// ─── Placeholder domain types ─────────────────────────────────────────────────
// These carry the minimum fields necessary to make the adapter interface
// self-documenting. Full field sets are defined when implementing each section.

// ── Banking ──────────────────────────────────────────────────────────────────

export interface BankAccountSummary {
  id: string;
  name: string;
  code?: string;
  currency?: string;
  isActive?: boolean;
  /** Instrument type returned by the provider (e.g. 'BANK', 'CREDITCARD', 'PAYPAL'). */
  type?: string;
  /** Normalised account status derived from the provider status field. */
  status?: 'active' | 'archived';
  /** Physical bank account number as stored by the provider. May be masked at source. */
  bankAccountNumber?: string;
  /**
   * Balance calculated by the accounting provider from its recorded transactions.
   * Absent when not fetched (listBankAccounts without withBalances=true) or when
   * the provider does not report a balance for this account.
   * For Xero: sourced from GET /Reports/BankSummary, "Balance in Xero" column.
   */
  xeroBalance?: AccountingMoney;
  /**
   * Balance per the bank's own records (from imported bank statements / bank feed).
   * Absent when not fetched or when the provider has no imported statement.
   * For Xero: sourced from GET /Reports/BankSummary, "Statement Balance" column.
   */
  statementBalance?: AccountingMoney;
}

export interface BankTransactionSummary {
  id: string;
  bankAccountId: string;
  /** Raw provider type: RECEIVE, SPEND, RECEIVE-TRANSFER, SPEND-TRANSFER, etc. */
  type: string;
  /** Normalised direction derived from provider type. */
  direction: 'in' | 'out';
  status: 'authorised' | 'deleted';
  /** ISO date string (YYYY-MM-DD) — the transaction date. */
  date?: string;
  /** Contact or payee name as returned by the provider. */
  contactName?: string;
  /** Description from the first line item, if present. */
  description?: string;
  reference?: string;
  total: AccountingMoney;
  isReconciled?: boolean;
}

export interface ListBankTransactionsParams extends AccountingListParams {
  /** ISO date (YYYY-MM-DD). Server-side filter — inclusive lower bound. */
  dateFrom?: string;
  /** ISO date (YYYY-MM-DD). Server-side filter — inclusive upper bound. */
  dateTo?: string;
  /** 'authorised' (default) | 'deleted' | 'all'. Server-side. */
  status?: 'authorised' | 'deleted' | 'all';
}

// ── Open Banking / Bank Connections ──────────────────────────────────────────
// Types for the generic bank connectivity layer (Open Banking providers such as
// Basiq, TrueLayer, Plaid). NOT related to Xero Chart of Accounts bank accounts.

/** A financial institution returned by an Open Banking provider. */
export interface InstitutionSummary {
  /** Provider-specific institution identifier. */
  id: string;
  /** Display name of the institution (e.g. 'Commonwealth Bank'). */
  name: string;
  country?: string;
  logoUrl?: string;
}

/** Parameters for initiating a new Open Banking connection. */
export interface CreateBankConnectionParams {
  /** Provider-specific institution identifier. */
  institutionId: string;
  /** OAuth redirect URI to return to after consent. */
  redirectUri?: string;
  /** Requested consent duration in days. Provider may enforce its own limits. */
  consentDurationDays?: number;
}

/**
 * Live state of a bank connection as returned by an Open Banking provider.
 * This is the provider-side view — the platform persists a canonical copy
 * in the BankConnection MongoDB document.
 */
export interface BankConnectionProviderResult {
  /** Provider-specific connection identifier. */
  providerConnectionId: string;
  institutionId: string;
  institutionName?: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error' | 'pending';
  consentStatus?: 'active' | 'expired' | 'pending';
  consentExpiresAt?: Date;
  connectedAt?: Date;
  lastSyncedAt?: Date;
  accountsCount?: number;
  /** Authorization URL for the initial consent flow (returned by createConnection). */
  authUrl?: string;
}

/**
 * A bank account as returned by an Open Banking provider.
 * NOT to be confused with a Xero Chart of Accounts BANK entry.
 */
export interface OpenBankingAccountSummary {
  /** Provider-specific account identifier. */
  id: string;
  providerConnectionId: string;
  accountName?: string;
  accountNumber?: string;
  accountType?: string;
  currency?: string;
  isActive: boolean;
}

/** A bank transaction from an Open Banking provider. */
export interface OpenBankingTransactionSummary {
  id: string;
  accountId: string;
  amount?: AccountingMoney;
  description?: string;
  date?: string;
  direction?: 'credit' | 'debit';
  merchantName?: string;
  category?: string;
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export interface ContactSummary {
  id: string;
  name: string;
  email?: string;
  isSupplier?: boolean;
  isCustomer?: boolean;
  isActive?: boolean;
}

export interface ContactDetail extends ContactSummary {
  phone?: string;
  website?: string;
  taxNumber?: string;
}

export interface CreateContactParams {
  name: string;
  email?: string;
  phone?: string;
  isSupplier?: boolean;
  isCustomer?: boolean;
}

export interface UpdateContactParams {
  name?: string;
  email?: string;
  phone?: string;
}

// ── Invoices (Accounts Receivable) ───────────────────────────────────────────

export interface InvoiceSummary {
  id: string;
  type: string; // 'ACCREC' for invoices
  contactId?: string;
  contactName?: string;
  status?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  total?: AccountingMoney;
  amountDue?: AccountingMoney;
}

export interface InvoiceDetail extends InvoiceSummary {
  lineItems?: unknown[];
  reference?: string;
  currencyCode?: string;
}

export interface CreateInvoiceParams {
  contactId: string;
  date: string;
  dueDate?: string;
  lineItems: unknown[];
  reference?: string;
}

export interface UpdateInvoiceParams {
  dueDate?: string;
  reference?: string;
  lineItems?: unknown[];
}

// ── Bills (Accounts Payable) ─────────────────────────────────────────────────

export interface BillSummary {
  id: string;
  type: string; // 'ACCPAY' for bills
  contactId?: string;
  contactName?: string;
  status?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  total?: AccountingMoney;
  amountDue?: AccountingMoney;
}

export interface BillDetail extends BillSummary {
  lineItems?: unknown[];
  reference?: string;
}

export interface CreateBillParams {
  contactId: string;
  date: string;
  dueDate?: string;
  lineItems: unknown[];
  reference?: string;
}

export interface UpdateBillParams {
  dueDate?: string;
  reference?: string;
  lineItems?: unknown[];
}

// ── Payments (payment records applied to invoices/bills) ─────────────────────

export interface PaymentRecordSummary {
  id: string;
  invoiceId?: string;
  billId?: string;
  amount?: AccountingMoney;
  date?: string;
  reference?: string;
}

export interface CreatePaymentRecordParams {
  invoiceId?: string;
  billId?: string;
  amount: AccountingMoney;
  date: string;
  reference?: string;
}

// ── Assets (Fixed Assets) ─────────────────────────────────────────────────────

export interface AssetSummary {
  id: string;
  name: string;
  assetNumber?: string;
  status?: string;
  bookValue?: AccountingMoney;
  purchaseDate?: string;
}

export interface AssetDetail extends AssetSummary {
  assetTypeId?: string;
  purchasePrice?: AccountingMoney;
}

// ── Inventory (Items / Products) ─────────────────────────────────────────────

export interface InventoryItemSummary {
  id: string;
  code?: string;
  name: string;
  isTracked?: boolean;
  isSold?: boolean;
  isPurchased?: boolean;
  salesPrice?: AccountingMoney;
}

export interface InventoryItemDetail extends InventoryItemSummary {
  description?: string;
  purchasePrice?: AccountingMoney;
  quantityOnHand?: number;
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  status?: string;
  startDate?: string;
}

export interface EmployeeDetail extends EmployeeSummary {
  jobTitle?: string;
  dateOfBirth?: string;
}

// ── Organisation ─────────────────────────────────────────────────────────────

export interface OrganisationSummary {
  name: string;
  legalName?: string;
  baseCurrency?: string;
  countryCode?: string;
  organisationStatus?: string;
}

// ── Manual Journals ───────────────────────────────────────────────────────────
// Canonical model for provider-agnostic manual journal entries.
// External applications own all business/accounting logic (account selection,
// debit/credit intent, amounts, taxes). Communications only validates structure
// and routes the fully-formed request to the selected provider.

export interface ManualJournalLine {
  /** Provider account code (e.g. Xero account code like '400'). */
  accountCode: string;
  /**
   * Signed line amount in the journal's currency.
   * Positive = debit, negative = credit (external app's responsibility).
   */
  amount: number;
  description?: string;
  taxType?: string;
  tracking?: Array<{ name: string; option: string }>;
}

export interface ManualJournalSummary {
  /** Communications-internal resource ID. */
  id: string;
  /** Provider-assigned resource ID (e.g. Xero ManualJournalID). */
  providerResourceId: string;
  /** External application correlation reference. */
  externalReference?: string;
  /** ISO date string (YYYY-MM-DD). */
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

export interface CreateManualJournalRequest {
  /** ISO date string (YYYY-MM-DD). Required by most providers. */
  date: string;
  /** Journal description / narration (required). */
  narration: string;
  /** Journal lines — minimum 2, balanced debits and credits (provider-enforced). */
  lines: ManualJournalLine[];
  /** 'draft' | 'posted' — defaults to 'draft' when omitted. */
  status?: 'draft' | 'posted';
  lineAmountType?: 'NoTax' | 'Exclusive' | 'Inclusive';
  showOnCashBasisReports?: boolean;
  /** Caller-supplied correlation ID for idempotency / tracking. */
  externalReference?: string;
}

export interface UpdateManualJournalRequest {
  date?: string;
  narration?: string;
  lines?: ManualJournalLine[];
  status?: 'draft' | 'posted';
  lineAmountType?: 'NoTax' | 'Exclusive' | 'Inclusive';
  showOnCashBasisReports?: boolean;
  externalReference?: string;
}

export interface ListManualJournalsParams extends AccountingListParams {
  dateFrom?: string;
  dateTo?: string;
  status?: 'draft' | 'posted' | 'deleted' | 'voided' | 'all';
}

// ── General Ledger / Journals ─────────────────────────────────────────────────
// Read-only view of accounting journal entries from the provider's general ledger.
// Uses the provider's native Journals resource (e.g. Xero GET /Journals).
// Never used for creating or modifying manual journals.

export interface JournalLineSummary {
  journalLineId?: string;
  accountCode?: string;
  accountName?: string;
  description?: string;
  /** Net amount as a signed float (positive = debit, negative = credit). */
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

export interface ListJournalsParams extends AccountingListParams {
  dateFrom?: string;
  dateTo?: string;
  sourceType?: string;
  /** Offset-based; Xero uses an offset integer (not cursor) for pagination. */
  offset?: number;
}

// ── Chart of Accounts ─────────────────────────────────────────────────────────

export interface AccountSummary {
  /** Provider account identifier (e.g. Xero AccountID). Safe to surface. */
  id: string;
  code?: string;
  name: string;
  /** Provider account type string (e.g. 'BANK', 'EXPENSE', 'REVENUE'). */
  type: string;
  /** Provider-computed class (e.g. 'ASSET', 'LIABILITY', 'REVENUE'). Read-only. */
  class?: string;
  taxType?: string;
  status: 'active' | 'archived';
  systemAccount?: boolean;
  paymentsEnabled?: boolean;
}

export interface AccountDetail extends AccountSummary {
  description?: string;
  currency?: string;
  bankAccountNumber?: string;
  bankAccountType?: string;
  showInExpenseClaims?: boolean;
}

export interface CreateAccountParams {
  code?: string;
  name: string;
  type: string;
  taxType?: string;
  description?: string;
  currency?: string;
  paymentsEnabled?: boolean;
  showInExpenseClaims?: boolean;
}

export interface UpdateAccountParams {
  code?: string;
  name?: string;
  taxType?: string;
  description?: string;
  paymentsEnabled?: boolean;
  showInExpenseClaims?: boolean;
}

export interface ArchiveAccountResult {
  id: string;
  archived: boolean;
}

export interface DeleteAccountResult {
  deleted: boolean;
  message?: string;
}

export interface ListAccountsParams extends AccountingListParams {
  /** Filter by provider account type string (e.g. 'BANK'). */
  type?: string;
  /** 'active' (default) | 'archived' | 'all' */
  status?: 'active' | 'archived' | 'all';
}
