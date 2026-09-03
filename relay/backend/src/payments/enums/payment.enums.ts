// src/payments/enums/payment.enums.ts

export enum PaymentCapability {
  // ── Page-level feature capabilities ────────────────────────────────────────
  // One key per Payments page. Used by the frontend to guard page queries
  // before issuing any provider API request.
  Dashboard = 'dashboard',
  Payments = 'payments',
  PaymentTesting = 'paymentTesting',
  Gateway = 'gateway',

  // ── Technical execution capabilities ───────────────────────────────────────
  Account = 'account',
  Balance = 'balance',
  OneTimePayments = 'oneTimePayments',
  RecurringPayments = 'recurringPayments',
  PaymentMethods = 'paymentMethods',
  Checkout = 'checkout',
  Connect = 'connect',
  Refunds = 'refunds',
  RefundListing = 'refundListing',
  RefundDetail = 'refundDetail',
  RefundCreation = 'refundCreation',
  PartialRefunds = 'partialRefunds',
  RefundReasons = 'refundReasons',
  Disputes = 'disputes',
  Payouts = 'payouts',
  PayoutListing = 'payoutListing',
  PayoutDetail = 'payoutDetail',
  PayoutFiltering = 'payoutFiltering',
  PayoutCancellation = 'payoutCancellation',
  PayoutReversal = 'payoutReversal',
  PayoutReconciliation = 'payoutReconciliation',
  Webhooks = 'webhooks',
  WebhookEndpointListing = 'webhookEndpointListing',
  WebhookEndpointDetail = 'webhookEndpointDetail',
  WebhookEndpointCreation = 'webhookEndpointCreation',
  WebhookEndpointUpdate = 'webhookEndpointUpdate',
  WebhookEndpointDeletion = 'webhookEndpointDeletion',
  WebhookEventSelection = 'webhookEventSelection',
  WebhookDeliveryMonitoring = 'webhookDeliveryMonitoring',
  WebhookReplay = 'webhookReplay',
  PaymentLinks = 'paymentLinks',
  PaymentUnits = 'paymentUnits',
}

/**
 * Honest capability status.
 *
 * - Available:   fully implemented and ready to use.
 * - Planned:     will be implemented in a future phase; not callable yet.
 * - Unsupported: the provider does not support this capability at all.
 */
export enum CapabilityStatus {
  Available = 'available',
  Planned = 'planned',
  Unsupported = 'unsupported',
}

export enum PaymentEnvironment {
  Test = 'test',
  Live = 'live',
}
