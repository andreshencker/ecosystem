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

  // ── Banking ───────────────────────────────────────────────────────────────
  Banking = 'banking',

  // ── Payment records ───────────────────────────────────────────────────────
  PaymentRecords = 'paymentRecords',

  // ── Journals ─────────────────────────────────────────────────────────────
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
