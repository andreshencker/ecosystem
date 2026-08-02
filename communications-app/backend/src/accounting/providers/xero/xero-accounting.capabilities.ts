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

    // All business capabilities are Planned pending OAuth 2.0 implementation.
    [AccountingCapability.Organisation]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Contacts]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.ChartOfAccounts]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Tax]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.AccountsReceivable]:
      AccountingCapabilityStatus.Planned,
    [AccountingCapability.AccountsPayable]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Banking]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.PaymentRecords]: AccountingCapabilityStatus.Planned,
    [AccountingCapability.Journals]: AccountingCapabilityStatus.Planned,
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
