# Sprint 003 — Implementation Plan
## Communication Engine: From Infrastructure to Product

> Source of truth: DEC-017 (Provisioning & Composition Model), DEC-018 (Asset Ownership & Bounded Contexts)
> Status: Planning — no code written yet
> Date: 2026-06-26
> Prerequisite: Sprint 002 fully complete and verified

---

## 1. Context and Purpose

Sprint 002 built the communication engine's infrastructure layer:

- Idempotent provisioning (Theme → Layout → Domain → Events)
- Notification rendering pipeline with a shared `NotificationRenderService`
- Execution log (fire-and-forget, per-channel, per-attempt)
- Canonical event key resolution (`security.user_invitation`)
- Preview by canonical key (rendering only, no delivery)
- `{{content}}` validation on layout templates

The engine is **architecturally complete**. Every bounded context from DEC-018 exists. Every provisioning step from DEC-017 §3 runs. Every execution log field from DEC-018 §10.3 is captured.

What the engine **cannot yet do** is be used by a real company.

Sprint 003 is the bridge between architecture and product. It addresses three categories of missing capability:

1. **Access control** — Company users cannot authenticate to the communication API with their JWT. Every call requires the shared internal API key.
2. **Missing backend operations** — The domain-credential binding workflow exists as a service method but has no ergonomic API surface. Platform-company events are not provisioned. Execution logs cannot be filtered.
3. **Missing product surface** — No readiness check, no health report, no test workflow, no dashboard metrics.

Sprint 003 does not change the architecture. It completes it.

---

## 2. Architecture Invariants (Non-Negotiable)

These constraints are sourced directly from DEC-017 and DEC-018 and must be upheld by every line of Sprint 003 code.

**From DEC-017:**

- V-04: Every layout template must contain `{{content}}`. Enforced on create and update. ✅ Already implemented.
- V-05: Event `channelContent.email.content` must not contain `<header>`, `<footer>`, or corporate wrapper markup. **Not yet enforced.** Sprint 003 Phase D adds this.
- V-06: Every default event must belong to a provisioned default domain. ✅ Already guaranteed by provisioning.
- V-09: Provisioning is idempotent — running it twice must not create duplicate assets. ✅ Already implemented.
- V-10: Default domain keys and event keys are stable identifiers — never renamed. ✅ Already guaranteed.
- P-03: Branding is owned exclusively by Themes and Layout Templates. Events must never contain brand colors, logos, or corporate structure.
- P-04: Business messaging is owned exclusively by Events. Layout templates must never contain event-specific subject lines, message copy, or `data.*` references.
- P-05: Rendering is independent from delivery. Rendering must succeed before delivery begins.
- P-06: Provider configuration is the **only** manual step required before production delivery.

**From DEC-018:**

- Provisioning creates assets. Notification Engine uses assets. These bounded contexts never cross.
- Provisioning must never send notifications or write execution logs.
- Notification Engine must never create or repair default assets.
- `canonicalEventKey` must be recorded in every execution log.
- Provider credentials are **never** auto-provisioned.

---

## 3. Current State After Sprint 002

### What works end-to-end

```
POST /companies/with-owner        → company created + provisioning runs automatically
POST /companies/:id/provision     → repair / re-run (idempotent, platform_admin only)
POST /notifications/event         → render + deliver + log (x-api-key auth)
POST /notifications/preview/event-by-key  → render only, no delivery (x-api-key auth)
GET  /notifications/logs          → list execution logs by companyId (x-api-key auth)
```

### What is blocked

```
Company users (company_owner, company_admin) → CANNOT call any communication API without platform API key
Domain channels → channelsToUse: [] after provisioning → notifications cannot be dispatched
Platform company → platform-scoped events NOT provisioned → PlatformMailService still uses hardcoded templates
Execution logs → NOT filterable → only companyId filter exists
Preview → SMS and PDF preview by canonical key → NOT implemented
Dashboard → no aggregated metrics anywhere
```

### Critical gap: Domain → Credentials binding

After Sprint 002 provisioning, the security domain exists but has `channelsToUse: []`. This means even if a company has configured a provider and added credentials, no notification can be dispatched because the domain has no channel bound.

The full chain from "company created" to "notification delivered" requires:

```
1. CompanyProvisioningService.provisionCompany()   ← Sprint 002 ✅
2. User enables a provider (CompanyChannelProvider) ← API exists, no auth ❌
3. User adds credentials (ProviderCredentials)     ← API exists, no auth ❌
4. User binds credentials to domain channels        ← API exists (PATCH /domain-catalogue/:id/credentials/:channel), no auth ❌
5. POST /notifications/event                        ← Sprint 002 ✅
```

Steps 2, 3, 4 all have backend APIs. None have JWT authentication. Sprint 003 completes this chain.

---

## 4. Phases

Each phase compiles, ships independently, and is testable without the next phase. Phases are ordered by dependency and by business impact.

---

### Phase A — Communication API Authentication

**Goal:** Company users must be able to call communication endpoints using their existing JWT token, scoped to their own company. Platform API key callers are completely unaffected.

**Why first:** Every other phase that touches the Business App workflow depends on authenticated company users reaching these APIs. This is a prerequisite for the entire remaining sprint.

---

#### A.1 Design

The current `x-api-key` guard is a simple equality check against `COMMUNICATION_API_KEY`. It must remain as-is for:

- Internal service-to-service calls (NestJS backend → communication engine)
- Platform Admin CLI / script operations
- `POST /notifications/event` (intentionally not company-user-callable — notification triggers come from service-level code, not from company users)

The new JWT path adds role-based and company-scoped authorization as a second lane.

```
Incoming request
    │
    ├── x-api-key header present and valid?
    │         YES → pass (existing behavior, unchanged)
    │         NO  ↓
    ├── Authorization: Bearer <jwt> present?
    │         NO  → 401
    │         YES → validate JWT
    │               ├── actorType = 'user'?
    │               │     NO  → 401
    │               │     YES → check role + companyId scope
    │               │           ├── platform_admin → pass (all companies)
    │               │           ├── company_owner  → enforce companyId match
    │               │           ├── company_admin  → enforce companyId match
    │               │           ├── operator       → enforce companyId match (read-only actions only)
    │               │           └── viewer         → 403 (no communication access)
    │               └── token invalid/expired → 401
```

**Company-scope enforcement rule:** When a JWT with a non-`platform_admin` role is present, every request that includes a `companyId` query param, body field, or route param is validated against `ctx.companyId` from the JWT claims. If they do not match, the response is `403 Forbidden`. Platform admins can access any company.

**Notification dispatch exception:** `POST /notifications/event` remains **API key only**. Notification triggers are business-logic events fired from application services (password reset, order confirmation), not from company users clicking a button. Company users use `POST /notifications/test` (Phase H) to verify delivery.

---

#### A.2 Implementation

**New files:**

```
communication/common/guards/scoped-auth.guard.ts
communication/common/decorators/company-scope.decorator.ts
```

**`ScopedAuthGuard`:**

```typescript
// Replaces the assertApiKey() private method on each controller.
// Can be applied at the controller or method level.
// Accepts x-api-key (unchanged) OR valid JWT with role/companyId enforcement.
```

**Modified controllers (add `@UseGuards(ScopedAuthGuard)`):**

| Controller | Previously | After Phase A |
|---|---|---|
| `CompanyThemeController` | `assertApiKey()` in every method | `@UseGuards(ScopedAuthGuard)` on class |
| `LayoutTemplatesController` | `assertApiKey()` in every method | `@UseGuards(ScopedAuthGuard)` on class |
| `DomainCatalogueController` | `assertApiKey()` in every method | `@UseGuards(ScopedAuthGuard)` on class |
| `EventCatalogueController` | `assertApiKey()` in every method | `@UseGuards(ScopedAuthGuard)` on class |
| `CompanyChannelProvidersController` | `assertApiKey()` in every method | `@UseGuards(ScopedAuthGuard)` on class |
| `ProviderCredentialsController` | `assertApiKey()` in every method | `@UseGuards(ScopedAuthGuard)` on class |
| `NotificationController` | `assertApiKey()` in every method | Guard on logs + preview; keep assertApiKey on `POST /event` |

The `assertApiKey()` private methods are removed from each controller class as the guard takes over. The `POST /notifications/event` endpoint retains its own API key check separately.

---

#### A.3 Role Permission Matrix

| Endpoint | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| `GET /company-themes?companyId` | ✅ any | ✅ own | ✅ own | ✅ own, read | ✅ own, read |
| `POST /company-themes` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `PATCH,DELETE /company-themes/:id` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `GET /layout-templates/by-company?companyId` | ✅ any | ✅ own | ✅ own | ✅ own, read | ✅ own, read |
| `POST /layout-templates` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `PATCH,DELETE /layout-templates/:id` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `GET /domain-catalogue?companyId` | ✅ any | ✅ own | ✅ own | ✅ own, read | ✅ own, read |
| `POST /domain-catalogue` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `PATCH /domain-catalogue/:id/credentials/:ch` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `GET /event-catalogue?domainCatalogueId` | ✅ any | ✅ own | ✅ own | ✅ own, read | ✅ own, read |
| `POST /event-catalogue` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `PATCH /event-catalogue/:id` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `DELETE /event-catalogue/:id` | ✅ | ✅ own | ❌ | ❌ | ❌ |
| `GET /company-channel-providers?companyId` | ✅ any | ✅ own | ✅ own | ✅ own, read | ✅ own, read |
| `POST /company-channel-providers` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `GET /provider-credentials?ccpId` | ✅ any | ✅ own | ✅ own | ❌ | ❌ |
| `POST /provider-credentials` | ✅ | ✅ own | ✅ own | ❌ | ❌ |
| `GET /notifications/logs?companyId` | ✅ any | ✅ own | ✅ own | ✅ own, read | ❌ |
| `POST /notifications/preview/event-by-key` | ✅ any | ✅ own | ✅ own | ✅ own | ❌ |
| `POST /notifications/event` | ✅ (API key only) | ❌ | ❌ | ❌ | ❌ |

---

#### A.4 Risk and Backward Compatibility

**Zero breaking changes.** All existing API key callers continue to work identically. The guard is additive — it adds a second authentication lane, it does not remove the first.

**Risk:** Low. The `GlobalAuthGuard` already parses and validates JWT for the platform layer. `ScopedAuthGuard` reuses the same JWT validation logic and adds role/scope enforcement.

---

#### A.5 Acceptance Criteria

- `PATCH /event-catalogue/:id` with valid JWT (`company_owner`, correct `companyId`) → 200
- `PATCH /event-catalogue/:id` with valid JWT (`company_owner`, wrong `companyId`) → 403
- `PATCH /event-catalogue/:id` with valid JWT (`operator`) → 403
- `PATCH /event-catalogue/:id` with valid `x-api-key` → 200 (unchanged)
- `PATCH /event-catalogue/:id` with no auth → 401
- `POST /notifications/event` with valid JWT (any role) → 401 (this endpoint stays API key only)
- `GET /notifications/logs` with valid JWT (`platform_admin`) → 200, all companies visible
- `GET /notifications/logs?companyId=X` with valid JWT (`company_owner` of company X) → 200
- `GET /notifications/logs?companyId=X` with valid JWT (`company_owner` of company Y) → 403

---

### Phase B — Company Readiness API

**Goal:** Expose the DEC-017 §17 readiness model as a queryable, structured endpoint. Every subsequent phase — the wizard, the dashboard, the health report — consumes this endpoint.

**Why here:** Phase B builds the shared data contract that phases C through K all reference. It is the most reused endpoint in the sprint.

---

#### B.1 Design

DEC-017 §17 defines two inferred states. The readiness endpoint computes them at request time by querying existing collections. No new Mongo collections. No persisted state.

```
GET /companies/:id/readiness
```

**Response shape:**

```typescript
{
  companyId: string;
  computedAt: string; // ISO timestamp

  // Ready for Customisation (DEC-017 §17.1)
  customisation: {
    hasDefaultTheme: boolean;
    hasDefaultEmailLayout: boolean;
    hasDefaultPdfLayout: boolean;
    hasSecurityDomain: boolean;
    hasDefaultEvents: boolean;
    isReady: boolean; // true when all five are true
  };

  // Ready for Delivery (DEC-017 §17.2)
  delivery: {
    email: {
      hasEnabledProvider: boolean;    // at least one active CompanyChannelProvider for email
      hasActiveCredentials: boolean;  // at least one active ProviderCredentials for that CCP
      hasDomainBinding: boolean;      // at least one domain has email in channelsToUse
      isReady: boolean;               // all three true
    };
    sms: {
      hasEnabledProvider: boolean;
      hasActiveCredentials: boolean;
      hasDomainBinding: boolean;
      isReady: boolean;
    };
  };

  // Overall
  isReadyForCustomisation: boolean;
  isReadyForDelivery: boolean;      // isReadyForCustomisation AND at least one channel ready
}
```

---

#### B.2 Implementation

**New method:** `CompanyProvisioningService.getReadiness(companyId)` — queries existing collections using the same stable keys as `provisionCompany()`.

**Computation logic:**

```
hasDefaultTheme         = exists(company_themes where companyId = X AND isDefault = true AND isActive = true)
hasDefaultEmailLayout   = exists(layout_templates where companyThemeId.companyId = X AND key = 'default_email_layout' AND isActive = true)
hasDefaultPdfLayout     = exists(layout_templates where companyThemeId.companyId = X AND key = 'default_pdf_layout' AND isActive = true)
hasSecurityDomain       = exists(domain_catalogues where companyId = X AND domainKey = 'security' AND isActive = true)
hasDefaultEvents        = count(event_catalogue where domainCatalogueId = securityDomain._id AND isActive = true) >= 1

hasEnabledProvider(ch)  = exists(company_channel_providers where companyId = X AND channel = ch AND isActive = true)
hasActiveCredentials(ch)= exists(provider_credentials where companyChannelProviderId in activeCCPs AND isActive = true)
hasDomainBinding(ch)    = exists(domain_catalogues where companyId = X AND channelsToUse contains channel = ch)
```

**Modified files:**

- `communication/company/company-info/company.controller.ts` — add `GET /:id/readiness`
- `communication/company/provisioning/company-provisioning.service.ts` — add `getReadiness(companyId)` method
- `communication/company/provisioning/company-provisioning.module.ts` — inject CompanyChannelProvider and ProviderCredentials models

**Why provisioning service and not company service:** The readiness check uses the same stable keys and queries that `provisionCompany()` already knows. The provisioning service is the natural home for this knowledge. The company controller already has provisioning injected.

**Access:** JWT (company_owner/company_admin for own company, platform_admin for any) OR API key.

---

#### B.3 Acceptance Criteria

- Freshly provisioned company (no providers) → `isReadyForCustomisation: true`, `isReadyForDelivery: false`
- Company with active email CCP + active credentials + domain binding → `delivery.email.isReady: true`, `isReadyForDelivery: true`
- Company with CCP but no credentials → `delivery.email.hasActiveCredentials: false`, `isReadyForDelivery: false`
- Company with credentials but no domain binding → `delivery.email.hasDomainBinding: false`, `isReadyForDelivery: false`
- Company with no provisioning run → `isReadyForCustomisation: false`
- Calling twice gives the same result (purely read-only, idempotent)

---

### Phase C — Domain Credential Binding

**Goal:** Complete the workflow that binds an active provider + credentials to a domain's channel configuration. This is the last step between "Ready for Customisation" and "Ready for Delivery".

**DEC-017 constraint (mandatory):** Provisioning must never create providers or credentials. Phase C does not touch provisioning. Binding is always explicit user action.

---

#### C.1 Context

After Sprint 002 provisioning:

```
Company
  └── Domain: security (channelsToUse: [])   ← empty, cannot dispatch
```

After Phase C workflow:

```
Company
  └── Domain: security
        └── channelsToUse: [
              { channel: 'email', providerCredentialsId: <active credential> }
            ]
```

This is what triggers `delivery.email.hasDomainBinding: true` in the readiness check.

The binding API already exists: `PATCH /domain-catalogue/:id/credentials/:channel`. What is missing is:

1. A lookup endpoint that finds the domain by key (not by ObjectId) — company users don't know MongoDB IDs
2. A status endpoint that shows what a domain's current delivery configuration is
3. Phase A authentication so company users can call these endpoints

---

#### C.2 New Backend Endpoints

**Get domain by company + domainKey:**

```
GET /domain-catalogue/by-key?companyId=X&domainKey=security
```

The service method `getByCompanyAndDomainKey()` exists. It is not currently exposed via HTTP. This endpoint exposes it.

**Get domain delivery status:**

```
GET /domain-catalogue/:id/delivery-status
→ {
    domainId: string;
    domainKey: string;
    channels: {
      email: {
        isBound: boolean;
        credential: { id: string; tag: string; isActive: boolean } | null;
      };
      sms: {
        isBound: boolean;
        credential: { id: string; tag: string; isActive: boolean } | null;
      };
    };
  }
```

This is a richer version of the existing `GET /domain-catalogue/:id/credentials` endpoint, structured for UI consumption.

**Unbind a channel credential:**

```
DELETE /domain-catalogue/:id/credentials/:channel
```

Currently `updateDomainCredential` can only replace a credential. Removing a channel binding (e.g., to disable email dispatch for a domain) is not supported. Sprint 003 adds the delete operation.

---

#### C.3 Modified Files

- `domain-catalogue.controller.ts` — add `GET /by-key`, `GET /:id/delivery-status`, `DELETE /:id/credentials/:channel`
- `domain-catalogue.service.ts` — add `getDomainDeliveryStatus()`, `removeChannelCredential()`

No schema changes. `channelsToUse` is already an array; removing an element is a standard `$pull` operation.

---

#### C.4 Acceptance Criteria

- `GET /domain-catalogue/by-key?companyId=X&domainKey=security` → returns domain (JWT auth)
- `GET /domain-catalogue/:id/delivery-status` before binding → `email.isBound: false`
- `PATCH /domain-catalogue/:id/credentials/email` with valid credential → 200
- `GET /domain-catalogue/:id/delivery-status` after binding → `email.isBound: true`, credential populated
- `DELETE /domain-catalogue/:id/credentials/email` → 200, channel removed from channelsToUse
- `GET /domain-catalogue/:id/delivery-status` after delete → `email.isBound: false`
- `PATCH /domain-catalogue/:id/credentials/email` with credential from different company → 400
- After binding → `GET /companies/:id/readiness` shows `delivery.email.hasDomainBinding: true`

---

### Phase D — Event Content Editor

**Goal:** Expose complete backend support for editing event content. This is the highest UX priority item in the sprint. Without it, all provisioned events are read-only to company users.

**This is the phase most likely to be used first by the Business App.** Company admins' primary daily work is editing what their notifications say — subject lines, email bodies, required variables.

---

#### D.1 What the Backend Already Has

- `PATCH /event-catalogue/:id` — updates all mutable fields, including `channelContent.email`
- `POST /notifications/preview/event-by-key` — renders the event to HTML + subject
- `EventCatalogueService.findByCompanyAndCanonicalKey()` — resolves by canonical key
- `scope` field on events — `platform | company`

---

#### D.2 What Is Missing

**V-05 validation (DEC-017):**

> Event `channelContent.email.content` must not contain `<header>`, `<footer>`, or corporate wrapper markup.

This is currently unimplemented. The backend accepts any HTML in event content, including full corporate HTML. Phase D adds this validation to `EventCatalogueService.create()` and `update()`.

**Implementation:**

```typescript
private assertEventContentDoesNotWrapLayout(content: string): void {
  const forbidden = ['<header', '<footer', '<html', '<body', '<head'];
  const lower = String(content ?? '').toLowerCase();
  for (const tag of forbidden) {
    if (lower.includes(tag)) {
      throw new HttpException(
        `Event email content must not contain "${tag}" — event content is the message body only, not a full layout (DEC-017 V-05)`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

Called in `create()` and `update()` when `channelContent.email.content` is present.

**Get event by canonical key (HTTP endpoint):**

`findByCompanyAndCanonicalKey()` exists in the service but is not exposed via HTTP. Company users and the editor UI need to resolve an event by its canonical key without knowing the MongoDB ObjectId.

```
GET /event-catalogue/by-canonical-key?companyId=X&canonicalEventKey=security.company_user_invitation
```

**Response shape for event editor:**

The current `EventCatalogueResponseDto` does not expose the `scope` field. Add it.

The DTO's `eventType` field still declares `'notification' | 'alert' | 'request'` — missing `'security'`. Update the DTO to reflect the schema truth.

**Variable resolution hints endpoint:**

When editing an event, the editor needs to show which variables are available. The editor already knows `data.*` from the event's `requiredVariables` and `optionalVariables`. It also needs `company.*` and `theme.*` variables. These are defined in DEC-017 §4.2 as a fixed contract.

Add a static endpoint that returns the available layout variables:

```
GET /event-catalogue/template-variables
→ {
    company: string[];  // ['company.displayName', 'company.legalName', ...]
    theme: string[];    // ['theme.primaryColor', 'theme.fontFamily', ...]
    meta: string[];     // ['meta.year', 'meta.generatedAtIso']
  }
```

This is a static response from the contract in DEC-017 §4.2. No database query.

---

#### D.3 Modified Files

- `event-catalogue.service.ts` — add V-05 validation in `create()` + `update()`; add `findByCompanyAndCanonicalKeyHttp()` (thin wrapper for HTTP exposure)
- `event-catalogue.controller.ts` — add `GET /by-canonical-key`, `GET /template-variables`
- `event-catalogue-response.dto.ts` — add `scope` field; fix `eventType` to include `'security'`

---

#### D.4 Preview Integration

The preview endpoint `POST /notifications/preview/event-by-key` already exists and is ready for the editor. No backend changes. The editor calls preview on every save or on explicit user action.

Behavior: `leavePlaceholders: true` — missing `data.*` variables render as `{{data.firstName}}` so the user sees where variables go even without mock data.

---

#### D.5 Acceptance Criteria

- `PATCH /event-catalogue/:id` with content containing `<header>` → 400 with message referencing DEC-017 V-05
- `PATCH /event-catalogue/:id` with content containing `<html>` → 400
- `PATCH /event-catalogue/:id` with clean HTML body → 200
- `PATCH /event-catalogue/:id` with SMS content (no HTML restriction) → 200
- `GET /event-catalogue/by-canonical-key?companyId=X&canonicalEventKey=security.company_forgot_password` → 200, event returned
- `GET /event-catalogue/by-canonical-key?companyId=X&canonicalEventKey=bad.key` → 404
- `GET /event-catalogue/template-variables` → 200, static list of `company.*` and `theme.*` variables
- `GET /event-catalogue/:id` response includes `scope` field
- After editing event subject → `POST /notifications/preview/event-by-key` returns updated subject

---

### Phase E — Layout Editor

**Goal:** Support editing layout HTML in an editor environment. The key backend capability is providing a preview that reflects **draft HTML** before saving — so the user can see what their layout will look like without committing the change.

**DEC-017 constraint:** Every layout must contain `{{content}}`. This validation is already enforced on save. The editor must be able to call a preview-with-draft endpoint that validates the same constraint before rendering.

---

#### E.1 What the Backend Already Has

- `PATCH /layout-templates/:id` — saves updated HTML (with `{{content}}` guard)
- `POST /preview/layout/html` — renders the default layout for a company (resolves from DB)
- `GET /layout-templates/by-company?companyId=X&includeHtml=true` — returns HTML for editor population

---

#### E.2 What Is Missing

**Preview with draft HTML (before save):**

The existing `POST /preview/layout/html` resolves the layout by `layoutTemplateId` — it always fetches from the database. The editor needs to preview **unsaved HTML** to give live feedback.

```
POST /preview/layout/draft
{
  companyId: string;       // resolve company.* and theme.* from this company
  html: string;            // the draft HTML (not yet saved)
  css?: string;            // optional draft CSS
}
→ string (HTML)            // rendered HTML
```

**Implementation:** `PreviewService.previewLayoutDraft()` — resolves company and theme by companyId (same as existing default resolution), then composes the draft HTML directly without a DB lookup for the template. The `{{content}}` validation runs before render (using the same `assertHasContentPlaceholder` guard from `LayoutTemplatesService`).

**Theme override for layout preview:**

When the user is editing a layout and simultaneously previewing how it will look with a specific theme (e.g., they're on the theme editor and switching colors), the preview should apply unsaved theme values without saving them.

```
POST /preview/layout/draft
{
  companyId: string;
  html: string;
  themeOverride?: {         // optional, applies without saving to DB
    primaryColor?: string;
    backgroundColor?: string;
    // ... any subset of theme tokens
  };
}
```

The `PreviewService.previewLayoutDraft()` merges `themeOverride` fields over the resolved theme before composition.

---

#### E.3 Validation in Editor

The frontend editor calls `POST /preview/layout/draft` on each debounced keypress. If the HTML does not contain `{{content}}`, the backend returns 400 with a specific error code. The editor displays a warning inline. This ensures the user knows the template is invalid before attempting to save.

---

#### E.4 Modified Files

- `preview.service.ts` — add `previewLayoutDraft({ companyId, html, css?, themeOverride? })`
- `preview.controller.ts` — add `POST /preview/layout/draft`
- `preview/dto/preview-layout-draft.dto.ts` — new DTO

---

#### E.5 Acceptance Criteria

- `POST /preview/layout/draft` with valid HTML including `{{content}}` → 200, rendered HTML
- `POST /preview/layout/draft` with HTML missing `{{content}}` → 400 with clear error
- `POST /preview/layout/draft` with `themeOverride.primaryColor = '#FF0000'` → rendered HTML uses red
- `POST /preview/layout/draft` with `themeOverride` missing some fields → uses DB theme for missing fields
- Two calls with the same input → same output (deterministic)

---

### Phase F — Theme Editor

**Goal:** Support editing theme color and typography tokens. The backend already has full CRUD. The only missing capability is previewing how a theme change looks **before saving**.

---

#### F.1 What the Backend Already Has

- `PUT /company-themes/:id` — saves updated theme tokens
- `GET /company-themes?companyId=X` — lists themes
- `GET /company-themes/:id` — single theme

The `POST /preview/layout/draft` endpoint from Phase E with `themeOverride` already covers theme preview. When the theme editor changes a color, it calls `POST /preview/layout/draft` with the current default layout HTML and the new color as `themeOverride.primaryColor`. No additional backend work is needed for theme preview.

---

#### F.2 What Is Missing

**Get default theme by company (convenience endpoint):**

Company users don't know their theme's ObjectId. The editor needs to fetch the default active theme without knowing the ID.

```
GET /company-themes/default?companyId=X
→ CompanyThemeResponseDto (or 404 if no default)
```

The method `CompanyThemeService.getDefaultByCompanyId()` exists. It is not currently exposed via HTTP. This endpoint exposes it.

**Set a theme as default:**

Currently setting `isDefault: true` on a theme update via `PUT /company-themes/:id` triggers the service to demote all other defaults. This works. No change needed.

---

#### F.3 Modified Files

- `company-theme.controller.ts` — add `GET /default?companyId=X`

---

#### F.4 Acceptance Criteria

- `GET /company-themes/default?companyId=X` on provisioned company → returns default theme
- `GET /company-themes/default?companyId=X` on non-provisioned company → 404
- Theme editor calls `POST /preview/layout/draft` with `themeOverride` → preview reflects new colors (Phase E endpoint)
- `PUT /company-themes/:id` with `isDefault: true` → previous default theme has `isDefault: false`

---

### Phase G — Preview Improvements

**Goal:** Extend preview to SMS and PDF channels by canonical key. All previews use `NotificationRenderService`. No provider is contacted. No execution log is written. This is a strict rendering-only operation per DEC-017 §10.4 and DEC-018 §8.1.

---

#### G.1 Email Preview (Already Complete)

`POST /notifications/preview/event-by-key` — email only, rendering only. ✅ Sprint 002 Phase 5.

---

#### G.2 SMS Preview by Canonical Key

```
POST /notifications/preview/sms-by-key
{
  companyId: string;
  canonicalEventKey: string;
  data?: Record<string, any>;
}
→ { text: string }
```

**Implementation:**

`NotificationRenderService.renderSms()`:

1. Resolve event via `EventCatalogueService.findByCompanyAndCanonicalKey()`
2. Check `channelContent.sms.enabled`
3. Resolve SMS content template: `channelContent.sms.content`
4. Apply `simpleTpl()` variable substitution (no layout for SMS — SMS has no layout wrapper, per the composition model)
5. Return `{ text }`

SMS preview does **not** use `SourceOfTruthService` (no layout needed). It uses the same simple template substitution as SMS dispatch in `NotificationService.handleSms()`.

---

#### G.3 PDF Preview by Canonical Key

```
POST /notifications/preview/pdf-by-key
{
  companyId: string;
  canonicalEventKey: string;
  data?: Record<string, any>;
}
→ application/pdf (binary)
```

**Implementation:**

`NotificationRenderService.renderPdfHtml()`:

1. Resolve event via canonical key
2. Resolve PDF layout via `SourceOfTruthService.resolveDefaultLayoutByCompany({ templateType: 'pdf' })`
3. Compose PDF HTML using `TemplateComposerService` (same as email but with PDF layout)
4. Return composed HTML

The controller calls the existing `GeneratorService.handle({ format: 'pdf', payload: { html } })` to produce the binary.

Note: PDF content in events is not currently defined in the schema. `EventCatalogue.channelContent` has `email` and `sms` sub-schemas. PDF preview uses the event's email content injected into the PDF layout — this matches the composition model (the layout defines the channel type, not the event).

**Alternative approach:** If PDF-specific event content is desired in the future, that is a schema addition — not Sprint 003 scope. For Sprint 003, PDF preview uses `channelContent.email.content` injected into the default PDF layout.

---

#### G.4 Modified Files

- `notification-render.service.ts` — add `renderSms()`, `renderPdfHtml()`
- `notification.controller.ts` — add `POST /preview/sms-by-key`, `POST /preview/pdf-by-key`
- `notifications/dto/preview-by-event-key.dto.ts` — already exists, reused

---

#### G.5 Acceptance Criteria

- `POST /preview/sms-by-key` with valid canonical key → `{ text: "..." }` with variables substituted
- `POST /preview/sms-by-key` with unknown canonical key → 404
- `POST /preview/sms-by-key` with event that has no SMS content → 400 (SMS channel not configured)
- `POST /preview/pdf-by-key` with valid canonical key → `Content-Type: application/pdf`, binary body
- `POST /preview/pdf-by-key` → no provider contacted, no execution log written
- All three preview endpoints return identical results for identical inputs (deterministic rendering)

---

### Phase H — Test Notification Workflow

**Goal:** Allow company administrators to send a real test notification that uses real providers and real credentials, creates an execution log entry, and returns the delivery result inline.

**This is the last step in the DEC-016 setup workflow.** A company owner should be able to click "Send Test" on step 8 of the sidebar and immediately know whether their configuration works end-to-end.

**This is distinct from `POST /notifications/event`:**

| | `POST /notifications/event` | `POST /notifications/test` |
|---|---|---|
| Auth | API key only | JWT (company_owner, company_admin) |
| Caller | Application services | Human via UI |
| Recipient | Resolved from domain config or request | Explicit test address, mandatory |
| Execution log | Yes, `deliveryStatus: sent/failed` | Yes, `deliveryStatus: sent/failed` (Phase J adds `source: test` tag) |
| Purpose | Production delivery | Configuration verification |

---

#### H.1 Endpoint

```
POST /notifications/test
{
  companyId: string;
  canonicalEventKey: string;
  testEmail?: string;     // required if event has email channel
  testPhone?: string;     // required if event has SMS channel
  data?: Record<string, any>;
}
→ {
    canonicalEventKey: string;
    results: NotificationResultDto[];
    executionLogIds: string[];
  }
```

**Implementation:**

`NotificationService.testNotification()`:

1. Resolve event by canonical key (same as `notifyEvent()`)
2. Check that `testEmail` or `testPhone` is provided based on the event's enabled channels
3. Call the rendering pipeline (same `NotificationRenderService.renderEmail()`)
4. Call delivery (same channel implementation)
5. Write execution log (same `ExecutionLogService.create()`)
6. Return results with execution log IDs so the caller can retrieve the log entry

The implementation reuses the entire existing dispatch stack. The only difference is the recipient source (explicit test address instead of `dto.email`/`dto.phone`) and the JWT auth.

**No new infrastructure.** The test endpoint is a thin wrapper that enforces:
- JWT auth (company_owner or company_admin for own company)
- Explicit test recipient
- The full render → deliver → log cycle

---

#### H.2 Execution Log Tagging

The execution log entry for a test notification is identical to a production log entry. No `source: test` field is added to the schema. The execution log does not distinguish test from production sends — both represent real delivery attempts through real providers.

If the platform needs to filter test sends separately in the future, a `source` field can be added as a schema extension without breaking existing records.

---

#### H.3 Modified Files

- `notification.service.ts` — add `testNotification()` method
- `notification.controller.ts` — add `POST /notifications/test`
- `notifications/dto/test-notification.dto.ts` — new DTO

---

#### H.4 Acceptance Criteria

- `POST /notifications/test` with valid JWT (company_owner) → 200, real email delivered
- `POST /notifications/test` without `testEmail` when event has email channel → 400
- `POST /notifications/test` → execution log entry written with `deliveryStatus: sent` or `failed`
- `POST /notifications/test` → response includes `executionLogIds` pointing to the written log
- `POST /notifications/test` with JWT for wrong company → 403
- `POST /notifications/test` with no auth → 401
- `POST /notifications/test` when domain has no credential bound → 400 (no `channelsToUse` for channel)
- `POST /notifications/test` and `GET /notifications/logs/:id` → log entry visible, retrievable

---

### Phase I — PlatformMailService Migration

**Goal:** Replace the three hardcoded email templates in `PlatformMailService` with the event catalogue. This is Sprint 002 Phase 6 (explicitly deferred from that sprint).

**This phase must be feature-flagged and must not break any auth flow.**

---

#### I.1 What Must Be Provisioned First

Platform-scoped events (DEC-017 §6.1) are not currently provisioned. Only company-scoped events (§6.2) were provisioned in Sprint 002.

The following events must exist for the platform company (`isPlatformCompany: true`) before migration:

| Event key | Maps to | PlatformMailService method |
|---|---|---|
| `user_registered` | `security.user_registered` | `trySendVerifyEmail()` |
| `forgot_password` | `security.forgot_password` | `trySendResetPassword()` |
| `user_invitation` | `security.user_invitation` | `trySendTempPasswordInvitation()` |

These are `scope: 'platform'` events. They are provisioned **only** for companies where `isPlatformCompany === true`.

**New constant:** `DEFAULT_PLATFORM_EVENTS` in `company/provisioning/constants/`

**Modified provisioning service:** `CompanyProvisioningService.provisionCompany()` checks `company.isPlatformCompany`. If true, also provisions platform-scoped events from `DEFAULT_PLATFORM_EVENTS`. If false, provisions only company-scoped events (existing behavior unchanged).

**The repair endpoint** (`POST /companies/:id/provision`) already handles both cases — it will provision the platform events on re-run for the platform company.

---

#### I.2 Migration

**Feature flag:** `PLATFORM_MAIL_USE_EVENT_CATALOGUE=true` (env variable). Default: `false`. Existing behavior preserved when flag is off.

**`PlatformMailService` changes:**

```typescript
// BEFORE (hardcoded)
async trySendVerifyEmail(params): Promise<boolean> {
  const subject = verifyEmailSubject(params);
  const html = verifyEmailHtml(params);
  // ... nodemailer send
}

// AFTER (event catalogue when flag enabled)
async trySendVerifyEmail(params): Promise<boolean> {
  if (this.useEventCatalogue) {
    return this.notifyViaEventCatalogue('security.user_registered', params);
  }
  // ... existing hardcoded path
}
```

**`notifyViaEventCatalogue()` internal helper:**

1. Resolve the platform company's `companyId` from `isPlatformCompany: true`
2. Call `NotificationService.notifyEvent({ companyId, event: canonicalKey, email, variables })`
3. Return `result.results.every(r => r.success)`

**Hard requirement before enabling the flag:**

1. Platform company must be provisioned (platform events must exist in the event catalogue)
2. Platform company must have an enabled SMTP provider
3. Platform company must have active credentials
4. Platform company's security domain must have email bound in `channelsToUse`
5. End-to-end test of all three flows (verify, reset, invite) in staging

The flag is not a long-term feature flag. Once migration is verified, the hardcoded templates are removed and the flag check is eliminated. Target: Sprint 004.

---

#### I.3 Modified Files

- `company/provisioning/constants/default-platform-events.constant.ts` — new
- `company/provisioning/company-provisioning.service.ts` — add platform event provisioning
- `infrastructure/platform-mail/platform-mail.service.ts` — add event catalogue path, feature flag

---

#### I.4 Acceptance Criteria

- With `PLATFORM_MAIL_USE_EVENT_CATALOGUE=false` → hardcoded templates used (existing behavior)
- With `PLATFORM_MAIL_USE_EVENT_CATALOGUE=true` and platform company not provisioned → falls back to hardcoded with warning log (no auth flow breaks)
- With `PLATFORM_MAIL_USE_EVENT_CATALOGUE=true` and platform company fully provisioned → event catalogue used, email delivered
- `POST /companies/:id/provision` on platform company → platform-scoped events created
- `POST /companies/:id/provision` on tenant company → only company-scoped events created (unchanged)
- After migration: execution log shows entry for every platform email sent

---

### Phase J — Execution Log Improvements

**Goal:** Make the execution log queryable and useful for diagnosing delivery problems. Currently it is write-only for operational purposes (only `companyId` filter).

---

#### J.1 Endpoint Enhancements

**Extended list endpoint:**

```
GET /notifications/logs
  ?companyId=          required
  &canonicalEventKey=  optional  e.g. "security.company_user_invitation"
  &domainKey=          optional  e.g. "security"
  &eventKey=           optional  e.g. "company_user_invitation"
  &channel=            optional  email | sms
  &renderStatus=       optional  success | failed
  &deliveryStatus=     optional  sent | failed | skipped | pending
  &providerId=         optional  MongoDB ObjectId
  &from=               optional  ISO datetime
  &to=                 optional  ISO datetime
  &limit=              optional  default 50, max 200
  &offset=             optional  default 0
```

**New single-entry endpoint:**

```
GET /notifications/logs/:id
→ ExecutionLogResponseDto
```

Access: same as `GET /notifications/logs` — JWT (company_owner/company_admin for own company, platform_admin for any) or API key.

---

#### J.2 New Index

Add to `execution-log.schema.ts`:

```typescript
NotificationExecutionLogSchema.index(
  { companyId: 1, deliveryStatus: 1, createdAt: -1 },
  { name: 'idx_execlog_company_delivery_created' },
);
```

The existing indexes already cover:
- `{ companyId: 1, createdAt: -1 }` — primary list
- `{ companyId: 1, canonicalEventKey: 1, createdAt: -1 }` — event filter
- `{ deliveryStatus: 1, createdAt: -1 }` — cross-company operations dashboard

---

#### J.3 Optional TTL Index (Configurable)

For production environments, execution logs should not grow unboundedly:

```typescript
// Applied only when EXECUTION_LOG_RETENTION_DAYS env var is set
NotificationExecutionLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: retentionDays * 86400,
    name: 'ttl_execlog_retention',
  },
);
```

Default: no TTL (no expiry). Set `EXECUTION_LOG_RETENTION_DAYS=90` in production to retain 90 days.

---

#### J.4 Modified Files

- `execution-log.service.ts` — extend `findAll()` with filter params; verify `getById()` is exposed
- `notification.controller.ts` — expose filters on `GET /logs`; add `GET /logs/:id`

---

#### J.5 Acceptance Criteria

- `GET /logs?companyId=X&deliveryStatus=failed` → only failed entries
- `GET /logs?companyId=X&canonicalEventKey=security.company_forgot_password` → only that event's logs
- `GET /logs?companyId=X&from=2026-01-01T00:00:00Z&to=2026-06-30T23:59:59Z` → date-bounded results
- `GET /logs?companyId=X&channel=sms` → only SMS attempts
- Combined filters → intersection (AND logic, not OR)
- `GET /logs/:id` with valid ID belonging to company X + JWT of company X → 200
- `GET /logs/:id` with valid ID belonging to company X + JWT of company Y → 403
- `GET /logs/:id` with nonexistent ID → 404

---

### Phase K — Communication Dashboard

**Goal:** Provide aggregated metrics endpoints that power the dashboard pages for both Platform Admin and Business App.

---

#### K.1 Business App Dashboard Endpoint

```
GET /companies/:id/communication-dashboard
→ {
    summary: {
      totalSent: number;
      totalFailed: number;
      totalSkipped: number;
      successRate: number;         // sent / (sent + failed) * 100
      lastActivityAt: string | null;
    };
    last24h: {
      sent: number;
      failed: number;
    };
    byEvent: Array<{               // top 5 events by volume
      canonicalEventKey: string;
      sent: number;
      failed: number;
    }>;
    byChannel: {
      email: { sent: number; failed: number };
      sms: { sent: number; failed: number };
    };
    readiness: ReadinessResponse;  // reuse Phase B response
    recentFailures: ExecutionLogResponseDto[]; // last 5 failed entries
  }
```

**Implementation:** Single MongoDB aggregation pipeline on `notification_execution_logs` filtered by `companyId`. Plus the readiness check from Phase B. No new collections.

---

#### K.2 Platform Admin Dashboard Endpoint

```
GET /platform/communication-summary
→ {
    companies: {
      total: number;
      readyForCustomisation: number;
      readyForDelivery: number;
      neitherReady: number;
    };
    notifications: {
      totalSent24h: number;
      totalFailed24h: number;
      totalSentAllTime: number;
    };
    byProvider: Array<{            // top providers by volume
      providerKey: string;
      sent: number;
      failed: number;
    }>;
    topEvents: Array<{             // most triggered events across all companies
      canonicalEventKey: string;
      count: number;
    }>;
  }
```

**Access:** Platform Admin only (JWT with `role: 'platform_admin'` or API key).

**Implementation:** Aggregation pipelines across `notification_execution_logs` and `company` collections.

**Performance constraint:** Dashboard aggregations must complete in under 500ms. If the dataset is large, use pre-aggregated counts or limit queries to the last 24h/7d window. Add MongoDB `allowDiskUse: true` to aggregation options.

---

#### K.3 Modified Files

- `company/company-info/company.controller.ts` — add `GET /:id/communication-dashboard`
- New: `communication/notifications/dashboard/notification-dashboard.service.ts`
- New: `communication/notifications/dashboard/notification-dashboard.module.ts`
- New route: `GET /platform/communication-summary` — either in a new `PlatformController` or the existing app controller

---

#### K.4 Acceptance Criteria

- `GET /companies/:id/communication-dashboard` with no logs → all counts zero, `readiness` populated
- `GET /companies/:id/communication-dashboard` after sends → `totalSent` > 0, `successRate` computed
- `GET /companies/:id/communication-dashboard` with JWT of different company → 403
- `GET /platform/communication-summary` with `company_owner` JWT → 403
- `GET /platform/communication-summary` with `platform_admin` JWT → 200
- Response time under 500ms on collections with < 100k log entries

---

## 5. Three New Product Capabilities — Evaluation

The following three capabilities were identified as potential modules. Each is evaluated for Sprint 003 vs Sprint 004.

---

### Capability 1 — Communication Configuration

**Description:** A single unified setup page where company administrators configure all communication assets in one place — Theme, Layouts, Providers, Credentials, Channels, Default Sender, Reply-To — instead of visiting many independent pages.

**Backend requirement:** None new. Phases A–K deliver all required backend APIs. The capability is entirely a frontend UX composition.

**Architecture note:** This is the "single pane of glass" view over the 8-step DEC-016 workflow. It does not change data model, does not add endpoints, does not change business logic. It is a frontend routing and layout concern.

**Verdict: Sprint 004.** Sprint 003 delivers every backend endpoint this capability needs. Sprint 004 builds the unified frontend shell. Attempting it in Sprint 003 would mix frontend UX work into a backend-focused sprint.

---

### Capability 2 — Communication Health

**Description:** A structured health report that shows the state of every communication asset:

```
Theme           ✓ configured
Layouts         ✓ email + pdf configured
Events          ✓ 4 events provisioned
Providers       ✓ SendGrid enabled
Credentials     ✓ 1 active credential
Channels        ✓ email bound on security domain
Preview         ✓ rendering works
Test Send       ? not yet verified
Ready           ✓ Ready for Delivery
```

**Backend requirement:** This is **Phase B extended**.

The `GET /companies/:id/readiness` endpoint (Phase B) already covers the first six checks. The "Preview works" check requires calling the render service — this is a computed verification (can the engine render the company's default event without error?). The "Test Send verified" check is a historical state — was the last test notification successful?

**Sprint 003 scope:** Add two additional checks to Phase B's response:

```typescript
verification: {
  previewWorks: boolean | null;        // null = not yet checked
  lastTestNotificationAt: string | null;
  lastTestNotificationStatus: 'sent' | 'failed' | null;
}
```

`previewWorks` is computed lazily on request by attempting to render the company's first available event. If rendering succeeds, `true`. If it fails, `false`. This adds a small compute cost — run it only when explicitly requested (query param `?includeVerification=true`).

`lastTestNotificationAt` and `lastTestNotificationStatus` are read from the execution log — the most recent log entry for this company.

**Verdict: Include in Sprint 003 Phase B.** The backend computation is simple and extends naturally from Phase B's readiness check. The frontend "Communication Health" page is Sprint 004 work.

---

### Capability 3 — Communication Onboarding Wizard

**Description:** A guided workflow that walks a new company through the entire setup sequence:

```
Create Company → Provision → Configure Providers → Bind Credentials → Preview → Send Test → Ready For Production
```

**Backend requirement:** None new. Phases A through H together provide every API the wizard needs:

| Wizard step | Backend phase |
|---|---|
| Create Company | Existing |
| Provision | Existing (`POST /companies/:id/provision`) |
| Configure Providers | Phase A (auth for CompanyChannelProviders) |
| Bind Credentials | Phase C (domain credential binding) |
| Preview | Phase G (multi-channel preview) |
| Send Test | Phase H (test notification) |
| Ready For Production | Phase B (readiness API) |

**Verdict: Sprint 004.** The wizard is pure frontend — a multi-step form orchestrating existing APIs. Sprint 003 builds the API foundation. Sprint 004 builds the wizard UI. The wizard should only be built after all sprint 003 APIs are tested and stable.

---

## 6. Hidden Technical Debt

Issues found during architecture review that are not user-visible but will create problems at production scale or during future development.

---

### TD-001 — `EventCatalogueResponseDto.eventType` is stale

**Location:** `event-catalogue-response.dto.ts`

**Problem:** The DTO declares `eventType: 'notification' | 'alert' | 'request'`. The schema now allows `'security'` (added in Sprint 002). Any TypeScript code consuming this DTO and checking `eventType === 'security'` will trigger a type error.

**Fix:** Update the DTO type to `'notification' | 'alert' | 'request' | 'security'`. One-line change. **Include in Phase D.**

---

### TD-002 — `providerMessageId` always null in execution logs

**Location:** `notification.service.ts`, all channel implementations

**Problem:** The execution log has a `providerMessageId` field (DEC-018 §10.3) that is always stored as `null`. SendGrid returns a `x-message-id` header. Mailgun returns a `message-id`. Twilio returns an `sid`. The channel interfaces (`IEmailChannel.sendEmail()`) return `NotificationResultDto` which has no `providerMessageId` field.

**Impact:** Support teams cannot trace a specific notification by provider ID. Audit trail is incomplete.

**Fix:** Extend `NotificationResultDto` to include `providerMessageId?: string | null`. Update `sendgrid-email.channel.ts`, `mailgun-email.channel.ts`, and `twilio-sms.channel.ts` to return the provider's message ID. Update `NotificationService.handleEmailWithLayout()` and `handleSms()` to capture it.

**Sprint 003 scope:** Phase H (test notification) is the ideal moment to fix this, because the test workflow is the first user-visible place where "did the message get sent?" matters and the provider reference is needed. **Include in Phase H.**

---

### TD-003 — MongoDB session requirement in `CompanyThemeService`

**Location:** `company-theme.service.ts`

**Problem:** `CompanyThemeService.create()` and `updateById()` use `model.db.startSession()` for transactions. MongoDB sessions require a replica set. In a development environment without a replica set (e.g., standalone `mongod`), the session starts but the transaction fails silently or the operations run outside the transaction context.

**Impact:** In a development environment, setting `isDefault: true` may not correctly demote existing defaults under concurrent writes.

**Fix:** Either document the replica set requirement clearly, or refactor to use a non-transactional approach that relies on Mongoose partial unique indexes (which already exist on `{ companyId, isDefault }` where `isDefault = true`).

**Sprint 003 scope:** Not blocking for Sprint 003. Document in environment setup. Consider refactor in Sprint 004.

---

### TD-004 — Orphaned provisioning assets on company creation rollback

**Location:** `company.controller.ts`, `createWithOwner()`

**Problem:** The `createWithOwner()` flow is:
1. Create company
2. Create owner user — on failure, delete company (rollback)
3. Provision defaults

If step 2 fails and the company is deleted, step 3 never runs (correct). But if step 3 starts and fails mid-way after creating some assets (e.g., theme created, layout fails), and then step 2 also fails... the provisioning assets are already created for the deleted company's ID. They are orphaned.

In practice, the company is deleted in step 2's catch block before step 3 has a chance to create anything (step 3 follows step 2 in the current code). But the ordering should be confirmed.

**Fix:** Verify that provisioning always runs AFTER the owner user is successfully created. Current code already does this — step 3 is after step 2. Document this explicitly. Add a comment to `createWithOwner()`.

**Sprint 003 scope:** No code change needed, but **add the comment in Phase A** when touching `company.controller.ts`.

---

### TD-005 — `DomainCatalogue.channelsToUse` requires credential at create time

**Location:** `domain-catalogue.service.ts`, `domain-catalogue.schema.ts`

**Problem:** The `ChannelToUse` sub-schema requires `providerCredentialsId: Types.ObjectId, required: true`. This means you cannot create a domain with a channel entry unless you already have a credential. The binding workflow must be:

1. Create domain with `channelsToUse: []`
2. Later bind: `PATCH /domain-catalogue/:id/credentials/:channel`

This two-step process is correct per DEC-017. However, the `DomainCatalogueService.assertUniqueChannelsToUse()` validation runs even on `channelsToUse: []` and validates each item. Since there are no items, it passes.

**Risk:** If any future code tries to create a domain with `channelsToUse: [{ channel: 'email' }]` (missing credential), it will fail at the MongoDB level (`required: true`) with an unclear error.

**Fix:** No code change. The schema enforces the correct constraint. **Document this in the Phase C section as expected behavior.**

---

### TD-006 — No recipient resolution

**Location:** `notification.service.ts`, `NotifyEventDto`

**Problem:** `NotifyEventDto` requires the caller to pass `email` or `phone` explicitly. In production, notification triggers come from business events where the recipient is known by `userId` or `companyUserId`. The notification engine should be able to resolve the recipient's contact from user records.

**Impact:** Every caller must maintain their own recipient resolution. The engine cannot deliver to "the user who just reset their password" without the caller looking up the email first.

**Sprint 003 partial fix:** Phase H's test endpoint uses explicit `testEmail`/`testPhone` — this is acceptable for tests. The production caller (`POST /notifications/event`) continues to use explicit email/phone.

**Deferred fix:** Sprint 004 — add optional `recipientUserId` to `NotifyEventDto`. The notification engine resolves the email/phone from the user record if `email`/`phone` are not provided.

---

### TD-007 — Execution log has no recipient field

**Location:** `execution-log.schema.ts`

**Problem:** DEC-018 §10.3 does not require a recipient field. But when a support team member asks "was the invitation sent to user@example.com on Tuesday?", the execution log provides no answer. The log shows the event, the channel, the provider, and the result — but not who was targeted.

**Sprint 003 scope:** Add `recipientAddress: string | null` to the schema. Populate it from `dto.email` or `dto.phone` in `NotificationService.notifyEvent()`. **Include in Phase H**, where the test notification is the first scenario where recipient tracking matters.

**Schema addition:** Non-breaking (new nullable field, no index needed).

---

## 7. Operational and Observability Concerns

---

### O-001 — Synchronous dispatch will block at scale

**Current state:** All notification dispatch is synchronous on the HTTP request thread. DEC-003 accepted this for Phase 1A.

**Risk threshold:** At approximately 50+ concurrent notifications, request threads will be saturated while waiting for SMTP/API responses. This will degrade other API endpoints.

**Sprint 003 action:** No code change. Add `CHANNEL_TIMEOUT_MS` enforcement if not already present (DEC-003 action AP-003). Document the scale limit.

**Sprint 004 action:** Investigate async dispatch via `NOTIFICATION_QUEUE` (BullMQ already registered, no processor exists).

---

### O-002 — No retry on delivery failure

**Current state:** A `deliveryStatus: failed` log entry is terminal. There is no retry mechanism.

**Risk:** Transient SMTP errors (rate limits, temporary server unavailable) result in permanent delivery failures.

**Sprint 003 action:** No code change. The execution log captures failures. The test notification (Phase H) surfaces this immediately to the user.

**Sprint 004 action:** Implement retry with exponential backoff (DEC-003 action AP-009) before queue-based dispatch.

---

### O-003 — No credential validity check before dispatch

**Current state:** The engine discovers an invalid/expired credential only when `sendEmail()` or `sendSms()` throws. The credential may have been revoked at the provider without the platform knowing.

**Sprint 003 action:** The readiness check (Phase B) verifies that active credentials exist. It does not verify that credentials are functionally valid (not expired at the provider). The test notification (Phase H) implicitly performs this check.

**Sprint 004 action:** Add a `POST /provider-credentials/:id/verify` endpoint that calls the provider's credential validation API and returns the result. Already partially implemented in `ProviderCredentialsController` for SMTP and S3.

---

### O-004 — Execution log retention

**Current state:** No TTL. Logs grow indefinitely.

**Sprint 003 action:** Phase J adds an optional TTL index controlled by `EXECUTION_LOG_RETENTION_DAYS`. Default: no TTL.

**Production recommendation:** Set `EXECUTION_LOG_RETENTION_DAYS=90` for a rolling 90-day window.

---

### O-005 — No alerting on delivery failure rate

**Current state:** The platform admin can see failures in the dashboard (Phase K), but there is no proactive alerting when failure rates spike.

**Sprint 003 action:** None. Dashboard provides visibility.

**Sprint 004 action:** Add webhook notification or email alert when `failedCount / totalCount > threshold` in a time window.

---

## 8. API Contract Summary

### New Endpoints

| Method | Path | Phase | Auth |
|---|---|---|---|
| `GET` | `/companies/:id/readiness` | B | JWT (own company or platform_admin) / API key |
| `GET` | `/company-themes/default?companyId=X` | F | JWT / API key |
| `GET` | `/domain-catalogue/by-key?companyId=X&domainKey=Y` | C | JWT / API key |
| `GET` | `/domain-catalogue/:id/delivery-status` | C | JWT / API key |
| `DELETE` | `/domain-catalogue/:id/credentials/:channel` | C | JWT / API key |
| `GET` | `/event-catalogue/by-canonical-key?companyId=X&canonicalEventKey=Y` | D | JWT / API key |
| `GET` | `/event-catalogue/template-variables` | D | JWT / API key |
| `POST` | `/preview/layout/draft` | E | JWT / API key |
| `POST` | `/notifications/preview/sms-by-key` | G | JWT / API key |
| `POST` | `/notifications/preview/pdf-by-key` | G | JWT / API key |
| `POST` | `/notifications/test` | H | JWT (company_owner, company_admin) only |
| `GET` | `/notifications/logs/:id` | J | JWT / API key |
| `GET` | `/companies/:id/communication-dashboard` | K | JWT / API key |
| `GET` | `/platform/communication-summary` | K | JWT (platform_admin) / API key |

### Modified Endpoints

| Method | Path | Phase | Change |
|---|---|---|---|
| All existing communication endpoints | Various | A | Accept JWT in addition to API key |
| `PATCH /event-catalogue/:id` | D | Add V-05 content validation |
| `GET /notifications/logs` | J | Add filter query params |

### No Breaking Changes

All existing request/response shapes are preserved. New query parameters are optional. New response fields are additive. New auth lane is additive (API key unchanged).

---

## 9. Database Changes

### New index — `notification_execution_logs`

```typescript
{ companyId: 1, deliveryStatus: 1, createdAt: -1 }
// Phase J
```

### New field — `notification_execution_logs` (Phase H)

```typescript
recipientAddress: string | null;  // nullable, no index, captures dto.email or dto.phone
```

Non-breaking. Existing documents without this field return `null`.

### No new collections

Sprint 003 introduces no new Mongo collections.

---

## 10. Dependency Graph

```
Phase A (Authentication)
    │
    ├──→ Phase B (Readiness API)
    │         │
    │         └──→ Phase K (Dashboard)
    │
    ├──→ Phase C (Domain Binding)
    │         │
    │         └──→ Phase H (Test Notification)
    │                   │
    │                   └──→ Phase I (PlatformMail Migration)
    │
    ├──→ Phase D (Event Editor)
    │
    ├──→ Phase E (Layout Editor)
    │
    ├──→ Phase F (Theme Editor — depends on Phase E for preview draft)
    │
    ├──→ Phase G (Multi-channel Preview)
    │
    └──→ Phase J (Execution Log Improvements)
          │
          └──→ Phase K (Dashboard — benefits from filtered logs)
```

Phases G, D, E, F, J are independently implementable after Phase A. No strict ordering between them. Phases B and C must precede H. Phase H must precede I.

---

## 11. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Phase I breaks auth flows (password reset, invite) if platform company is not fully provisioned when flag is enabled | Medium | High | Feature flag defaults to `false`. Explicit checklist before enabling. Fallback to hardcoded templates on any resolution failure. |
| R-02 | Phase A (JWT auth) breaks existing API key callers | Low | High | Guard is purely additive. API key path is untouched. Integration test suite covers both paths per endpoint. |
| R-03 | Phase K dashboard aggregation query times out on large execution log collections | Medium | Medium | Limit to last 24h / 7d windows. `allowDiskUse: true`. Cap `byEvent` to top 5. Add Phase J index before running dashboards. |
| R-04 | Phase G PDF rendering fails in environments without Puppeteer or browser dependency | Medium | Low | PDF generation uses the existing `GeneratorService` which already has this dependency. No new risk introduced. |
| R-05 | Phase D V-05 validation rejects existing event content that already violates the rule | Low | Medium | V-05 only applies to `create()` and `update()`. Existing records are not validated retroactively. Company admins see the error only when they try to save forbidden content. |
| R-06 | Phase H test notification sends real email to wrong address during development | Low | Low | Test endpoint requires explicit `testEmail` param. No default recipient. Nothing is inferred from user records. |
| R-07 | `CompanyThemeService` transaction failures in dev environments without replica sets | Low | Low (dev only) | Document replica set requirement. Sessions fail gracefully to non-transactional path for single-document operations. |

---

## 12. Recommended Execution Order

```
Week 1
  Phase A — Authentication        [Prerequisite for all else. Ship first.]
  Phase B — Readiness API         [Can run in parallel with A after guard interface is defined.]

Week 2
  Phase C — Domain Binding        [Completes the delivery chain. High business value.]
  Phase D — Event Content Editor  [Highest UX priority. Backend changes are small.]
  Phase J — Execution Log         [Small effort, high diagnostic value. Add alongside C.]

Week 3
  Phase E — Layout Editor         [Depends on Phase E's draft preview DTO being available.]
  Phase F — Theme Editor          [Depends on Phase E endpoint. Small effort.]
  Phase G — Multi-channel Preview [Independent. Small effort.]

Week 4
  Phase H — Test Notification     [Depends on C. The UX completion of the setup workflow.]
  Phase K — Dashboard             [Depends on B and J. Aggregate what's been collected.]

Week 5
  Phase I — PlatformMail Migration [Highest risk. Last. Must be feature-flagged and staged.]
```

---

## 13. Out of Scope

The following items are explicitly excluded from Sprint 003. They are either covered by existing decisions that defer them, or they require additional design decisions.

| Item | Reason |
|---|---|
| Template versioning | DEC-017 §19 — explicitly future architecture, not v1 |
| Event versioning | DEC-017 §19 — same |
| Queue-based async dispatch | DEC-003 — deferred to Phase C (high complexity, low urgency at current volume) |
| Retry with backoff | DEC-003 AP-009 — deferred to Sprint 004 |
| Audit log processor | AUDIT_QUEUE has no processor; AUDIT_PROCESSOR is DEC-003 AP-016 deferred |
| Import/export of default event sets | No decision record; requires design |
| `recipientUserId` resolution | TD-006 — deferred to Sprint 004 |
| Communication Onboarding Wizard (frontend) | Sprint 004 — backend foundation built in Sprint 003 |
| Communication Configuration (unified page) | Sprint 004 — frontend composition only |
| Communication Health page (frontend) | Sprint 004 — Phase B provides the backend |
| Provider credential rotation | No decision record |
| DKIM / SPF / MX domain verification | DEC-017 §3.2 — explicitly excluded from auto-provisioning |
| Multi-tenant notification isolation audit | Future security review |

---

## Appendix A: Sprint 002 Completion Verification

Before starting Sprint 003, verify the following Sprint 002 deliverables are operational:

```
1. POST /companies/with-owner
   → response.provisioning.created.theme === true
   → response.provisioning.created.emailLayout === true
   → response.provisioning.created.pdfLayout === true
   → response.provisioning.created.securityDomain === true
   → response.provisioning.created.events includes at least 4 keys

2. POST /companies/:id/provision (second call)
   → all skipped: true, none created

3. POST /notifications/event with event: "security.company_forgot_password"
   → resolves and dispatches (requires domain binding)

4. POST /notifications/preview/event-by-key
   → returns { subject, html } with {{content}} composed into layout

5. POST /layout-templates without {{content}} in html
   → 400

6. GET /notifications/logs?companyId=X
   → returns execution log entries
```

---

## Appendix B: File Count Estimate

| Phase | New Files | Modified Files |
|---|---|---|
| A — Auth | 2 | 7 |
| B — Readiness | 0 | 2 |
| C — Domain Binding | 1 (DTO) | 2 |
| D — Event Editor | 1 (DTO) | 3 |
| E — Layout Editor | 1 (DTO) | 2 |
| F — Theme Editor | 0 | 1 |
| G — Preview | 0 | 2 |
| H — Test Notification | 1 (DTO) | 2 |
| I — PlatformMail | 1 (constant) | 2 |
| J — Execution Log | 0 | 2 |
| K — Dashboard | 2 (service + module) | 2 |
| **Total** | **9** | **27** |
