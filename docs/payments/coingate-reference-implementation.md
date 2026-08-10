# CoinGate Reference Implementation

> First complete payment provider for the Communications App Payments module.
> Documents only what is implemented and verified from sandbox testing.

---

## 1. Scope

This document records the CoinGate provider implementation as the canonical reference for all future provider integrations. It covers:

- What was implemented and how.
- The verified sandbox test result.
- Incidents that occurred during development (price currency classification).
- Current capability and limitation status.
- Important source files.

This document is **not** a general integration guide. See [provider-integration-guide.md](provider-integration-guide.md) for the canonical standard and [provider-integration-checklist.md](provider-integration-checklist.md) for the PR checklist.

---

## 2. Environment

| Parameter | Value |
|---|---|
| Provider key | `coingate` |
| Sandbox base URL | `https://api-sandbox.coingate.com` |
| Production base URL | `https://api.coingate.com` |
| API version | v2 (path prefix: `/v2`) |
| Authentication | `Authorization: Token <api_token>` header |
| Credential mode | `mode: 'test'` → sandbox; `mode: 'live'` → production |
| Credential field | `token` (encrypted at rest via `CryptoService`) |

The `mode` field in `ProviderCredentials` is the authoritative environment selector. It is set by `CoingateCredentialsContract.normalize()`. The token prefix is **not** used for environment determination (unlike Stripe's `sk_test_` / `sk_live_`).

---

## 3. Authentication

Every API call sets:

```
Authorization: Token [REDACTED]
```

The token is decrypted per-request by `ChannelsRuntimeResolverService.resolveByProviderCredentialsId`. It is never stored outside the encrypted `ProviderCredentials.encrypted` field.

The `CoinGateClient` class (`coingate.client.ts`) accepts `{ token, mode }` and constructs `baseURL` from `mode`:

```
mode === 'test' → https://api-sandbox.coingate.com/v2
mode === 'live' → https://api.coingate.com/v2
```

Sandbox and production credentials are in separate `ProviderCredentials` records. They are never mixed.

---

## 4. Payments List and Detail

### Implemented

- `IPaymentListProvider.listPayments(ctx, params)` — uses `GET /orders` with page-number pagination.
- `IPaymentListProvider.getPayment(ctx, paymentId)` — uses `GET /orders/:orderId`.
- Both map to canonical `PaymentSummary` / `PaymentDetail` contracts.

### Pagination

CoinGate uses page numbers internally (`page`, `per_page`). The adapter encodes the current page as a base64 cursor string to satisfy the canonical `{ hasMore, nextCursor }` contract. The cursor is decoded on the next request and passed back to `GET /orders?page=N`.

### Filter support

| Canonical param | CoinGate param | Notes |
|---|---|---|
| `status` | `status` | Mapped from `PaymentCanonicalStatus` to CoinGate status string |
| `createdFrom` | `created_at[from]` | ISO date string |
| `createdTo` | `created_at[to]` | ISO date string |
| `limit` | `per_page` | Capped at 100 |
| `cursor` (page) | `page` | Decoded from cursor |
| `currency` | — | **Not forwarded.** CoinGate order list does not support currency filtering. |
| `search` | — | **Not forwarded.** CoinGate order list does not support search. |

Empty and default filter values are omitted from the request.

### Status mapping

See [Status mapping table](#62-status-mapping).

### `paymentUrl`

`PaymentSummary.paymentUrl` is populated from `CoinGateOrder.payment_url`. It links to the CoinGate-hosted order page (e.g. `https://pay-sandbox.coingate.com/invoice/...`). The frontend opens this with `target="_blank" rel="noopener noreferrer"`.

---

## 5. Payment Testing

### Flow

```
POST /payments/testing
{ connectionId, amountMinor, priceCurrency, description }
        ↓
PaymentsTestingService validates mode === 'test'
        ↓
createCoinGateOrder(token, { price_amount, price_currency, description, callback_url })
        ↓
CoinGate sandbox creates order and returns { id, payment_url, status: 'new' }
        ↓
PaymentTestResult:
{ testId: 'coingate-test-{orderId}', providerPaymentId, status: 'requires_action',
  requiresUserAction: true, paymentUrl, ... }
        ↓
Frontend result drawer shows "Open Payment Page" button
        ↓
Developer opens paymentUrl in browser
        ↓
CoinGate sandbox: select currency → sandbox completes payment automatically
        ↓
Order status transitions: new → confirming → paid
        ↓
CoinGate calls callback_url (see Section 7)
```

### Testing page definition fields

Defined in `coingate.testing-page-definition.ts`:

| Field key | Type | Source | Notes |
|---|---|---|---|
| `amount` | `amount` | Manual entry | Default: 10 |
| `price_currency` | `select` | `referenceDataSource: 'price_currencies'` | Fiat-only; loaded live from CoinGate `/currencies` |
| `description` | `text` | Manual entry | Optional |

The `scenario` field is **absent** from the CoinGate testing form. The CoinGate sandbox supports only a single success flow (open URL → sandbox completes). A scenario selector would not be informative.

`result.presentationType` is `'redirect'` — the developer must open `paymentUrl` in a browser. There is no embedded checkout flow for testing.

### callbackUrl injection

`PaymentsTestingService` reads `API_BASE_URL` from `ConfigService` and sets:

```
callback_url = {API_BASE_URL}/payments/callbacks/coingate/{credentialId}
```

This URL must be publicly reachable by CoinGate for real callbacks. During local development, `localhost` is usable only for simulated callbacks. See [Section 7](#7-callback-synchronization).

---

## 6. Price Currency Incident and Lesson

### What happened

During initial integration, the `price_currency` field in the testing form was wired to the `payment_assets` reference data source. CoinGate order creation failed because `payment_assets` includes crypto asset codes (e.g. `BTC`, `LTC`, `ETH`), and CoinGate's `price_currency` field requires a fiat ISO currency code (e.g. `EUR`, `USD`).

### Root cause analysis

1. The CoinGate API distinguishes three concepts:

   | Concept | CoinGate field | Valid values |
   |---|---|---|
   | Order price denomination | `price_currency` | Fiat currencies only |
   | Merchant settlement asset | `receive_currency` | Crypto assets |
   | Buyer checkout options | (displayed at checkout) | All assets |

2. The field descriptions are semantically distinct. Using `payment_assets` (all assets) for `price_currency` silently passes crypto codes, which the API rejects at order creation.

3. The initial test used `BTC` as the price currency, which caused a 422 from CoinGate. The error surfaced as a validation error rather than a clear "invalid price currency" message.

### Classification field discovery

During investigation, an additional issue emerged: the live CoinGate v2 sandbox API uses `kind: 'fiat'` / `kind: 'crypto'` to classify currencies. Older API versions and test mocks used `type: 'fiat'` / `type: 'crypto'`, and some older responses used `merchant_pay: false` for fiat.

The initial fiat classifier checked only `type`. The live API omitted `type`, causing all currencies to be classified as non-fiat. The `price_currencies` reference data source returned zero options, making the price currency selector empty.

### Fix applied

1. A dedicated `price_currencies` reference data source was created in `coingate.reference-data.ts`.
2. The `isFiatCurrency` function uses this classification precedence:
   - `kind === 'fiat'` (live v2 API — authoritative)
   - `type === 'fiat'` (legacy API and mocks — fallback)
   - `merchant_pay === false` (very old versions — last resort)
3. The testing page definition (`coingate.testing-page-definition.ts`) uses `referenceDataSource: 'price_currencies'` for the price currency field.
4. The `payment_assets` source was kept as a separate semantically distinct source for buyer checkout options — it is correct for that purpose.

### Lesson recorded

| Do | Do not |
|---|---|
| Use `price_currencies` for the order price denomination field | Use `payment_assets` as the price currency source |
| Use `receive_currencies` for the merchant settlement asset | Use `price_currencies` for the settlement asset |
| Use `kind` as the primary fiat classifier | Rely on `type` alone without a fallback |
| Verify reference data sources match the provider field semantics | Assume all provider currency lists are interchangeable |

---

## 6.2 Status Mapping

Defined in `coingate.mapper.ts` (`mapCoinGateOrderStatus`):

| CoinGate status | `PaymentCanonicalStatus` enum | Value |
|---|---|---|
| `new` | `RequiresAction` | `'requires_action'` |
| `pending` | `RequiresAction` | `'requires_action'` |
| `confirming` | `Processing` | `'processing'` |
| `paid` | `Succeeded` | `'succeeded'` |
| `invalid` | `Failed` | `'failed'` |
| `expired` | `Expired` | `'expired'` |
| `canceled` | `Cancelled` | `'cancelled'` |
| `refunded` | `Refunded` | `'refunded'` |
| `partially_refunded` | `PartiallyRefunded` | `'partially_refunded'` |
| *(unknown)* | `Pending` | `'pending'` |

All statuses verified against the [CoinGate API documentation](https://developer.coingate.com/) and the sandbox test flow.

---

## 7. Callback Synchronization

### Architecture

CoinGate uses per-order callback URLs (not a registered global webhook endpoint). The `callback_url` is set at order creation time:

```
{API_BASE_URL}/payments/callbacks/coingate/{providerCredentialsId}
```

The controller is `PaymentsCoinGateCallbackController` in `payments-coingate-callback.controller.ts`.

### Token validation

CoinGate includes a `token` field in each callback payload. This token is deterministically derived from the credential ID and the order's external reference:

```
token = SHA-256(credentialId + ':' + externalReference + ':coingate-callback-v1')[0:32]
```

The `verifyCallbackToken` function in `coingate.orders.ts` recomputes this value and compares it to the received token. No external API call or secret store is needed for validation.

### Delivery flow

```
POST /payments/callbacks/coingate/:credentialId
        ↓
1. Credential and company lookup (MongoDB)
2. Token validation:
     valid   → signatureStatus: 'valid'
     invalid → signatureStatus: 'invalid' (log warning; continue recording)
     missing → signatureStatus: 'missing' (log warning; continue recording)
3. Idempotency check:
     providerEventId = 'coingate:{orderId}:{status}'
     duplicate (MongoDB code 11000) → mark duplicate:true, return 200
4. WebhookDelivery.create:
     processingStatus: 'verified' (valid) or 'received' (invalid/missing)
5. HTTP 200 { received: true }  ← returned immediately
        ↓ (async, non-blocking)
6. ChannelsRuntimeResolverService.resolveByProviderCredentialsId
7. GET /orders/:orderId from CoinGate → authoritative status
8. WebhookDelivery.updateOne → processingStatus: 'processed', safePayload updated
```

### What the delivery record contains

`WebhookDelivery.safePayload` after processing:

```json
{
  "orderId": "[REDACTED — CoinGate integer order ID]",
  "externalReference": "[REDACTED — merchant order reference]",
  "callbackStatus": "paid",
  "priceCurrency": "EUR",
  "authoritativeStatus": "paid",
  "canonicalStatus": "succeeded",
  "priceAmount": "[amount string]",
  "receiveAmount": "[crypto amount string]",
  "receiveCurrency": "LTC"
}
```

No token, credential, or Authorization header value is stored in the delivery record.

### Local vs. real callbacks

| Scenario | Mechanism |
|---|---|
| Local development | Simulated: `POST /payments/callbacks/coingate/:credentialId` called manually with a constructed payload |
| Staging/production | Real: CoinGate calls the public HTTPS `callback_url` set at order creation |

**CoinGate cannot call `http://localhost:3001/...`** — this address is not reachable from CoinGate's servers. During the verified sandbox test, the callback was simulated locally. Delivery validation confirmed correct token computation and `processingStatus: 'processed'` after re-fetch.

To receive real callbacks, `API_BASE_URL` must be set to a publicly reachable HTTPS endpoint.

---

## 8. Verified Runtime Result

The following was verified during sandbox testing:

| Step | Result |
|---|---|
| Sandbox credentials saved | `isActive: true`, `mode: 'test'` |
| `test-connection` | `valid: true` |
| `GET /payments/connections/:id/testing/page-definition` | Correct form with 3 fields including `price_currencies` dropdown |
| Reference data `price_currencies` loaded | Fiat currencies listed (EUR, USD, GBP, PLN, etc.) — no crypto |
| `POST /payments/testing` (EUR 10.00) | Order created; `paymentUrl` returned; `status: requires_action` |
| Hosted checkout | Loaded in browser at `https://pay-sandbox.coingate.com/invoice/...` |
| Currency selected | Litecoin (LTC) |
| Sandbox payment completed | Order transitioned to `paid` |
| `GET /payments/accounts/:id/payments` | Order appeared with `status: succeeded`, `providerStatus: paid` |
| CoinGate sandbox dashboard | Reflected the paid order |
| Callback simulation | Token validated; `WebhookDelivery` created; re-fetch confirmed `canonicalStatus: succeeded` |

**No production payment occurred.** The entire test ran against the CoinGate sandbox environment using `mode: 'test'` credentials.

No secret values appeared in terminal output, application logs, or this document.

---

## 9. Current Limitations

| Limitation | Details |
|---|---|
| No real external callback verification | CoinGate cannot call `localhost`. Local callback testing uses simulated POST calls. Staging/production requires a public HTTPS `API_BASE_URL`. |
| No balance endpoint | `PaymentCapability.Balance` is `Unsupported`. CoinGate's merchant API does not expose a real-time account balance. |
| No account detail | `PaymentCapability.Account` is `Planned`. CoinGate does not have a dedicated merchant account endpoint. |
| No webhook endpoint management | CoinGate configures callbacks per-order. `WebhookEndpointListing`, `WebhookEndpointCreation`, and related capabilities are `Unsupported`. |
| No recurring payments | `PaymentCapability.RecurringPayments` is `Unsupported`. |
| No disputes | `PaymentCapability.Disputes` is `Unsupported`. |
| No payment methods | `PaymentCapability.PaymentMethods` is `Unsupported`. Accepted currencies are via `PaymentUnits` (GET /currencies). |
| Payouts planned | `PaymentCapability.Payouts` is `Planned`. CoinGate Send Requests require account-level feature activation. |
| Embedded checkout not implemented | `PaymentCapability.Checkout` is `Planned`. White-label CoinGate Checkout requires account activation and is not currently built. |
| No failure scenarios in sandbox | The sandbox always completes payment. Decline and failure scenarios cannot be tested. |
| Currency filter not supported | CoinGate order list does not accept a `currency` query parameter. |
| Text search not supported | CoinGate order list does not support a search query. |

---

## 10. Important Files

| File | Purpose |
|---|---|
| `src/payments/providers/coingate/coingate.provider.ts` | Adapter root — implements `IPaymentProvider`, wires all sub-modules |
| `src/payments/providers/coingate/coingate.capabilities.ts` | Capability declarations for all `PaymentCapability` values |
| `src/payments/providers/coingate/coingate.client.ts` | HTTP client — builds `Authorization` header, selects base URL from `mode` |
| `src/payments/providers/coingate/coingate.types.ts` | CoinGate-native types (`CoinGateOrder`, `CoinGateCurrency`, etc.) |
| `src/payments/providers/coingate/coingate.mapper.ts` | Status mapping, amount conversion helpers |
| `src/payments/providers/coingate/coingate.orders.ts` | Order list, order detail, order creation, token verification |
| `src/payments/providers/coingate/coingate.currencies.ts` | Payment unit discovery (`GET /currencies` → `PaymentUnit[]`) |
| `src/payments/providers/coingate/coingate.reference-data.ts` | Reference data dispatcher: `price_currencies`, `receive_currencies`, `payment_assets` |
| `src/payments/providers/coingate/coingate.page-definition.ts` | Payments list page definition |
| `src/payments/providers/coingate/coingate.testing-page-definition.ts` | Payment Testing form definition |
| `src/payments/providers/coingate/coingate.refunds.ts` | Refund listing, detail, creation |
| `src/payments/providers/coingate/coingate.refunds-page-definition.ts` | Refunds page definition |
| `src/payments/providers/coingate/coingate.callbacks.ts` | Callback payload type |
| `src/payments/providers/coingate/coingate.errors.ts` | Provider-specific error mapper |
| `src/payments/providers/coingate/coingate.gateway-guide.ts` | Gateway integration guide content |
| `src/payments/controllers/payments-coingate-callback.controller.ts` | Callback receiver (`POST /payments/callbacks/coingate/:credentialId`) |
| `src/payments/providers/coingate/coingate.provider.spec.ts` | Adapter unit tests |
| `src/payments/tests/coingate-reference-data.spec.ts` | Reference data classification tests |
| `src/payments/tests/payments-testing.service.spec.ts` | Payment Testing service tests |
