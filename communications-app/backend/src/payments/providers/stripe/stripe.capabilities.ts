// src/payments/providers/stripe/stripe.capabilities.ts

import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';
import type { PaymentProviderCapabilities } from '../../types/payment.types';

/**
 * Stripe provider capabilities.
 *
 * All capabilities are currently `planned` — no Stripe API operations have
 * been implemented yet. Each entry will be promoted to `available` only when
 * its corresponding provider method is built, tested, and reviewed.
 *
 * Do not change any status to `available` until the operation is implemented.
 */
export const STRIPE_CAPABILITIES: PaymentProviderCapabilities = {
  capabilities: {
    // ── Page-level capabilities ─────────────────────────────────────────────
    // Dashboard: account + balance views are implemented.
    [PaymentCapability.Dashboard]: CapabilityStatus.Available,
    // Payments listing is implemented via GET /v1/payment_intents.
    [PaymentCapability.Payments]: CapabilityStatus.Available,
    // Payment testing is implemented via IPaymentTestingProvider.
    [PaymentCapability.PaymentTesting]: CapabilityStatus.Available,
    // Gateway integration guide is implemented via IGatewayGuideProvider.
    [PaymentCapability.Gateway]: CapabilityStatus.Available,

    // ── Technical execution capabilities ────────────────────────────────────
    // Account retrieval is implemented via GET /v1/account.
    [PaymentCapability.Account]: CapabilityStatus.Available,
    // Balance retrieval is implemented via GET /v1/balance.
    [PaymentCapability.Balance]: CapabilityStatus.Available,
    // Payment units derived from PaymentIntents + Balance currencies.
    [PaymentCapability.PaymentUnits]: CapabilityStatus.Available,
    [PaymentCapability.OneTimePayments]: CapabilityStatus.Planned,
    [PaymentCapability.RecurringPayments]: CapabilityStatus.Planned,
    [PaymentCapability.PaymentMethods]: CapabilityStatus.Available,
    [PaymentCapability.Checkout]: CapabilityStatus.Planned,
    [PaymentCapability.Refunds]: CapabilityStatus.Available,
    [PaymentCapability.RefundListing]: CapabilityStatus.Available,
    [PaymentCapability.RefundDetail]: CapabilityStatus.Available,
    [PaymentCapability.RefundCreation]: CapabilityStatus.Available,
    [PaymentCapability.PartialRefunds]: CapabilityStatus.Available,
    [PaymentCapability.RefundReasons]: CapabilityStatus.Available,
    [PaymentCapability.Disputes]: CapabilityStatus.Planned,
    // Payout listing and detail implemented via GET /v1/payouts.
    [PaymentCapability.Payouts]: CapabilityStatus.Available,
    [PaymentCapability.PayoutListing]: CapabilityStatus.Available,
    [PaymentCapability.PayoutDetail]: CapabilityStatus.Available,
    [PaymentCapability.PayoutFiltering]: CapabilityStatus.Available,
    [PaymentCapability.PayoutCancellation]: CapabilityStatus.Planned,
    [PaymentCapability.PayoutReversal]: CapabilityStatus.Planned,
    [PaymentCapability.PayoutReconciliation]: CapabilityStatus.Planned,
    // Webhook endpoint management implemented via /v1/webhook_endpoints.
    [PaymentCapability.Webhooks]: CapabilityStatus.Available,
    [PaymentCapability.WebhookEndpointListing]: CapabilityStatus.Available,
    [PaymentCapability.WebhookEndpointDetail]: CapabilityStatus.Available,
    [PaymentCapability.WebhookEndpointCreation]: CapabilityStatus.Available,
    [PaymentCapability.WebhookEndpointUpdate]: CapabilityStatus.Available,
    [PaymentCapability.WebhookEndpointDeletion]: CapabilityStatus.Available,
    [PaymentCapability.WebhookEventSelection]: CapabilityStatus.Available,
    [PaymentCapability.WebhookDeliveryMonitoring]: CapabilityStatus.Available,
    [PaymentCapability.WebhookReplay]: CapabilityStatus.Planned,
    [PaymentCapability.PaymentLinks]: CapabilityStatus.Planned,
  },
};
