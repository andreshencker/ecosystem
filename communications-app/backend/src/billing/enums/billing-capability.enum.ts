// src/billing/enums/billing-capability.enum.ts
//
// Capability keys for the Billing channel.

export enum BillingCapability {
  // ── Page-level ────────────────────────────────────────────────────────────
  Dashboard = 'dashboard',

  // ── Invoices ─────────────────────────────────────────────────────────────
  Invoices = 'invoices',

  // ── Credit notes ─────────────────────────────────────────────────────────
  CreditNotes = 'creditNotes',

  // ── Invoice delivery ─────────────────────────────────────────────────────
  InvoiceDelivery = 'invoiceDelivery',

  // ── Invoice status ────────────────────────────────────────────────────────
  InvoiceStatus = 'invoiceStatus',

  // ── Recurring billing ────────────────────────────────────────────────────
  RecurringBilling = 'recurringBilling',

  // ── Reminders ────────────────────────────────────────────────────────────
  Reminders = 'reminders',
}

/**
 * Capability status — mirrors CapabilityStatus from the payments domain.
 */
export enum BillingCapabilityStatus {
  Available = 'available',
  Planned = 'planned',
  Unsupported = 'unsupported',
}

export type BillingProviderCapabilities = {
  capabilities: Partial<Record<BillingCapability, BillingCapabilityStatus>>;
};
