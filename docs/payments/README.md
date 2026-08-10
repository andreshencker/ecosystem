# Payments Module

> Architecture overview and entry point for the Communications App Payments module.

---

## Documents

| Document | Purpose |
|---|---|
| [Provider Integration Guide](provider-integration-guide.md) | Authoritative standard for adding a new payment provider |
| [Provider Integration Checklist](provider-integration-checklist.md) | PR-ready checklist for every integration |
| [CoinGate Reference Implementation](coingate-reference-implementation.md) | First complete provider — verified end-to-end |

---

## Purpose

The Payments module in the Communications App gives companies a unified API to:

- List, view, and filter payment orders across providers.
- Run Payment Testing against a real sandbox connection without modifying any business flow.
- Receive automatic payment-status updates through provider callbacks.
- Configure providers and credentials per company without touching source code.

**The Communications App does not process payments directly.** It acts as the integration layer between external business applications and the underlying payment provider APIs (CoinGate, Stripe, etc.).

---

## Responsibility Boundaries

```
External Application  (e.g. Business App / ERP)
        │
        │  Calls Communications Payments API using an Integration Token.
        │  Never talks directly to CoinGate, Stripe, or any other provider.
        ↓
Communications Payments API  (NestJS — port 3001)
        │
        │  Resolves the company's selected provider and decrypts credentials.
        │  Routes the request to the correct provider adapter.
        ↓
Payments Service / Runtime Resolver
        │
        │  Enforces company isolation, validates credentials,
        │  and delegates to the provider adapter.
        ↓
Provider Adapter  (e.g. CoingatePaymentProvider, StripePaymentProvider)
        │
        │  Speaks the provider-native API.
        │  Maps provider responses to canonical contracts.
        │  All provider-specific logic stays inside this layer.
        ↓
Provider API  (e.g. api-sandbox.coingate.com, api.stripe.com)
```

---

## Canonical API Principle

External applications consume **canonical Payments endpoints** only:

- `GET /payments/accounts` — list active connections.
- `GET /payments/accounts/:id/payments` — list payments for a connection.
- `GET /payments/connections/:id/page-definition` — rendering definition for the Payments page.
- `POST /payments/testing` — create a sandbox payment test.

They never call `GET https://api.coingate.com/...` or `GET https://api.stripe.com/...` directly. The provider remains an implementation detail of the Communications App.

---

## Source-of-Truth Principle

**Provider resources are not duplicated locally.** Payment orders, balances, and payment methods live exclusively on the provider's platform. The Communications App fetches them live when needed.

The only records persisted locally are:

- `WebhookDelivery` — audit trail for received callbacks (idempotency, signature evidence).
- `WebhookEndpointSecret` — encrypted signing secret for Stripe webhook endpoints.

---

## High-Level Architecture

### Company → Provider → Connection

Every company configures:

1. An **enabled provider** (`CompanyChannelProvider`) — which payment provider the company uses.
2. **Credentials** (`ProviderCredentials`) — encrypted provider API credentials for that connection.

Multiple connections (e.g. `jtrade-test`, `jtrade-live`) can exist for the same provider. The frontend's Provider/Connection selector presents these from the company's actual configuration.

### Provider Adapters

Each provider is an injectable NestJS class that implements `IPaymentProvider` plus zero or more optional capability interfaces:

| Interface | Purpose |
|---|---|
| `IPaymentConnectionProvider` | Live credential validation |
| `IPaymentListProvider` | Payment listing and detail |
| `IPaymentUnitProvider` | Currency/asset discovery |
| `IPaymentTestingProvider` | Sandbox test order creation |
| `IPaymentRefundProvider` | Refund listing, detail, creation |
| `IPaymentPayoutProvider` | Payout listing and detail |
| `IPaymentReferenceDataProvider` | Dynamic option lists (price currencies, etc.) |
| `IPaymentsPageDefinitionProvider` | Payments page layout definition |
| `IRefundsPageDefinitionProvider` | Refunds page layout definition |
| `IPaymentTestingPageDefinitionProvider` | Testing page form definition |
| `IGatewayGuideProvider` | Developer integration guide |
| `IPaymentMethodConfigurationProvider` | Payment method configuration |
| `IPaymentBalanceProvider` | Live account balance |

Adapters are registered in `PaymentProviderRegistry`. Adding a new provider requires only registering its class — no switch statements in generic layers.

### Capability-Driven Rendering

The frontend **does not** branch on `providerKey === 'coingate'`. Instead:

- The backend returns a **capability map** per provider.
- The backend returns a **page definition** per connection.
- The frontend renders generically from those definitions.

This means Stripe and CoinGate can produce entirely different Payments pages with no frontend branching.

---

## Source Locations

| Area | Path |
|---|---|
| Payments module | `communications-app/backend/src/payments/` |
| Provider adapters | `src/payments/providers/{provider}/` |
| Domain interfaces | `src/payments/interfaces/payment-provider.interface.ts` |
| Canonical contracts | `src/payments/contracts/` |
| Domain errors | `src/payments/errors/payment.errors.ts` |
| Capability enum | `src/payments/enums/payment.enums.ts` |
| Status enum | `src/payments/enums/payment-canonical-status.enum.ts` |
| Frontend hooks | `communications-app/frontend/hooks/api/usePayments.ts` |
| Frontend types | `communications-app/frontend/types/payments.ts` |
| Frontend pages | `communications-app/frontend/app/(portal)/payments/` |
