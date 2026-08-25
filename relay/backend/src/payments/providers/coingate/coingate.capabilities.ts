// src/payments/providers/coingate/coingate.capabilities.ts
//
// CoinGate capability declarations — reflects actual implementation state.
//
// Status conventions:
//   Available   — the feature is implemented, tested, and usable today.
//   Planned     — the feature will be implemented in a future phase.
//   Unsupported — CoinGate does not support this capability at all.
//
// When promoting a capability from Planned to Available:
//   1. Adapter method fully implemented and tested.
//   2. Canonical endpoint implemented and type-checked.
//   3. Frontend page renders correctly.
//   4. No external API call required for the promotion itself.

import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';
import type { PaymentProviderCapabilities } from '../../types/payment.types';

export const COINGATE_CAPABILITIES: PaymentProviderCapabilities = {
  capabilities: {
    // ── Page-level capabilities ─────────────────────────────────────────────

    // Dashboard: provider+connection metadata available from context — no API call needed.
    [PaymentCapability.Dashboard]: CapabilityStatus.Available,

    // Payments page: order listing and detail are implemented.
    [PaymentCapability.Payments]: CapabilityStatus.Available,

    // Payment Testing: sandbox order creation implemented via IPaymentTestingProvider.
    [PaymentCapability.PaymentTesting]: CapabilityStatus.Available,

    // Gateway: generic credential infrastructure + gateway guide are in place.
    [PaymentCapability.Gateway]: CapabilityStatus.Available,

    // ── Technical execution capabilities ────────────────────────────────────

    // Account: CoinGate has no dedicated merchant account endpoint; ledger data
    // provides indirect insight but is a separate phase.
    [PaymentCapability.Account]: CapabilityStatus.Planned,

    // Balance: CoinGate API does not expose an authoritative real-time balance
    // endpoint for merchant accounts. Ledger totals do not substitute for balance.
    [PaymentCapability.Balance]: CapabilityStatus.Unsupported,

    // PaymentUnits: currency/asset discovery via GET /currencies is implemented.
    [PaymentCapability.PaymentUnits]: CapabilityStatus.Available,

    // OneTimePayments: order creation is implemented via IPaymentListProvider.
    [PaymentCapability.OneTimePayments]: CapabilityStatus.Available,

    // RecurringPayments: CoinGate does not support merchant-initiated recurring charges.
    [PaymentCapability.RecurringPayments]: CapabilityStatus.Unsupported,

    // PaymentMethods: CoinGate does not expose configurable merchant payment methods.
    // Accepted currencies are discovered via PaymentUnits (GET /currencies).
    [PaymentCapability.PaymentMethods]: CapabilityStatus.Unsupported,

    // Checkout: CoinGate white-label Checkout requires account activation.
    // Standard redirect order flow (payment_url) is available.
    [PaymentCapability.Checkout]: CapabilityStatus.Planned,

    // Refunds: listing, detail, and creation are implemented.
    [PaymentCapability.Refunds]: CapabilityStatus.Available,
    [PaymentCapability.RefundListing]: CapabilityStatus.Available,
    [PaymentCapability.RefundDetail]: CapabilityStatus.Available,
    [PaymentCapability.RefundCreation]: CapabilityStatus.Available,

    // PartialRefunds: CoinGate supports partial amounts; implementation is in place.
    [PaymentCapability.PartialRefunds]: CapabilityStatus.Available,

    // RefundReasons: reason field exists but is a free-form string, not a canonical enum set.
    [PaymentCapability.RefundReasons]: CapabilityStatus.Available,

    // Disputes: CoinGate merchant API does not expose dispute management.
    [PaymentCapability.Disputes]: CapabilityStatus.Unsupported,

    // Payouts: CoinGate Send Requests require account-specific feature activation.
    // Implementation deferred until account access is confirmed.
    [PaymentCapability.Payouts]: CapabilityStatus.Planned,
    [PaymentCapability.PayoutListing]: CapabilityStatus.Planned,
    [PaymentCapability.PayoutDetail]: CapabilityStatus.Planned,
    [PaymentCapability.PayoutFiltering]: CapabilityStatus.Planned,
    [PaymentCapability.PayoutCancellation]: CapabilityStatus.Planned,
    [PaymentCapability.PayoutReversal]: CapabilityStatus.Unsupported,
    [PaymentCapability.PayoutReconciliation]: CapabilityStatus.Planned,

    // Webhooks: CoinGate uses per-order callback URLs (not remote endpoint CRUD).
    // Callback receiver is implemented and delivery monitoring is available.
    [PaymentCapability.Webhooks]: CapabilityStatus.Available,

    // WebhookEndpoint CRUD: CoinGate configures callback URLs per order,
    // not through a remote endpoint management API.
    [PaymentCapability.WebhookEndpointListing]: CapabilityStatus.Unsupported,
    [PaymentCapability.WebhookEndpointDetail]: CapabilityStatus.Unsupported,
    [PaymentCapability.WebhookEndpointCreation]: CapabilityStatus.Unsupported,
    [PaymentCapability.WebhookEndpointUpdate]: CapabilityStatus.Unsupported,
    [PaymentCapability.WebhookEndpointDeletion]: CapabilityStatus.Unsupported,
    [PaymentCapability.WebhookEventSelection]: CapabilityStatus.Unsupported,

    // Delivery monitoring: WebhookDelivery records are created for callbacks.
    [PaymentCapability.WebhookDeliveryMonitoring]: CapabilityStatus.Available,

    // WebhookReplay: internal retry of failed Graphify processing is supported.
    [PaymentCapability.WebhookReplay]: CapabilityStatus.Planned,

    // PaymentLinks: CoinGate does not support merchant-managed payment links.
    [PaymentCapability.PaymentLinks]: CapabilityStatus.Unsupported,
  },
};
