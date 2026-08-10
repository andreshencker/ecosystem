// src/accounting/providers/xero/xero-accounting.capabilities.ts
//
// Xero accounting capability declarations.
//
// Status conventions:
//   Available   — implemented and usable (no Xero API call required).
//   Planned     — will be implemented once OAuth is in place.
//   Unsupported — Xero does not support this through its API.
//
// All API-dependent capabilities are Planned until the OAuth 2.0 flow is
// implemented. No Xero API call is made in this file.

import {
  AccountingCapability,
  AccountingCapabilityStatus,
  type AccountingProviderCapabilities,
} from '../../enums/accounting-capability.enum';

export const XERO_ACCOUNTING_CAPABILITIES: AccountingProviderCapabilities = {
  capabilities: {
    // Dashboard: provider and connection metadata only — no Xero API call needed.
    [AccountingCapability.Dashboard]: AccountingCapabilityStatus.Planned,

    // Banking: read operations (list accounts, get account, get balance) are available.
    [AccountingCapability.Banking]: AccountingCapabilityStatus.Available,

    // BankTransactions (Accounting Transactions): requires accounting.banktransactions.read scope.
    // Returns manually-created Spend/Receive Money transactions.
    // NOT bank feed statement lines — those are a separate resource.
    [AccountingCapability.BankTransactions]:
      AccountingCapabilityStatus.Available,

    // BankFeed: unreconciled bank statement lines imported from financial institutions.
    // Standard Xero Accounting API does not expose these lines.
    // Xero Bank Feeds API requires additional OAuth scopes and setup not available
    // through the current standard Accounting application.
    [AccountingCapability.BankFeed]: AccountingCapabilityStatus.Planned,

    // Reconciliation: matching bank statement lines to accounting transactions.
    // Requires access to both bank statement lines (not available via standard API)
    // and accounting transaction state. Managed in Xero's own reconciliation UI.
    [AccountingCapability.Reconciliation]: AccountingCapabilityStatus.Planned,

    // BankConnections: Xero exposes financial account metadata (bank accounts,
    // credit cards) through its Accounts API (Type=="BANK"). This is the same
    // data surface used by the Bank Connections page. Xero is not an Open
    // Banking provider — it does not provide direct institution transaction
    // feeds — but financial account metadata IS available through the standard
    // Accounting API. Available here means "list financial accounts via provider".
    [AccountingCapability.BankConnections]:
      AccountingCapabilityStatus.Available,

    // ManualJournals: external-app integration capability; requires accounting.manualjournals scope.
    [AccountingCapability.ManualJournals]: AccountingCapabilityStatus.Available,

    // Journals: read-only General Ledger view of /Journals; requires accounting.journals.read scope.
    [AccountingCapability.Journals]: AccountingCapabilityStatus.Available,

    // Remaining capabilities are Planned pending implementation.
    [AccountingCapability.Organisation]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Contacts]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.ChartOfAccounts]:
      AccountingCapabilityStatus.Available,
    [AccountingCapability.Tax]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.AccountsReceivable]:
      AccountingCapabilityStatus.Planned,
    [AccountingCapability.AccountsPayable]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.PaymentRecords]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Budgets]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Reports]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Inventory]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Assets]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Payroll]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Files]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Webhooks]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Sync]: AccountingCapabilityStatus.Planned,
  },
};

export const XERO_PROVIDER_KEY = 'xero';
export const XERO_DISPLAY_NAME = 'Xero';
export const XERO_CONNECTION_TYPE = 'oauth';
