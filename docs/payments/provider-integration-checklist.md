# Payments Provider Integration Checklist

> Copy this checklist into your pull request. Check every item before requesting review.
> Reference: [Provider Integration Guide](provider-integration-guide.md)

---

## Phase 1 — Discovery

- [ ] Provider API documentation reviewed and linked below.
- [ ] API version confirmed and recorded.
- [ ] Sandbox account created; sandbox base URL confirmed.
- [ ] Production base URL confirmed.
- [ ] Authentication scheme identified (API key, Bearer token, OAuth 2.0, HMAC, etc.).
- [ ] Pagination model documented (cursor, page/offset, keyset, or none).
- [ ] Supported list filters documented (status, currency, date range, etc.).
- [ ] Supported status values listed.
- [ ] Callback/webhook mechanism documented (per-order URL, registered endpoint, or none).
- [ ] Known unsupported capabilities listed (e.g. balance, recurring, disputes).
- [ ] Provider SDK availability noted (native HTTP calls preferred for transparency).

---

## Phase 2 — Provider Source of Truth

Fill in the table and attach it to the PR description.

| Field | Value |
|---|---|
| Official documentation URL | |
| API version | |
| Sandbox base URL | |
| Production base URL | |
| Authentication scheme | |
| Pagination model | |
| Supported filters | |
| Supported statuses | |
| Callback mechanism | |
| Known unsupported capabilities | |

- [ ] Table populated with verified values from official provider documentation.
- [ ] No capabilities listed as supported unless confirmed by API documentation or sandbox test.

---

## Phase 3 — Catalogue and Company Configuration

- [ ] Provider seed entry added with `providerKey`, `channelKey: 'payment'`, `displayName`, `connectionType`.
- [ ] `providerKey` is lowercase, URL-safe, and unique across all providers.
- [ ] No new Channel created — the existing `payment` channel is reused.
- [ ] Seed runs idempotently (no duplicate entries on restart).
- [ ] A `CompanyChannelProvider` can be created via the UI without code changes.
- [ ] Provider appears in `GET /payments/providers` (or equivalent listing endpoint).

---

## Phase 4 — Credentials

- [ ] Credential contract created: `src/payments/providers/{provider}/{provider}.credentials.contract.ts`.
- [ ] `normalize` method handles all accepted field names and sets `mode: 'test' | 'live'`.
- [ ] `validate` method returns an error when required fields are missing.
- [ ] Secret fields (tokens, keys) are encrypted by the existing `CryptoService` — no custom encryption.
- [ ] Blank secret fields on update preserve existing encrypted values.
- [ ] `mode` is set from an explicit field in the credential, not inferred from token prefix or tag (Stripe exception: `sk_test_` / `sk_live_` is authoritative).
- [ ] Credential contract unit tests cover normalization, validation, and mode resolution.
- [ ] No credential values in test assertions — mock tokens only (e.g. `mock-key-for-test`).

---

## Phase 5 — Provider Adapter

- [ ] Adapter class created: `src/payments/providers/{provider}/{provider}.provider.ts`.
- [ ] Implements `IPaymentProvider` at minimum (`providerKey`, `displayName`, `description`, `getCapabilities`, `getMetadata`).
- [ ] Implements only the capability interfaces for capabilities genuinely supported by the provider.
- [ ] Registered in `PaymentsModule` (`providers` array and `useFactory` for `PaymentProviderRegistry`).
- [ ] Provider-native types isolated in `{provider}.types.ts` — not imported by generic services.
- [ ] No provider-native types appear in canonical contract return values.
- [ ] `PaymentProviderRegistry.resolve(providerKey)` resolves to this adapter.

---

## Phase 6 — Capabilities

- [ ] Capabilities declared in `{provider}.capabilities.ts` returning `PaymentProviderCapabilities`.
- [ ] Every `PaymentCapability` enum member assigned a `CapabilityStatus` value.
- [ ] `CapabilityStatus.Available` used only for features that are fully implemented and tested.
- [ ] `CapabilityStatus.Planned` used for features that will be implemented later.
- [ ] `CapabilityStatus.Unsupported` used for features the provider does not support at all.
- [ ] No stub implementations returning fake data for `Planned` or `Unsupported` capabilities.
- [ ] Capabilities verified against the source-of-truth table from Phase 2.
- [ ] `GET /payments/providers/:providerKey/capabilities` returns the declared map.
- [ ] Capabilities spec file verifies each capability value.

---

## Phase 7 — Page Definitions

- [ ] Payments page definition implemented (if `PaymentCapability.Payments` is `Available`):
  - [ ] File: `{provider}.page-definition.ts` returns `PaymentsPageDefinition`.
  - [ ] `summaryCards` accurate — balance card omitted when `PaymentCapability.Balance` is not `Available`.
  - [ ] `filters` match what the provider list endpoint actually accepts.
  - [ ] `columns` use only fields present in `PaymentSummary`.
  - [ ] `rowActions` use only `ActionType` values: `view`, `open_url`, `refund`, `cancel`, `capture`.
  - [ ] `list.paginationType` matches the provider's actual pagination model.
  - [ ] `emptyState` title and description are provider-appropriate.
  - [ ] Page definition does not contain credentials, tokens, or executable code.

- [ ] Refunds page definition implemented (if `PaymentCapability.RefundListing` is `Available`):
  - [ ] File: `{provider}.refunds-page-definition.ts` returns `RefundsPageDefinition`.
  - [ ] `createForm` included when `PaymentCapability.RefundCreation` is `Available`.

- [ ] Testing page definition implemented (if `PaymentCapability.PaymentTesting` is `Available`):
  - [ ] File: `{provider}.testing-page-definition.ts` returns `PaymentTestingPageDefinition`.
  - [ ] Fields that need dynamic options use `referenceDataSource`, not `optionsSource: 'payment_units'` alone.
  - [ ] `result.presentationType` is `'redirect'` for hosted checkout, `'embedded'` for in-page, `'none'` when no URL is returned.

- [ ] Page definition `version` incremented on any structural change.
- [ ] `GET /payments/connections/:connectionId/page-definition` returns the correct shape.
- [ ] Page definition spec verifies field count, column keys, and `paginationType`.

---

## Phase 8 — Reference Data

- [ ] Reference data implemented (if any testing or payment form field uses `referenceDataSource`):
  - [ ] Adapter implements `IPaymentReferenceDataProvider`.
  - [ ] `getPaymentReferenceData(ctx, source)` dispatches to the correct provider endpoint per source.
  - [ ] `price_currencies` returns **fiat-only** options valid for order price denomination.
  - [ ] `receive_currencies` returns assets the merchant settles into.
  - [ ] `payment_assets` returns all buyer-selectable assets.
  - [ ] Sources not supported by the provider return empty `options` array (not an error).
  - [ ] No crypto assets included in `price_currencies` results.
  - [ ] No fiat currencies included in `receive_currencies` results.
  - [ ] Classification uses the provider's authoritative field (`kind`, `type`, or equivalent) — not a hardcoded allowlist.
  - [ ] Reference data spec verifies fiat/crypto classification for each source.
- [ ] `GET /payments/connections/:connectionId/reference-data/:source` returns `PaymentReferenceDataResponse`.
- [ ] Response includes `meta.authoritative` and `meta.providerBacked` fields.

---

## Phase 9 — Payments List and Detail

- [ ] Adapter implements `IPaymentListProvider` (if `PaymentCapability.Payments` is `Available`).
- [ ] `listPayments(ctx, params)` maps response to `PaymentListResult` with `data: PaymentSummary[]`.
- [ ] `getPayment(ctx, paymentId)` maps response to `PaymentDetail`.
- [ ] Status mapper converts every provider-native status to `PaymentCanonicalStatus`.
- [ ] `providerStatus` preserves the raw provider status string.
- [ ] `amountMinor` is integer minor units (not decimal).
- [ ] `currency` is lowercase ISO code.
- [ ] Cursor pagination encodes to a stable base64 string matching the canonical contract.
- [ ] Empty filter params are not forwarded to the provider.
- [ ] Provider-unsupported filters are omitted from the request.
- [ ] `paymentUrl` populated when the provider returns a hosted payment URL.
- [ ] Status mapping spec covers every documented provider status value.
- [ ] List service spec verifies pagination model and filter omission.

---

## Phase 10 — Payment Testing

- [ ] Adapter implements `IPaymentTestingProvider` (if `PaymentCapability.PaymentTesting` is `Available`).
- [ ] `getSupportedTestScenarios(ctx)` returns the correct scenario list.
- [ ] `createPaymentTest(ctx, params)` creates a real order on the sandbox.
- [ ] Order is created with `mode: 'test'` credentials — live credentials are rejected with `PaymentConfigurationInvalidError`.
- [ ] `callbackUrl` is injected from `API_BASE_URL` (not `localhost`) for per-order-callback providers.
- [ ] `testId` format is `{provider}-test-{providerOrderId}` — safe for display.
- [ ] Result includes `paymentUrl` when the provider returns one.
- [ ] Testing service spec verifies sandbox isolation and `callbackUrl` injection.
- [ ] No production API call is made from the testing endpoint.

---

## Phase 11 — Checkout

- [ ] Hosted redirect checkout (if applicable):
  - [ ] `paymentUrl` from the provider order is returned in `PaymentTestResult.paymentUrl`.
  - [ ] Testing page definition uses `result.presentationType: 'redirect'`.
  - [ ] Frontend opens the URL with `target="_blank" rel="noopener noreferrer"`.
  - [ ] URL is validated before use (starts with `https://`).

- [ ] Embedded/white-label checkout (if applicable):
  - [ ] Capability declared `PaymentCapability.Checkout: CapabilityStatus.Available`.
  - [ ] Provider checkout session mapped to a canonical presentation model.
  - [ ] If not implemented: capability is `Planned` or `Unsupported` — not stubbed.

---

## Phase 12 — Callbacks and Deliveries

- [ ] Callback receiver implemented (for per-order-callback providers):
  - [ ] Controller extends `@Public()` — no JWT required.
  - [ ] Callback token validated before processing.
  - [ ] Invalid or missing token logged as warning; delivery still recorded with `signatureStatus: 'invalid'` or `'missing'`.
  - [ ] HTTP 200 returned immediately after delivery record is created — not blocked by re-fetch.
  - [ ] Async re-fetch confirms authoritative order state from the provider API.
  - [ ] Delivery record updated with `processingStatus: 'processed'` and authoritative status after re-fetch.
  - [ ] Idempotency key is stable per order+status-transition.
  - [ ] MongoDB `code 11000` handled — duplicate delivery marked `duplicate: true`.
  - [ ] `WebhookDelivery` record retains `safePayload` with order ID, status, and price information — never a token or credential.

- [ ] Webhook endpoint management (for registered-endpoint providers like Stripe):
  - [ ] Generic `PaymentsWebhookReceiverController` (`POST /payments/webhooks/:providerKey/:credentialId`) used.
  - [ ] Signing secret stored in `WebhookEndpointSecret` schema.
  - [ ] Signature verified using the provider's canonical verification method.

- [ ] `WebhookDelivery` retention set to a documented expiry (`expiresAt`).
- [ ] `GET /payments/accounts/:accountId/webhook-deliveries` returns correct delivery records.
- [ ] Callback spec verifies: valid token accepted, invalid token recorded, duplicate idempotency.

---

## Phase 13 — Error Mapping

- [ ] Provider-specific error mapper created (e.g. `{provider}.errors.ts`).
- [ ] Every provider HTTP status maps to a canonical domain error:
  - `401/403` → `PaymentCredentialsInvalidError`
  - `404` → `PaymentProviderNotFoundError` (or safe 404)
  - `422` → provider-specific validation error (surfaced as 422)
  - `429` → rate-limit error (surfaced as 429 or 503)
  - `5xx` / timeout / network failure → `PaymentProviderUnavailableError`
- [ ] `PaymentProviderUnavailableError` (503) configured for one retry via `retrySkip4xx`.
- [ ] `PaymentCapabilityNotSupportedError` (422) never retried.
- [ ] No raw provider error messages, stack traces, or internal paths in HTTP responses.
- [ ] Error mapping spec covers each provider status code.

---

## Phase 14 — Security

- [ ] No provider tokens, API keys, or secrets in source code.
- [ ] No secrets in test fixtures — mock/placeholder values only.
- [ ] No secrets in HTTP responses (verified by inspecting response shapes).
- [ ] No secrets in application logs — log only `companyId`, `connectionId`, `providerKey`, `mode`, canonical status.
- [ ] `ChannelsRuntimeResolverService` used for all credential decryption — `CryptoService` not called directly in payment controllers or adapters.
- [ ] Company ownership validated: credential's `companyId` must match JWT `companyId`.
- [ ] Only `isActive: true` credentials are resolvable.
- [ ] Callback token validated for per-order-callback providers.
- [ ] Replay protection: `WebhookDelivery` unique index on `(providerCredentialId, providerEventId)`.
- [ ] `mode: 'test'` credentials never call production URLs.
- [ ] `mode: 'live'` credentials never call sandbox URLs.
- [ ] `paymentUrl` opened with `noopener noreferrer` in the frontend.
- [ ] `.env` not committed to the repository — `.env.example` with placeholders used instead.
- [ ] `API_BASE_URL` is not `localhost` in the staging or production environment.

---

## Phase 15 — Backend Tests

Required spec files (one per logical unit):

- [ ] `{provider}.credentials.contract.spec.ts` — normalization, validation, mode resolution.
- [ ] `{provider}.capabilities.spec.ts` — all capabilities declared, no unexpected `Available`.
- [ ] `{provider}.provider.spec.ts` — adapter wiring, `getCapabilities`, `getMetadata`.
- [ ] `{provider}.payments.spec.ts` (or equivalent) — list pagination, filter omission, status mapping.
- [ ] `{provider}.testing.spec.ts` — sandbox order creation, callbackUrl injection.
- [ ] `{provider}.reference-data.spec.ts` — fiat/crypto classification, each source.
- [ ] `{provider}.page-definition.spec.ts` or inline — shape, field keys, paginationType.
- [ ] `{provider}.callbacks.spec.ts` — valid/invalid/missing token, duplicate idempotency.
- [ ] `{provider}.errors.spec.ts` or inline — each provider error code → domain error.

All tests pass:

- [ ] `npm test` passes in `communications-app/backend/`.
- [ ] No test assertion contains a real API token, password, or secret.
- [ ] No test makes a live network request to the provider (mocked client).

---

## Phase 16 — Frontend Tests

- [ ] Provider selector loads company-scoped options without branching on `providerKey`.
- [ ] Connection selector resets when provider changes.
- [ ] Page definition renders cards, filters, columns, and row actions from definition data.
- [ ] Reference data dropdown populates correctly from `GET /payments/connections/:id/reference-data/:source`.
- [ ] Loading, empty, unsupported, and error states all render correctly.
- [ ] Form submission sends canonical `CreatePaymentTestInput` DTO.
- [ ] Result drawer shows correct status and opens `paymentUrl` correctly.
- [ ] `npm run type-check` passes in `communications-app/frontend/`.

---

## Phase 17 — Runtime Sandbox Verification

Run this sequence manually before merging:

- [ ] Real sandbox credentials saved in the UI (not committed to the repository).
- [ ] `POST /payments/providers/:providerKey/credentials/:id/test-connection` returns `valid: true`.
- [ ] `GET /payments/connections/:connectionId/page-definition` returns the correct definition.
- [ ] `GET /payments/connections/:connectionId/testing/page-definition` returns the testing form.
- [ ] Reference data fields in the testing form populate without error.
- [ ] `POST /payments/testing` creates a sandbox order and returns `paymentUrl`.
- [ ] Hosted checkout URL loads in a browser.
- [ ] Payment flow completes in the sandbox environment.
- [ ] Provider order reaches the expected final status (e.g. `paid`).
- [ ] Canonical status maps correctly (e.g. `succeeded`).
- [ ] Order appears in `GET /payments/accounts/:accountId/payments` with correct status.
- [ ] Callback (or simulated callback) received, validated, and recorded as a `WebhookDelivery`.
- [ ] Delivery shows `signatureStatus: valid` and `processingStatus: processed`.
- [ ] No production API call occurred.
- [ ] No secret value appeared in any terminal output or log.

---

## Phase 18 — Production Readiness

- [ ] `API_BASE_URL` is set to a publicly reachable HTTPS domain — not `localhost`.
- [ ] Sandbox and production credentials in separate `ProviderCredentials` records.
- [ ] Production API token has only the required scopes — least privilege.
- [ ] Rate-limit handling: 429 responses cause `retrySkip4xx` to surface a 503 — not an unhandled crash.
- [ ] Retry behaviour verified: `retrySkip4xx` applied to all optional capability queries.
- [ ] Application logs checked in staging — no credential values present.
- [ ] Production `ProviderCredentials` record can be deactivated to disable the integration without code changes (rollback plan).
- [ ] Monitoring alert exists for repeated 503 errors from this provider.

---

## Phase 19 — Documentation

- [ ] Provider reference document created: `docs/payments/{provider}-reference-implementation.md`.
  - [ ] Follows the [CoinGate Reference Implementation](coingate-reference-implementation.md) format.
  - [ ] Documents only verified, implemented features.
  - [ ] Includes verified sandbox result.
  - [ ] Documents current limitations honestly.
  - [ ] No secrets in the document (redacted examples only).
- [ ] This checklist attached to the PR and completed.
- [ ] [Provider Integration Guide](provider-integration-guide.md) consulted throughout — no deviations without documented justification.

---

## Phase 20 — Final Sign-Off

- [ ] All 19 phases above checked.
- [ ] `npm test` green in `communications-app/backend/`.
- [ ] `npm run type-check` green in `communications-app/frontend/`.
- [ ] `git diff --check` passes (no trailing whitespace).
- [ ] PR description includes the completed Source-of-Truth table (Phase 2).
- [ ] PR description includes a brief summary of sandbox verification result.
- [ ] No capability marked `Available` without a passing spec and sandbox verification.
- [ ] No anti-patterns from [Section 19 of the Integration Guide](provider-integration-guide.md#19-anti-patterns) present.
- [ ] Reviewer sign-off obtained.

---

*Checklist version: 1.0 — aligned with CoinGate reference implementation.*
