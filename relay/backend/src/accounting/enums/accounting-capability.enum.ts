// src/accounting/enums/accounting-capability.enum.ts
//
// Capability keys for the Accounting channel.
//
// Status conventions (from CapabilityStatus in payments domain):
//   Available   — implemented, tested, and usable today.
//   Planned     — will be implemented in a future phase.
//   Unsupported — the provider does not support this capability at all.

export enum AccountingCapability {
  // ── Page-level ────────────────────────────────────────────────────────────
  Dashboard = 'dashboard',

  // ── Organisation ─────────────────────────────────────────────────────────
  Organisation = 'organisation',

  // ── Contacts ─────────────────────────────────────────────────────────────
  Contacts = 'contacts',

  // ── Chart of accounts ────────────────────────────────────────────────────
  ChartOfAccounts = 'chartOfAccounts',

  // ── Tax ──────────────────────────────────────────────────────────────────
  Tax = 'tax',

  // ── Receivables / Payables ────────────────────────────────────────────────
  AccountsReceivable = 'accountsReceivable',
  AccountsPayable = 'accountsPayable',

  // ── Banking (Chart of Accounts bank accounts) ─────────────────────────────
  Banking = 'banking',

  // ── Bank Transactions / Accounting Transactions ───────────────────────────
  // Manually-created Spend/Receive Money transactions in the accounting system.
  // Xero: GET /api.xro/2.0/BankTransactions
  // Distinct from Bank Feed (bank-originated statement lines).
  BankTransactions = 'bankTransactions',

  // ── Bank Feed ─────────────────────────────────────────────────────────────
  // Bank-originated statement lines imported from a financial institution.
  // NOT the same as BankTransactions (accounting entries).
  // Availability depends on provider API access (e.g. Xero Bank Feeds API).
  BankFeed = 'bankFeed',

  // ── Reconciliation ────────────────────────────────────────────────────────
  // Matching bank feed statement lines to accounting transactions.
  // Availability depends on provider exposing both resources via API.
  Reconciliation = 'reconciliation',

  // ── Bank Connections (Open Banking — external institution connections) ────
  BankConnections = 'bankConnections',

  // ── Payment records ───────────────────────────────────────────────────────
  PaymentRecords = 'paymentRecords',

  // ── Manual Journals (external-app integration — write capable) ───────────
  ManualJournals = 'manualJournals',

  // ── General Ledger / Journals (read-only provider ledger view) ────────────
  Journals = 'journals',

  // ── Budgets ──────────────────────────────────────────────────────────────
  Budgets = 'budgets',

  // ── Reports ──────────────────────────────────────────────────────────────
  Reports = 'reports',

  // ── Inventory ────────────────────────────────────────────────────────────
  Inventory = 'inventory',

  // ── Assets ───────────────────────────────────────────────────────────────
  Assets = 'assets',

  // ── Payroll ──────────────────────────────────────────────────────────────
  Payroll = 'payroll',

  // ── Files ────────────────────────────────────────────────────────────────
  Files = 'files',

  // ── Webhooks ─────────────────────────────────────────────────────────────
  Webhooks = 'webhooks',

  // ── Sync ─────────────────────────────────────────────────────────────────
  Sync = 'sync',
}

/**
 * Capability status — reuses the same values as CapabilityStatus in the payments domain
 * to stay consistent with the existing platform capability model.
 *
 * Available   = 'available'
 * Planned     = 'planned'
 * Unsupported = 'unsupported'
 */
export enum AccountingCapabilityStatus {
  Available = 'available',
  Planned = 'planned',
  Unsupported = 'unsupported',
}

export type AccountingProviderCapabilities = {
  capabilities: Partial<
    Record<AccountingCapability, AccountingCapabilityStatus>
  >;
};
