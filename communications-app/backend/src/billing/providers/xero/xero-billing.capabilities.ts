// src/billing/providers/xero/xero-billing.capabilities.ts
//
// Xero billing capability declarations.
//
// All capabilities are Planned until OAuth 2.0 is implemented.
// No Xero API call is made in this file.

import {
  BillingCapability,
  BillingCapabilityStatus,
  type BillingProviderCapabilities,
} from '../../enums/billing-capability.enum';

export const XERO_BILLING_CAPABILITIES: BillingProviderCapabilities = {
  capabilities: {
    // Dashboard: provider and connection metadata only — no Xero API call needed.
    [BillingCapability.Dashboard]: BillingCapabilityStatus.Planned,

    // All business capabilities are Planned pending OAuth 2.0 implementation.
    [BillingCapability.Invoices]: BillingCapabilityStatus.Planned,
    [BillingCapability.CreditNotes]: BillingCapabilityStatus.Planned,
    [BillingCapability.InvoiceDelivery]: BillingCapabilityStatus.Planned,
    [BillingCapability.InvoiceStatus]: BillingCapabilityStatus.Planned,
    [BillingCapability.RecurringBilling]: BillingCapabilityStatus.Planned,
    [BillingCapability.Reminders]: BillingCapabilityStatus.Planned,
  },
};

export const XERO_PROVIDER_KEY = 'xero';
export const XERO_DISPLAY_NAME = 'Xero';
export const XERO_CONNECTION_TYPE = 'oauth';
