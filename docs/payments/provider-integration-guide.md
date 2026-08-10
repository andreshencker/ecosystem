# Payments Provider Integration Guide

> Authoritative standard for adding a payment provider to the Communications App.
> Every new integration must follow this guide.

---

## 1. Purpose and Scope

This guide defines the canonical process and constraints for integrating a payment provider into the Communications App Payments module.

**What this guide covers:**
- Provider adapter design and required interfaces.
- Credential lifecycle and security rules.
- Capability declaration and effect on rendering.
- Page definitions and reference data.
- Payment listing, testing, callbacks, and error handling.
- Required tests and production-readiness requirements.

**What this guide does not cover:**
- Customer invoicing or product pricing — those are Business App concerns.
- Bookkeeping, accounting, or ERP workflows.
- Any provider-specific API beyond the canonical adapter interface.

**Why all providers must use this architecture:**
Provider-specific logic confined to adapters allows the generic frontend and generic services to function correctly for any provider without modification. Branching on `providerKey` in shared layers is an anti-pattern that creates hidden coupling, breaks new providers, and makes testing unreliable.

---

## 2. Core Design Principles

| Principle | Rule |
|---|---|
| Reuse before creation | Use existing services, contracts, and schemas. Only create new files when no existing abstraction covers the need. |
| Company-scoped providers | Every payment operation is scoped to a company. `businessId` / `companyId` from the JWT — never from the request body. |
| Encrypted credentials at rest | All provider credentials are encrypted using `CryptoService` before persistence in `ProviderCredentials`. |
| Credentials decrypted only in memory | `ChannelsRuntimeResolverService.resolveByProviderCredentialsId` decrypts credentials in-process for the current request only. |
| No credentials in responses | Provider tokens, secret keys, and Authorization header values must never appear in HTTP responses, logs, or test assertions. |
| Provider is source of truth | Payment orders, balances, and payment methods live on the provider. Do not duplicate them in a local database. |
| No provider-name branching in generic pages | The generic Payments, Refunds, and Testing pages must not contain `if (providerKey === 'coingate')` or equivalent. |
| Capabilities control features | A feature is only rendered or called when the provider declares it `available`. |
| Page definitions control rendering | Card layout, filter fields, table columns, and row actions come from the provider's page definition — not hardcoded in React. |
| Reference data controls dynamic options | Dropdowns that depend on provider state (price currencies, payment methods) come from `GET /payments/connections/:id/reference-data/:source`. |
| Canonical contracts isolate the frontend | The frontend imports only `types/payments.ts` — never provider-native types. |
| Honest capability representation | A capability in state `planned` or `unsupported` must not call provider APIs. |
| Transport errors ≠ unsupported capability | A 503 from the provider is `PaymentProviderUnavailableError`, not `PaymentCapabilityNotSupportedError`. |
| Sandbox and production isolated | `mode: 'test'` always uses the sandbox base URL. `mode: 'live'` always uses production. No mixing. |
| No hardcoded secrets | No provider tokens, company IDs, or API keys in source code. All come from decrypted runtime credentials. |

---

## 3. Existing Reusable Architecture

### 3.1 Provider Catalogue

**Purpose:** Global registry of provider types. One entry per integration (e.g. `coingate`, `stripe`).

**Schema:** The `Provider` Mongoose schema in `src/communication/channels/providers/schemas/provider.schema.ts`.

**Fields:** `providerKey` (stable identifier), `displayName`, `connectionType`, `channelId`, `isActive`.

**What a new provider must do:** Add a seed entry in the catalog bootstrap service with the correct `channelKey: 'payment'`.

**What to reuse unchanged:** The schema, the bootstrap service, and the seeding pattern.

---

### 3.2 Channel Catalogue

**Purpose:** Associates providers with capability channels (payment, email, calendar, etc.).

**Schema:** `Channel` in `src/communication/channels/channels-catalogue/`.

**What to reuse unchanged:** The existing `payment` channel entry. A new payment provider joins the same channel — do not create a new channel.

---

### 3.3 CompanyChannelProvider

**Purpose:** Links a specific company to an enabled provider for a given channel.

**Schema:** `CompanyChannelProvider` in `src/communication/channels/company-channel-providers/schemas/`.

**Fields:** `companyId`, `providerId`, `channelId`, `isDefault`, `isActive`.

**What a new provider must do:** A company admin enables the provider via the UI (Company → Enabled Providers). This creates a `CompanyChannelProvider` record.

**What to reuse unchanged:** The schema, the controller, and the service. No code changes needed for a new provider.

---

### 3.4 ProviderCredentials

**Purpose:** Stores encrypted provider credentials for a company's connection.

**Schema:** `ProviderCredentials` in `src/communication/channels/provider-credentials/schemas/`.

**Fields:** `companyChannelProviderId`, `tag`, `mode`, `encrypted`, `isActive`.

**What a new provider must do:** Define a credential contract (`{provider}.credentials.contract.ts`) with `normalize` and `validate` methods. All sensitive fields are encrypted automatically by `CryptoService`.

**What to reuse unchanged:** The schema, the encryption mechanism, and the credential lifecycle service.

---

### 3.5 Runtime Credential Resolution

**Class:** `ChannelsRuntimeResolverService`
**File:** `src/communication/channels/runtime/channels-runtime-resolver.service.ts`

**Purpose:** Decrypts credentials in-memory for the current request and returns `ChannelsRuntimeResolved` with `credentials`, `providerKey`, `channelKey`, `connectionType`, `isActive`.

**Input:** `{ companyId: string, providerCredentialsId: string }`.

**Output:** `ChannelsRuntimeResolved` — includes decrypted `credentials` (never persisted or returned to callers).

**What a new provider must do:** Nothing. The service resolves any provider automatically.

**What to reuse unchanged:** The entire service. Never call `CryptoService` directly in a payment controller or service.

---

### 3.6 Provider Registry

**Class:** `PaymentProviderRegistry`
**File:** `src/payments/registry/payment-provider.registry.ts`

**Purpose:** Immutable map of `providerKey → IPaymentProvider` instance. Populated at module startup.

**Input (at startup):** Array of `IPaymentProvider` instances injected via `PaymentsModule`.

**Output:** `registry.resolve(providerKey)` returns the adapter or throws `PaymentProviderNotFoundError`.

**What a new provider must do:** Create the class, add it to the `providers` array in `PaymentsModule`, and add it to the `useFactory` array for `PaymentProviderRegistry`.

**What to reuse unchanged:** The registry class and the resolution logic.

---

### 3.7 Provider Interface

**File:** `src/payments/interfaces/payment-provider.interface.ts`

Every adapter must implement `IPaymentProvider` at minimum:

```typescript
interface IPaymentProvider {
  readonly providerKey: string;
  readonly displayName: string;
  readonly description: string;
  getCapabilities(): PaymentProviderCapabilities;
  getMetadata(): PaymentProviderMetadata;
}
```

Optional capability interfaces (implement only those genuinely supported):

| Interface | `readonly` flag | Primary methods |
|---|---|---|
| `IPaymentConnectionProvider` | `supportsConnection` | `validateConnection` |
| `IPaymentListProvider` | `supportsPaymentListing` | `listPayments`, `getPayment` |
| `IPaymentUnitProvider` | `supportsPaymentUnits` | `listPaymentUnits` |
| `IPaymentTestingProvider` | `supportsPaymentTesting` | `getSupportedTestScenarios`, `createPaymentTest` |
| `IPaymentRefundProvider` | `supportsRefundListing` | `listRefunds`, `getRefund`, `createRefund` |
| `IPaymentPayoutProvider` | `supportsPayoutListing` | `listPayouts`, `getPayout` |
| `IPaymentReferenceDataProvider` | `supportsPaymentReferenceData` | `getPaymentReferenceData` |
| `IPaymentsPageDefinitionProvider` | `supportsPaymentsPageDefinition` | `getPaymentsPageDefinition` |
| `IRefundsPageDefinitionProvider` | `supportsRefundsPageDefinition` | `getRefundsPageDefinition` |
| `IPaymentTestingPageDefinitionProvider` | `supportsPaymentTestingPageDefinition` | `getPaymentTestingPageDefinition` |
| `IGatewayGuideProvider` | `supportsGatewayGuide` | `getGatewayGuide` |
| `IPaymentBalanceProvider` | `supportsBalance` | `getBalance` |
| `IPaymentMethodConfigurationProvider` | `supportsPaymentMethods` | `listPaymentMethods`, `getPaymentMethod`, `updatePaymentMethod` |

**Type guards** (`isTestingProvider`, `isPaymentListProvider`, etc.) in the same file let services check capabilities safely without `instanceof`.

---

### 3.8 Canonical Payments List and Detail

**Contracts:**
- `PaymentSummary` and `PaymentListResult` in `src/payments/contracts/payment-list.contract.ts`.
- `PaymentDetail` extends `PaymentSummary`.

**Service:** `PaymentsListService` — routes to `isPaymentListProvider` adapter.

**Routes:**
- `GET /payments/accounts/:accountId/payments` — paginated list.
- `GET /payments/accounts/:accountId/payments/:paymentId` — detail.

**What a new provider must map to canonical:**
- `status` → `PaymentCanonicalStatus` (use `mapCoinGateOrderStatus` pattern).
- `amountMinor` as integer (minor units).
- `currency` as lowercase ISO code.
- `providerStatus` preserves the raw provider string.
- `paymentUrl` for hosted redirect links.

---

### 3.9 Payment Testing

**Service:** `PaymentsTestingService` in `src/payments/services/payments-testing.service.ts`.

**Routes:**
- `GET /payments/testing/scenarios` — supported test scenarios for the connection.
- `POST /payments/testing` — create a sandbox payment test.

**DTO:** `CreatePaymentTestDto` in `src/payments/dto/create-payment-test.dto.ts`.

**Key fields:** `connectionId`, `amountMinor`, `priceCurrency`, `currency`, `scenario`, `description`, `providerExtensions`.

**Callback URL injection:** `PaymentsTestingService` reads `API_BASE_URL` from `ConfigService` and injects `callbackUrl` into `providerExtensions` for providers that use per-order callbacks (e.g. CoinGate). Providers that use registered webhook endpoints (e.g. Stripe) ignore this field.

---

### 3.10 Page Definitions

**Services:**
- `PaymentsPageDefinitionService` — Payments list page layout.
- `RefundsPageDefinitionService` — Refunds list page layout.
- `PaymentsTestingPageDefinitionService` — Testing form layout.

**Routes:**
- `GET /payments/connections/:connectionId/page-definition`
- `GET /payments/connections/:connectionId/refunds/page-definition`
- `GET /payments/connections/:connectionId/testing/page-definition`

**Contracts:**
- `PaymentsPageDefinition` in `src/payments/contracts/payments-page-definition.contract.ts`.
- `RefundsPageDefinition` in `src/payments/contracts/refunds-page-definition.contract.ts`.
- `PaymentTestingPageDefinition` in `src/payments/contracts/payment-testing-page-definition.contract.ts`.

**Payments page definition structure:**

```typescript
interface PaymentsPageDefinition {
  providerKey: string;
  connectionId: string;
  version: string;
  capabilities: Partial<Record<string, CapabilityStatus>>;
  summaryCards: PaymentSummaryCardDefinition[];
  filters: PaymentFilterDefinition[];
  columns: PaymentColumnDefinition[];
  rowActions: PaymentActionDefinition[];
  list: {
    supported: boolean;
    defaultPageSize: number;
    allowedPageSizes: number[];
    paginationType: 'cursor' | 'page' | 'none';
    defaultSort?: string;
  };
  emptyState: { title: string; description: string };
  metadata?: Record<string, unknown>;
}
```

**Testing page definition structure:**

```typescript
interface PaymentTestingPageDefinition {
  providerKey: string;
  connectionId: string;
  environment: 'test' | 'live' | 'unknown';
  version: string;
  capabilities: Partial<Record<string, CapabilityStatus>>;
  form: {
    supported: boolean;
    title: string;
    description?: string;
    submitLabel: string;
    fields: PaymentTestingFieldDefinition[];
  };
  result: {
    presentationType: 'redirect' | 'embedded' | 'none';
    successTitle?: string;
    successDescription?: string;
  };
  instructions?: string[];
  limitations?: string[];
  metadata?: Record<string, unknown>;
}
```

A field with `referenceDataSource` causes the frontend to call `GET /payments/connections/:id/reference-data/:source` to populate its dropdown options.

---

### 3.11 Reference Data

**Service:** `PaymentsReferenceDataService` in `src/payments/services/payments-reference-data.service.ts`.

**Route:** `GET /payments/connections/:connectionId/reference-data/:source`

**Contract:** `src/payments/contracts/payment-reference-data.contract.ts`

**Valid sources** (`PaymentReferenceDataSource`):

| Source | Meaning |
|---|---|
| `price_currencies` | Fiat currencies valid for order price denomination |
| `receive_currencies` | Assets the merchant settles into |
| `payment_assets` | All assets a buyer can use at checkout |
| `payment_methods` | Configured payment method options |
| `refund_reasons` | Canonical refund reason codes |
| `countries` | Country options for address fields |
| `networks` | Blockchain network options |
| `webhook_events` | Event types for webhook subscription |

---

### 3.12 Webhook Deliveries

**Schema:** `WebhookDelivery` in `src/payments/schemas/webhook-delivery.schema.ts`.

**Fields (key):** `companyId`, `providerCredentialId`, `providerEventId` (idempotency key), `eventType`, `signatureStatus`, `processingStatus`, `duplicate`, `payloadHash`, `safePayload`, `receivedAt`, `expiresAt`.

**Routes:**
- `GET /payments/accounts/:accountId/webhook-deliveries`
- `GET /payments/accounts/:accountId/webhook-deliveries/:deliveryId`
- `POST /payments/accounts/:accountId/webhook-deliveries/:deliveryId/retry`

**Idempotency:** Unique compound index on `{ providerCredentialId, providerEventId }`. Duplicate callbacks are recorded with `duplicate: true`.

---

### 3.13 Canonical Domain Errors

**File:** `src/payments/errors/payment.errors.ts`

| Error class | HTTP mapping | Trigger |
|---|---|---|
| `PaymentProviderNotFoundError` | 404 | Provider key not in registry |
| `PaymentProviderNotConfiguredError` | 422 | No `CompanyChannelProvider` for company |
| `PaymentProviderCredentialsUnavailableError` | 422 | No active `ProviderCredentials` |
| `PaymentCapabilityNotSupportedError` | 422 | Capability is `planned` or `unsupported` |
| `PaymentCredentialChannelMismatchError` | 422 | Credential belongs to a different channel |
| `PaymentCredentialsInvalidError` | 422 | Provider rejected the credentials |
| `PaymentProviderUnavailableError` | 503 | Provider API unreachable or 5xx |
| `PaymentConfigurationInvalidError` | 422 | Invalid configuration (e.g. live credentials for testing) |
| `PaymentProviderConnectionFailedError` | 422 | Connection test failed |
| `PaymentMethodNotFoundError` | 422 | Method ID not found in configuration |
| `DuplicateProviderRegistrationError` | — | Startup: duplicate `providerKey` in registry |

---

## 4. Provider Registration Flow

Follow this order exactly. Steps build on each other.

### Step 1 — Provider catalogue entry

Add a seed entry to the catalog bootstrap service:
```
providerKey: 'newprovider'
channelKey:  'payment'
displayName: 'New Provider'
connectionType: 'api_key' | 'token' | 'oauth'
```

This is **global** — not company-specific. One entry for all companies.

### Step 2 — Credential contract

Create `src/payments/providers/{provider}/{provider}.credentials.contract.ts` implementing `ContractSpec<TCredentials>` with `normalize` and `validate` methods.

Fields that contain secrets (tokens, keys, passwords) are encrypted automatically. The `normalize` method handles legacy field names and sets `mode: 'test' | 'live'`.

### Step 3 — Provider adapter class

Create `src/payments/providers/{provider}/{provider}.provider.ts` implementing `IPaymentProvider` at minimum. Implement only the capability interfaces genuinely supported by the provider.

### Step 4 — Capability metadata

Create `src/payments/providers/{provider}/{provider}.capabilities.ts` returning `PaymentProviderCapabilities`.

Declare each capability honestly:
- `Available` — implemented, tested, and safe to call.
- `Planned` — coming in a future phase.
- `Unsupported` — the provider does not support this.

### Step 5 — Register in PaymentsModule

Add the provider class to `providers` and `useFactory` in `src/payments/payments.module.ts`.

### Step 6 — Page definitions (where supported)

Create the page definition builder(s) in the provider folder. Return the canonical `PaymentsPageDefinition`, `RefundsPageDefinition`, or `PaymentTestingPageDefinition` shape.

### Step 7 — Reference data (where supported)

Implement `getPaymentReferenceData(ctx, source)` in the adapter. Route each `PaymentReferenceDataSource` to the correct provider endpoint. Return canonical `PaymentReferenceDataOption[]`.

### Step 8 — List/detail/testing/callbacks (as supported)

Implement each capability separately in focused modules inside the provider folder. Keep provider-native types (`{provider}.types.ts`) isolated from canonical contracts.

### Step 9 — Gateway guide (if desired)

Create `{provider}.gateway-guide.ts` returning `GatewayGuide`.

### Step 10 — Focused tests

One spec file per logical unit. See [Section 17](#17-testing-strategy).

### Step 11 — Runtime verification

Run the sandbox flow end-to-end. See [Section 18](#18-production-readiness-requirements).

### Step 12 — Documentation

Update the provider-integration checklist and create the provider reference document (see CoinGate Reference Implementation as the template).

---

**Global catalogue vs company configuration:**

| Concern | Scope | Where |
|---|---|---|
| Provider exists | Global | Provider seed, PaymentsModule |
| Provider enabled for company | Company | `CompanyChannelProvider` |
| Credentials stored for company | Company | `ProviderCredentials` |
| Page definitions | Per connection | Provider adapter |
| Capabilities | Per provider | Provider adapter |

---

## 5. Credential Lifecycle

### Creation

A company admin enters credentials in the UI (Company → Credentials). The backend normalizes them via `{provider}.credentials.contract.ts`, validates them, encrypts secrets via `CryptoService`, and persists the result in `ProviderCredentials`.

### Update

Only changed fields are applied. **Blank secret fields preserve existing encrypted values.** This allows updating display settings without re-entering secrets.

### Encrypted storage

All credentials are stored in the `encrypted` field of `ProviderCredentials`. The encryption uses `CREDENTIALS_MASTER_KEY_BASE64` (AES-256-GCM). The decrypted value is never stored in the database.

### Mode / environment field

Every provider credential must have a canonical `mode: 'test' | 'live'` field. This field — not the token shape or tag — determines which API base URL the adapter uses.

**Prohibited approaches:**
- Do not infer environment from the tag (e.g. checking if tag contains "sandbox").
- Do not infer environment from token format (e.g. `sk_test_` prefix in CoinGate).
- Stripe is the only exception: secret key prefix (`sk_test_`, `sk_live_`) is authoritative.

### Runtime decryption

`ChannelsRuntimeResolverService.resolveByProviderCredentialsId({ companyId, providerCredentialsId })` returns `ChannelsRuntimeResolved.credentials` — a plain object with decrypted field values, valid only for the current request lifecycle.

### Safe logging rules

- Log `companyId`, `connectionId`, `providerKey`, `mode`, and canonical status values freely.
- **Never log** the `token`, `secretKey`, `apiKey`, or any `Authorization` header value.
- **Never log** the full decrypted credential object.
- Log only the first 4 characters of a key prefixed with `[REDACTED]` when absolutely necessary for debugging.

### Ownership validation

`ChannelsRuntimeResolverService` throws `HttpException(404)` if the credential's `companyId` does not match the JWT `companyId`. This is the primary tenant-isolation check.

### Active/inactive handling

Only `isActive: true` credentials are resolved. Deactivated credentials cannot be used even if the `providerCredentialsId` is known.

---

## 6. Provider Capabilities

**Enum file:** `src/payments/enums/payment.enums.ts`

**Status values:**

| Status | Meaning |
|---|---|
| `CapabilityStatus.Available` | Fully implemented. The feature is callable and tested. |
| `CapabilityStatus.Planned` | Not yet implemented. Do not call provider APIs for this capability. |
| `CapabilityStatus.Unsupported` | The provider does not support this concept at all. |

**How capabilities affect rendering:**

| Layer | Effect |
|---|---|
| Backend routes | Services check capability before delegating to provider adapter |
| Page definitions | Summary cards, filters, columns, and actions include `capability?: string` guards |
| Frontend | `getCapabilityStatus(key)` returns `null \| 'available' \| 'planned' \| 'unsupported'` |
| Empty states | Shown for `available` with zero results |
| Unsupported states | Shown for `unsupported` — the feature genuinely does not exist |
| Hidden states | Components with `planned` are typically hidden entirely |

**CoinGate examples (from `coingate.capabilities.ts`):**

```typescript
[PaymentCapability.Balance]: CapabilityStatus.Unsupported,    // No balance endpoint
[PaymentCapability.Payments]: CapabilityStatus.Available,     // Order listing works
[PaymentCapability.PaymentTesting]: CapabilityStatus.Available,
[PaymentCapability.WebhookEndpointListing]: CapabilityStatus.Unsupported, // Uses per-order callbacks
```

The frontend calls `GET /payments/providers/:providerKey/capabilities` on provider selection and caches the result for 5 minutes. It does not issue balance requests for CoinGate because `Balance` is `Unsupported`.

---

## 7. Dynamic Page-Definition Architecture

```
Provider selected
        │
        ↓
Connection selected
        │
        ↓
GET /payments/connections/:connectionId/page-definition
        │
        ↓
Backend: resolveRuntime → provider.getPaymentsPageDefinition(ctx)
        │
        ↓
Canonical PaymentsPageDefinition returned
        │
        ↓
Frontend renders:
  summaryCards → cards shown above the table
  filters      → search/select/date filter controls
  columns      → table column set with types and widths
  rowActions   → per-row actions (view, open URL, refund, cancel)
  list         → pagination type and page sizes
  emptyState   → message when no results
```

**Key constraints:**
- Stripe and CoinGate return different page definitions. The generic Payments page renders both correctly without provider-name branching.
- Switching provider clears the connection selection so auto-resolution re-runs.
- Switching connection invalidates the page definition and re-fetches it.
- `staleTime: 60_000` — definitions are cached for 60 seconds.

---

## 8. Reference-Data Architecture

Reference data supplies controlled option lists for form fields that depend on provider state. It solves the problem of dynamic provider-specific choices (which fiat currencies does CoinGate support? which payment methods are configured?) without hardcoding values.

**Route:** `GET /payments/connections/:connectionId/reference-data/:source`

**Contract:** `src/payments/contracts/payment-reference-data.contract.ts`

**The CoinGate lesson — why sources must not be interchanged:**

| Field | Correct source | Wrong source |
|---|---|---|
| `price_currency` (order denomination) | `price_currencies` — fiat only | `payment_assets` — includes crypto |
| `receive_currency` (merchant settlement) | `receive_currencies` — crypto only | `payment_assets` — includes fiat |
| Buyer checkout options | `payment_assets` — all assets | `price_currencies` — fiat only |

Using `payment_assets` for `price_currency` caused CoinGate order creation to fail because crypto codes are not valid fiat price currencies. The fix was a dedicated `price_currencies` source that filters by `kind === 'fiat'` from the CoinGate API.

**Classification:** CoinGate's live v2 API uses `kind: 'fiat'` / `kind: 'crypto'`. Older mocks used `type`. The `isFiatCurrency` helper checks `kind` first, then `type`, then `merchant_pay` for backward compatibility.

**Frontend side:** A field in a testing or payment form with `referenceDataSource: 'price_currencies'` causes the frontend to call `GET /payments/connections/:id/reference-data/price_currencies` instead of the generic payment-units endpoint.

---

## 9. Canonical Payment Creation/Testing Flow

Payment Testing is an **integration diagnostic tool** — not a customer payment, invoice, or product flow. It creates a real order on the provider's sandbox and returns a payment URL for the developer to complete the flow manually.

```
Frontend form (from PaymentTestingPageDefinition)
        │
        ↓
POST /payments/testing
{ connectionId, amountMinor, priceCurrency, description, ... }
        │
        ↓
PaymentsTestingController → PaymentsTestingService
        │  Validates environment === 'test'
        │  Validates provider implements IPaymentTestingProvider
        │  Builds callbackUrl from API_BASE_URL
        ↓
Runtime resolver → decrypts credentials → provider.createPaymentTest(context, params)
        │
        ↓
Provider adapter (e.g. CoinGate: createCoinGateOrder)
        │  Sets token, callback_url, price_currency, amount
        ↓
Provider API returns order + paymentUrl
        │
        ↓
PaymentTestResult returned:
{ testId, providerPaymentId, status, paymentUrl, currency, ... }
        │
        ↓
Frontend result drawer:
  Shows status (requires_action)
  Shows "Open Payment Page" button linking to paymentUrl
```

**Security rules for testing:**
- Only `environment === 'test'` credentials may be used. Live credentials throw `PaymentConfigurationInvalidError`.
- `testId` is `{provider}-test-{providerOrderId}` — safe to display.
- No production payment is ever made from the testing endpoint.

---

## 10. Hosted and Embedded Checkout

### Hosted checkout (implemented for CoinGate)

1. Communications creates the provider order.
2. Provider returns a `payment_url` (e.g. `https://pay-sandbox.coingate.com/invoice/...`).
3. The user opens the payment URL in a browser tab.
4. The provider hosts the entire checkout UI.
5. Status updates arrive via callback (`callback_url`) set at order creation.

Result drawer shows "Open Payment Page" button. The `result.presentationType: 'redirect'` in the page definition signals this flow.

### Embedded/white-label checkout

CoinGate white-label checkout requires account activation and is **not currently implemented**. It would be represented as `PaymentCapability.Checkout: CapabilityStatus.Planned`.

If implemented in the future:
- It must be declared `available` in the capabilities.
- The adapter must map the provider's checkout session to a canonical presentation model.
- External applications must not implement provider-specific checkout APIs.

---

## 11. Payment Listing and Detail

### List endpoint

`GET /payments/accounts/:accountId/payments`

Accepts `ListPaymentsParams`: `cursor`, `limit`, `status`, `currency`, `createdFrom`, `createdTo`, `search`.

**Pagination:**
- **Cursor-based** (CoinGate): CoinGate uses page numbers internally. The adapter encodes the page as a base64 cursor to match the canonical `hasMore + nextCursor` contract.
- **Cursor-based** (Stripe): Stripe uses native `starting_after` cursors.
- Never pass Stripe cursor parameters to CoinGate or vice versa.

**Filter mapping:**
- Map canonical `status` values to provider-native status strings.
- Omit filters that are empty, default, or unsupported by the provider.
- Do not send `currency` filter to CoinGate (the list endpoint does not support it).

**Status mapping:** Each adapter provides a mapper (e.g. `mapCoinGateOrderStatus`) that converts provider-native status to `PaymentCanonicalStatus`. Unknown statuses map to `PaymentCanonicalStatus.Pending`.

**`providerStatus`** in `PaymentSummary` always preserves the raw provider string for debugging.

---

## 12. Canonical Statuses

**Enum file:** `src/payments/enums/payment-canonical-status.enum.ts`

| Canonical status | Enum value | Meaning |
|---|---|---|
| `Succeeded` | `'succeeded'` | Payment confirmed |
| `Failed` | `'failed'` | Payment not confirmed |
| `Processing` | `'processing'` | Awaiting blockchain/network confirmation |
| `Pending` | `'pending'` | Default for unknown states |
| `RequiresAction` | `'requires_action'` | User action needed (e.g. select currency, enter card) |
| `RequiresConfirmation` | `'requires_confirmation'` | Pending manual confirmation |
| `RequiresCapture` | `'requires_capture'` | Authorized, awaiting capture |
| `Cancelled` | `'cancelled'` | Cancelled (note: one `l` in the value) |
| `Expired` | `'expired'` | Order timed out |
| `Refunded` | `'refunded'` | Full refund completed |
| `PartiallyRefunded` | `'partially_refunded'` | Partial refund completed |

**CoinGate status mapping:**

| CoinGate status | Canonical status |
|---|---|
| `new` | `RequiresAction` |
| `pending` | `RequiresAction` |
| `confirming` | `Processing` |
| `paid` | `Succeeded` |
| `invalid` | `Failed` |
| `expired` | `Expired` |
| `canceled` | `Cancelled` |
| `refunded` | `Refunded` |
| `partially_refunded` | `PartiallyRefunded` |

---

## 13. Callback and Webhook-Delivery Flow

```
Provider sends POST to callback URL
        │
        ↓
PaymentsCoinGateCallbackController (public — no JWT required)
  POST /payments/callbacks/coingate/:credentialId
        │
        ↓
Credential + company lookup (MongoDB)
        │
        ↓
Token validation: SHA-256(credentialId:orderRef:coingate-callback-v1)[0:32]
  valid   → continue
  invalid → log warning, return 200 (silent rejection, do not 401)
  missing → log warning, continue with lower trust
        │
        ↓
Idempotency check (providerCredentialId + providerEventId unique index)
  duplicate → mark duplicate:true, return 200
        │
        ↓
WebhookDelivery created: { signatureStatus, processingStatus: 'verified', ... }
        │
        ↓
HTTP 200 { received: true }  ← sent immediately — not blocked by re-fetch
        │
        ↓ (async, non-blocking)
ChannelsRuntimeResolverService decrypts credentials
        │
        ↓
CoinGateClient.get('/orders/:orderId')  ← authoritative state from provider
        │
        ↓
mapCoinGateOrderStatus → PaymentCanonicalStatus
        │
        ↓
deliveryModel.updateOne: { processingStatus: 'processed', safePayload: { authoritativeStatus, canonicalStatus, ... } }
```

**Why re-fetch?** Callback payloads must not be trusted as the sole source of truth. A forged or replayed callback could carry an incorrect status. Re-fetching confirms the actual provider state.

**Why send 200 immediately?** Provider retry policies may classify delayed responses as failures and retry the callback, creating duplicates. The delivery record is created before the async re-fetch.

**Duplicate protection:** The `providerEventId` format is `coingate:{orderId}:{status}`, unique per order+status transition. MongoDB's unique index blocks duplicate inserts; the handler detects `code 11000` and marks the delivery `duplicate: true`.

**Invalid callbacks:** A failed token check causes `signatureStatus: 'invalid'`. The delivery is still recorded for audit visibility but `processingStatus` stays `'received'`. No further processing occurs.

**Public URL requirement:** The callback URL must be publicly reachable from CoinGate's servers. `http://localhost:3001/...` works only for local simulation. In staging/production, set `API_BASE_URL` to the public HTTPS endpoint (e.g. `https://api.yourdomain.com`).

**Stripe webhooks** use a different mechanism: registered webhook endpoints with per-endpoint signing secrets. The generic `PaymentsWebhookReceiverController` (`POST /payments/webhooks/:providerKey/:credentialId`) handles those.

---

## 14. Error Handling

**Mapping hierarchy:**

```
Provider API error
        │
        ↓
Provider-specific error mapper (e.g. mapCoinGateError)
  Maps HTTP status, extracts safe message, throws domain error
        │
        ↓
Domain error (src/payments/errors/payment.errors.ts)
        │
        ↓
Controller catches via .catch(err => this.mapDomainError(err))
  Maps domain error → NestJS HttpException
        │
        ↓
Frontend receives clean HTTP status + message
  Never sees provider raw error, stack trace, or credentials
```

| Scenario | Domain error | HTTP |
|---|---|---|
| Provider 401/403 | `PaymentCredentialsInvalidError` | 422 |
| Provider 404 | `PaymentProviderNotFoundError` | 404 |
| Provider 422 | `CoinGateValidationError` (provider-specific) | 422 |
| Provider 429 | `CoinGateRateLimitError` | 429 / 503 |
| Provider 500+ | `PaymentProviderUnavailableError` | 503 |
| Provider timeout | `PaymentProviderUnavailableError` | 503 |
| Network failure | `PaymentProviderUnavailableError` | 503 |
| Unsupported capability | `PaymentCapabilityNotSupportedError` | 422 |
| No credentials | `PaymentProviderCredentialsUnavailableError` | 422 |
| Wrong channel credential | `PaymentCredentialChannelMismatchError` | 422 |

**Rules:**
- `PaymentProviderUnavailableError` (503) is retriable; retry once via `retrySkip4xx`.
- `PaymentCapabilityNotSupportedError` (422) is never retried.
- The frontend shows a true empty state for a successful empty result (`data: []`), not an error.
- The frontend shows an `unsupported` state for `PaymentCapabilityNotSupportedError`, not a generic error.

---

## 15. Frontend Behaviour

**Provider selector:** Populated from `usePaymentProviders` → `useCompanyChannelProviders` with `channelKey: 'payment'`. Company-scoped.

**Connection selector:** Populated from `usePaymentAccounts` filtered by the selected provider's `providerKey`. Resets when provider changes.

**React Query keys:** All payment queries include `connectionId` in the key. Switching connections triggers re-fetch and discards stale data from the previous connection.

**Page definition loading:** `usePaymentsPageDefinition(connectionId)` with `staleTime: 60_000`. Returns null while loading.

**Reference data loading:** `usePaymentReferenceData(connectionId, source)` with `staleTime: 60_000` and `retry: retrySkip4xx`. Fields showing reference data dropdowns stay in loading state until data arrives.

**Loading state:** `CircularProgress` shown. Form submit disabled.

**Empty state:** Shown when `data.length === 0` for a successful response. Not an error.

**Unsupported state:** `ProviderFeatureUnavailable` component shown when `capabilityStatus === 'planned' || 'unsupported'`.

**Error state:** Error card shown when query fails after retry.

**Provider/connection reset:** `setSelectedProviderId` clears connection selection. Stale page definition is invalidated.

**Dynamic rendering:**
- Summary cards: rendered from `summaryCards` array in page definition.
- Filters: rendered from `filters` array.
- Table columns: rendered from `columns` array.
- Row actions: rendered from `rowActions` array.
- No provider-name branching in generic pages.

**Detail drawer:** Triggered by row action `type: 'view'`. Fetches `GET /payments/accounts/:accountId/payments/:paymentId`.

**Open payment URL:** Row action `type: 'open_url'`. Opens `paymentUrl` with `target="_blank" rel="noopener noreferrer"`.

---

## 16. Security Requirements

All of the following are mandatory, not optional:

- **No secrets in logs.** Never log `token`, `secretKey`, `Authorization` header, or decrypted credentials.
- **No secrets in frontend responses.** HTTP responses must not contain provider credentials.
- **No secrets in tests.** Use mock tokens (e.g. `cg-mock-token-for-test`) not real sandbox credentials.
- **No credentials committed to the repository.** `.env` files belong in `.gitignore`. Use `.env.example` with placeholder values only.
- **Company ownership validation.** Every request validates that `companyId` from JWT matches the credential owner.
- **Active credential validation.** Only `isActive: true` credentials can be resolved.
- **Callback token validation.** Every received callback must have its token verified before trust.
- **Replay protection.** `WebhookDelivery` unique index on `(providerCredentialId, providerEventId)`.
- **Environment isolation.** `mode: 'test'` credentials never call production URLs.
- **Safe payment URL handling.** Validate URL before opening. Use `noopener noreferrer` on external links.
- **Public callback URL.** Must be HTTPS in staging/production. `API_BASE_URL` must not be `localhost` outside development.
- **Secret rotation.** Rotating a credential creates a new `ProviderCredentials` record. Old records can be deactivated.
- **No hardcoded provider secrets, company IDs, or sandbox URLs** in source code.

---

## 17. Testing Strategy

### Backend (unit / integration)

Required spec coverage for every provider:

- Credential normalization (`{provider}.credentials.contract.spec.ts`).
- Environment resolution (test vs live base URL).
- `validateConnection` happy path and failure.
- `listPayments` — pagination, filters, status mapping.
- `getPayment` — detail mapping.
- `createPaymentTest` — correct order body, token derivation, callbackUrl.
- `getPaymentReferenceData` — each supported source returns correct options.
- `getPaymentsPageDefinition` — shape and field definitions.
- `getPaymentTestingPageDefinition` — referenceDataSource fields present.
- Callback receiver — valid token accepted, invalid token rejected, duplicate idempotency.
- Callback re-fetch — authoritative status updated in delivery record.
- Error mapping — each error class maps to correct HTTP status.
- No secret values in any response or test assertion.
- No unintended MongoDB writes.

### Frontend

- Provider selector loads company-scoped options.
- Connection selector loads and filters by provider.
- Page definition renders cards, filters, columns, and actions.
- Reference data dropdown populates on load.
- Loading, empty, unsupported, and error states all render correctly.
- Provider switch resets connection and re-fetches page definition.
- Form submission sends canonical DTO and shows result drawer.
- External checkout action opens correct URL with `noopener noreferrer`.

### Runtime sandbox verification

- Real sandbox credentials.
- Order creation succeeds and returns `paymentUrl`.
- Hosted checkout loads correctly.
- Payment scenario completes in sandbox.
- Provider order reaches `paid` / final status.
- Canonical status maps correctly (`succeeded`, etc.).
- Order appears in the Payments list with correct status.
- Callback (or simulated callback) is received, validated, and recorded.
- Webhook delivery shows `signatureStatus: valid` and `processingStatus: processed`.
- No production API calls.
- No secret values in test output.

---

## 18. Production-Readiness Requirements

Before any provider goes to production:

- **Public HTTPS callback URL.** Set `API_BASE_URL` to the actual domain. Never deploy with `localhost`.
- **Separate environment credentials.** Sandbox and production credentials stored in separate `ProviderCredentials` records.
- **Rate-limit handling.** All adapters must handle 429 responses gracefully (backoff, surface as 503).
- **Retry behaviour.** `retrySkip4xx` policy applied to all optional capability queries.
- **Observability.** Log `companyId`, `connectionId`, `providerKey`, and canonical status for every significant operation.
- **Safe logs.** Confirm no credential values appear in production log streams.
- **Provider account permissions.** Production API token has only required scopes.
- **Production credential verification.** Run `POST /payments/providers/:key/credentials/:id/test-connection` with production credentials before go-live.
- **Rollback plan.** Deactivate the `ProviderCredentials` record to disable the integration without code changes.

---

## 19. Anti-Patterns

Do not do any of the following:

| Anti-pattern | Why |
|---|---|
| Create a separate page per provider | Breaks the generic page architecture; couples frontend to provider names |
| Branch on `providerKey === 'coingate'` in generic components | Provider differences must come from page definitions and canonical data |
| Create a second `ProviderCredentials` schema | Duplicates the credential infrastructure; breaks security model |
| Store payment orders in a local MongoDB collection | Violates source-of-truth principle; creates sync problems |
| Use `payment_assets` as the `price_currency` source | Crypto assets are not valid order denomination currencies |
| Send empty or default filters to the provider | Increases latency; some providers error on empty string filters |
| Use Stripe cursor parameters with CoinGate | Different pagination models; will cause silent empty results |
| Hardcode `['EUR', 'USD', 'GBP']` in generic frontend | Reference data must come from the provider API |
| Trust callback status without re-fetch | Forged or replayed callbacks would cause incorrect state |
| Return raw provider objects from controllers | Provider types must be mapped to canonical contracts |
| Map every error to a single 'Something went wrong' | Loses actionable context; makes debugging impossible |
| Implement capabilities as stubs returning fake data | Callers assume the capability works; breaks integration |
| Assume provider field names or semantics are shared | Every provider has its own naming for similar concepts |

---

## 20. Definition of Done

A provider integration is complete when all of the following are checked:

- [ ] Provider registered in the catalogue and associated with the `payment` channel.
- [ ] `CompanyChannelProvider` can be created for a company.
- [ ] Credentials stored and encrypted via existing infrastructure.
- [ ] Runtime resolution (`ChannelsRuntimeResolverService`) returns decrypted credentials.
- [ ] `PaymentProviderRegistry` contains the adapter.
- [ ] Capabilities declared honestly in `PaymentProviderCapabilities`.
- [ ] Page definitions implemented for every `available` page capability.
- [ ] Reference data implemented for all `referenceDataSource` fields in testing/payment forms.
- [ ] Payment listing and detail implemented where provider supports it.
- [ ] Payment Testing implemented; form definition uses `referenceDataSource` not hardcoded options.
- [ ] Hosted or embedded checkout flow documented and verified in sandbox.
- [ ] Callback/webhook receiver implemented; token/signature validated; delivery recorded.
- [ ] All CoinGate statuses mapped to `PaymentCanonicalStatus` (or provider-specific equivalents).
- [ ] All error classes mapped to correct HTTP status codes.
- [ ] Unit tests pass for all components above.
- [ ] Frontend renders provider page definition without branching on `providerKey`.
- [ ] End-to-end sandbox verification completed (order → checkout → callback → status).
- [ ] Production-readiness checklist reviewed.
- [ ] Provider reference document created (follow CoinGate Reference Implementation format).
