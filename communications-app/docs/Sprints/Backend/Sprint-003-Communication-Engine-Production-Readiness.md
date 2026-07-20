# Sprint 003 — Communication Engine: Production Readiness

> Based on: DEC-017, DEC-018, DEC-016, DEC-003, Sprint-002 completion state.
> Status: Planning — no code written yet.
> Date: 2026-06-26

---

## Executive Summary

Sprint 002 built the communication engine's infrastructure: provisioning, execution logging, canonical key resolution, the rendering pipeline, and the notification dispatch path. The engine is architecturally complete.

Sprint 003 makes the engine **usable**. The objective is to expose everything that already exists through clean, well-scoped APIs and to deliver the frontend workflows that enable a company to go from zero to sending real notifications without manual database intervention.

The sprint does **not** add new infrastructure. It closes the gaps between what the engine can do and what users and future microservices can actually reach.

---

## 1. Goals

**Primary goal:** A company owner or admin must be able to complete the entire communication setup workflow described in DEC-016 — My Company → Theme → Enabled Providers → Credentials → Domains → Templates → Events → Test Notifications — using only the Business App UI, with no direct database or API manipulation required.

**Secondary goals:**

1. Every public API must enforce role-based access control. Company users must not need the platform API key to manage their own company's assets.
2. The execution log must be filterable and useful for diagnosing delivery failures.
3. The `PlatformMailService` hardcoded templates are replaced by the event catalogue (Sprint 002 Phase 6 deferred item).
4. The communication dashboard must surface meaningful delivery status at both platform and company level.
5. SMS and PDF preview must be as accessible as email preview.
6. The domain-to-credentials binding workflow must be actionable in the UI.

**Explicitly out of scope for Sprint 003:**
- Template versioning (DEC-017 §19 — explicitly deferred to future)
- Event versioning (DEC-017 §19 — explicitly deferred to future)
- Queue-based async dispatch (DEC-003 — deferred to Phase C)
- Import/export of default event sets
- Audit log processor (AUDIT_QUEUE has no processor — deferred)
- Any new Mongo collection beyond those listed in §7

---

## 2. Architecture

### 2.1 Current State After Sprint 002

```
POST /companies/with-owner
  → CompanyProvisioningService.provisionCompany()
        → Theme + Email Layout + PDF Layout + Security Domain + 4 Events

POST /notifications/event
  → NotificationService.notifyEvent()
        → findByCompanyAndCanonicalKey() or findByCompanyAndEventKey()
        → NotificationRenderService.renderEmail()
        → EmailChannel.sendEmail()
        → ExecutionLogService.create() (fire-and-forget)

POST /notifications/preview/event-by-key
  → NotificationRenderService.renderEmail()
  → returns { subject, html }  (no delivery, no log)
```

### 2.2 Access Control Gap

**Current:** Every communication API endpoint uses `x-api-key` (the `COMMUNICATION_API_KEY` env variable), a shared internal secret. Company users authenticate with JWT (via `GlobalAuthGuard`) but the communication endpoints do not inspect the JWT token beyond the bare `actorType` check in `CompanyController`.

**Problem:** The Business App frontend can only call communication endpoints if the Next.js server-side layer injects the internal API key. This works in a monolithic Next.js deployment but breaks if the Business App ever runs in a browser-first mode or if third-party microservices need scoped access.

**Decision for Sprint 003:** Introduce role-aware authorization middleware that accepts EITHER the `x-api-key` (existing, unchanged) OR a valid JWT token with the appropriate `role` and `companyId` claim. Endpoints that are company-scoped enforce that the JWT's `companyId` matches the requested `companyId`. Endpoints that are platform-scoped enforce `role === 'platform_admin'`.

This is additive — existing API key callers are unaffected.

### 2.3 Readiness State Model (DEC-017 §17)

DEC-017 defines two company states that are inferred, not persisted:

```
Ready for Customisation
  All provisioned assets exist (theme, layouts, domain, events).
  Preview works. Sending is blocked.

Ready for Delivery
  Ready for Customisation AND at least one enabled provider exists
  with valid credentials for the target channel.
  Sending is unblocked.
```

Sprint 003 exposes this as a computed response on a new endpoint:
```
GET /companies/:id/readiness
```

No new Mongo fields required. The readiness is computed at request time by querying the existing collections.

### 2.4 Domain → Credentials Binding Gap

After provisioning, domains have `channelsToUse: []`. The company is "Ready for Customisation" but not "Ready for Delivery". To deliver, the user must:

1. Enable a provider (create a `CompanyChannelProvider` record)
2. Add credentials (create a `ProviderCredentials` record)
3. Bind credentials to the domain channel (`PATCH /domain-catalogue/:id/credentials/:channel`)

Step 3 is the missing workflow. The API exists (`DomainCatalogueService.updateDomainCredential`) but the UI does not surface it. Sprint 003 adds both the backend convenience endpoint and the frontend binding workflow.

### 2.5 Notification Trigger Without Hardcoded Recipient

The current `POST /notifications/event` endpoint requires the caller to pass `email` or `phone` in the body. For the test workflow, this is acceptable. For production use, notification triggers typically come from business events (user registered, password reset requested) and the system resolves the recipient.

Sprint 003 introduces a `recipient` field that accepts either a direct address or a `userId` that the engine resolves to a contact. This is additive — the existing `email`/`phone` fields continue to work.

### 2.6 PlatformMailService Migration

`PlatformMailService` uses three hardcoded HTML templates:
- `invite-user.template.ts` → maps to `security.user_invitation` (platform scope)
- `reset-password.template.ts` → maps to `security.forgot_password` (platform scope)
- `verify-email.template.ts` → maps to `security.user_registered` (platform scope)

These events are not provisioned for the platform company yet (only company-scoped events were provisioned in Sprint 002). Sprint 003 provisions platform-scoped events for the platform company and migrates `PlatformMailService` to use the event catalogue.

---

## 3. Phases

Each phase is independently testable and keeps the project compiling. Phases are ordered by dependency and business impact.

---

### Phase A — Role-Based Access Control on Communication APIs

**Goal:** Company users (company_owner, company_admin) can call communication APIs using their JWT, scoped to their own company. No existing integrations break.

**Effort:** Medium (backend only)

**New files:**
```
communication/common/guards/auth-or-api-key.guard.ts
communication/common/decorators/require-company-scope.decorator.ts
```

**Modified files:**
- `communication/company/company-theme/company-theme.controller.ts` — add guard + company scope enforcement
- `communication/notifications/template/layout-templates/layout-templates.controller.ts` — same
- `communication/notifications/events/domain-catalogue/domain-catalogue.controller.ts` — same
- `communication/notifications/events/event-catalogue/event-catalogue.controller.ts` — same
- `communication/channels/company-channel-providers/company-channel-providers.controller.ts` — same
- `communication/channels/provider-credentials/provider-credentials.controller.ts` — same
- `communication/notifications/notification.controller.ts` — company scope for `/logs` endpoint

**Authorization matrix:**

| Endpoint pattern | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| `GET /companies` | ✅ All | ✅ Own | ✅ Own | ❌ | ❌ |
| `POST /companies/with-owner` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /company-themes?companyId=X` | ✅ Any | ✅ Own | ✅ Own | ✅ Own (read) | ✅ Own (read) |
| `POST /company-themes` | ✅ | ✅ Own | ✅ Own | ❌ | ❌ |
| `PATCH /company-themes/:id` | ✅ | ✅ Own | ✅ Own | ❌ | ❌ |
| `DELETE /company-themes/:id` | ✅ | ✅ Own | ❌ | ❌ | ❌ |
| `GET /layout-templates/by-company?companyId=X` | ✅ Any | ✅ Own | ✅ Own | ✅ Own (read) | ✅ Own (read) |
| `POST /layout-templates` | ✅ | ✅ Own | ✅ Own | ❌ | ❌ |
| `GET /domain-catalogue?companyId=X` | ✅ Any | ✅ Own | ✅ Own | ✅ Own (read) | ✅ Own (read) |
| `POST /domain-catalogue` | ✅ | ✅ Own | ✅ Own | ❌ | ❌ |
| `GET /event-catalogue?domainCatalogueId=X` | ✅ Any | ✅ Own | ✅ Own | ✅ Own (read) | ✅ Own (read) |
| `POST /event-catalogue` | ✅ | ✅ Own | ✅ Own | ❌ | ❌ |
| `PATCH /event-catalogue/:id` | ✅ | ✅ Own | ✅ Own | ❌ | ❌ |
| `DELETE /event-catalogue/:id` | ✅ | ✅ Own | ❌ | ❌ | ❌ |
| `GET /notifications/logs?companyId=X` | ✅ Any | ✅ Own | ✅ Own | ✅ Own (read) | ❌ |
| `POST /notifications/preview/event-by-key` | ✅ Any | ✅ Own | ✅ Own | ✅ Own | ❌ |
| `POST /notifications/event` | ✅ (API key) | — | — | — | — |
| `GET /providers` | ✅ Any | ✅ (read global) | ✅ (read global) | ✅ (read) | ✅ (read) |

**Implementation:**
The new guard `AuthOrApiKeyGuard` checks (in order):
1. Valid `x-api-key` → passes (existing behavior)
2. Valid JWT → checks role + companyId claim
3. Neither → 401

Company-scope enforcement: if JWT is present and role is not `platform_admin`, the requested `companyId` query param or body field is validated against `ctx.companyId`. Mismatches return 403.

**Risk:** Low. Additive guard — existing API key callers are unchanged.

---

### Phase B — Company Readiness API

**Goal:** Expose the DEC-017 §17 readiness model as a queryable endpoint. The frontend dashboard and setup workflow use this to guide the user.

**Effort:** Low (backend only)

**New endpoint:**
```
GET /companies/:id/readiness
```

**Response shape:**
```typescript
{
  companyId: string;
  isReadyForCustomisation: boolean;
  isReadyForDelivery: boolean;
  checks: {
    hasDefaultTheme: boolean;
    hasDefaultEmailLayout: boolean;
    hasDefaultPdfLayout: boolean;
    hasSecurityDomain: boolean;
    hasDefaultEvents: boolean;
    // Per-channel delivery readiness:
    emailChannel: {
      hasEnabledProvider: boolean;
      hasActiveCredentials: boolean;
      isReady: boolean;
    };
    smsChannel: {
      hasEnabledProvider: boolean;
      hasActiveCredentials: boolean;
      isReady: boolean;
    };
  };
}
```

**New method:** `CompanyProvisioningService.getReadinessReport(companyId)` — queries the existing collections, no new schema.

**Modified files:**
- `communication/company/company-info/company.controller.ts` — add `GET /:id/readiness`
- `communication/company/provisioning/company-provisioning.service.ts` — add `getReadinessReport()`

**Why the provisioning service:** It already knows the stable keys (default_email_layout, default_pdf_layout, security domain, default events) and the check logic is an extension of the same idempotency checks used by `provisionCompany()`.

**Delivery readiness check logic:**
1. Find all `CompanyChannelProvider` records for the company, per channel (email/sms)
2. For each active CCP, check if at least one active `ProviderCredentials` exists
3. `isReady = hasCCP && hasCredentials`

**Risk:** Very low. Read-only computation on existing data. No new Mongo collections.

---

### Phase C — Execution Log Improvements

**Goal:** Make the execution log filterable and actionable. Right now it only accepts `companyId`. Company admins need to find "why didn't the welcome email deliver to user X?"

**Effort:** Low (backend) + Low (frontend)

**Backend changes:**

**Modified endpoint:**
```
GET /notifications/logs
  ?companyId=          required
  &canonicalEventKey=  optional  e.g. security.company_user_invitation
  &channel=            optional  email | sms
  &renderStatus=       optional  success | failed
  &deliveryStatus=     optional  sent | failed | skipped | pending
  &from=               optional  ISO date
  &to=                 optional  ISO date
  &limit=              optional  default 50, max 200
  &offset=             optional  default 0
```

**New endpoint:**
```
GET /notifications/logs/:id
  → returns single ExecutionLogResponseDto
```

**Modified files:**
- `execution-log/execution-log.service.ts` — add filter params to `findAll()`; add `getById()` (already implemented in service, just needs controller exposure)
- `execution-log/execution-log.module.ts` — no change
- `notifications/notification.controller.ts` — add filter params, add `GET /logs/:id`

**New index:**
```
{ companyId: 1, deliveryStatus: 1, createdAt: -1 }
```
Add to `execution-log.schema.ts`. Already has indexes on `{ companyId, canonicalEventKey, createdAt }` and `{ deliveryStatus, createdAt }`.

**No schema changes to existing documents.**

**Frontend:**
- New "Delivery History" page in Business App (Operations section)
- Filter bar: event key, channel, status, date range
- Table: timestamp, event, channel, provider, render status, delivery status, error (if any)
- Click row → log detail panel

**Risk:** Very low. Additive filtering on an existing endpoint.

---

### Phase D — Event Content Editor (Critical Path for Usability)

**Goal:** This is the most important UX gap. The event catalogue page lists events but there is no editor for subject templates, content HTML, required/optional variables, or channel enable/disable toggles. Without this, the event catalogue is read-only for company users.

**Effort:** High (frontend), None (backend — all APIs exist)

**No backend changes required.** APIs already support:
- `PATCH /event-catalogue/:id` — updates all mutable fields
- `POST /notifications/preview/event-by-key` — live preview of rendered output

**Frontend changes:**

**A. Event list page improvement** (`portal/event-catalogue/page.tsx`)
- Add "Edit" action per event row (currently likely just a view)
- Group events by domain (domain header → event rows)
- Show channel status chips (email enabled/disabled, SMS enabled/disabled)
- Show scope badge (platform / company)

**B. New: Event detail/editor page** (`portal/event-catalogue/[eventId]/page.tsx`)
- Left panel: event metadata (key, displayName, description, eventType, scope) — read-only keys, editable display fields
- Center panel: tabbed channel editor
  - Email tab:
    - Enable/disable toggle
    - Subject field (Mustache template input with variable hints)
    - Content HTML editor (CodeMirror or Monaco with Mustache syntax highlighting)
    - Required variables list (add/remove tags)
    - Optional variables list (add/remove tags)
  - SMS tab (if applicable):
    - Enable/disable toggle
    - Content text field
    - Variables
- Right panel: Live Preview
  - Uses `POST /notifications/preview/event-by-key`
  - Mock data input (JSON editor for `data.*` variables)
  - Renders HTML preview in iframe
  - "Refresh Preview" button
- Bottom: Save / Discard actions

**Variable hints:** A set of `company.*` and `theme.*` variables auto-suggested based on the company's layout template.

**V-05 compliance check (DEC-017):** The frontend editor must warn if the content includes `<header>`, `<footer>`, or full corporate HTML structure. A backend validation should also reject content containing these tags (add to `EventCatalogueService.update()`).

**Required backend addition (V-05):**
- In `EventCatalogueService.create()` and `update()`: when `channelContent.email.content` is provided, warn if it contains `<header>`, `<footer>`, or `<html>` tags. Per DEC-017 V-05, this is a validation rule.

**Risk for V-05 addition:** Low. Additive validation. Only fires when email content is explicitly set.

---

### Phase E — Layout Template HTML Editor

**Goal:** Company users can edit their layout templates in the UI. The layout templates page exists but likely shows read-only data.

**Effort:** High (frontend), None (backend)

**No backend changes required.** APIs already support:
- `GET /layout-templates/by-company?companyId=X&includeHtml=true` — returns HTML
- `PATCH /layout-templates/:id` — saves updated HTML
- `POST /preview/layout/html` — renders layout preview

**Frontend changes:**

**A. Layout list page** (`portal/layout-templates/page.tsx`)
- Group by template type (Email / PDF)
- Show default badge
- "Edit" action per template

**B. New: Layout template editor page** (`portal/layout-templates/[templateId]/page.tsx`)
- Left: HTML editor (Monaco/CodeMirror)
  - Syntax highlighting for HTML + Mustache
  - `{{content}}` placeholder highlighted prominently (required per DEC-017 §4.3)
  - Variable reference panel: lists all valid `company.*`, `theme.*` variables
- Right: Live preview iframe
  - Uses `POST /preview/layout/html` with current HTML content
  - Renders with the company's actual theme and company data
  - Refresh on save or explicit trigger (not on every keystroke)
- Validation: if `{{content}}` is removed from the HTML, block save with clear error message

**Risk:** Low backend risk. Frontend complexity in editor integration (Monaco/CodeMirror setup).

---

### Phase F — Theme Editor

**Goal:** The DEC-016 sidebar has "Theme" as step 2 in the setup workflow. The company already has a default theme (provisioned in Sprint 002). The user needs to customize it. The `company/themes` page exists but the "Theme" setup step in the sidebar needs a single dedicated editor.

**Effort:** Medium (frontend), None (backend)

**No backend changes required.** APIs already support:
- `GET /company-themes?companyId=X` — list themes
- `GET /company-themes/:id` — single theme
- `PUT /company-themes/:id` — update theme
- `POST /company-themes` — create additional theme

**Frontend changes:**

**A. Theme editor page** (DEC-016 sidebar item 2: "Theme")
Currently at `company/themes` — this page should function as the primary theme editor.

- Show the default (active) theme as the main editing target
- Color pickers for each token (primaryColor, secondaryColor, backgroundColor, etc.)
- Font family selector or free-text input
- Font size / weight inputs
- Live preview panel: shows a sample email layout rendering with the current color/font values applied
  - Uses `POST /preview/layout/html` with the company's default email layout
  - Theme values injected as preview context via a new query param or request field

**Required backend addition for theme preview context:**

Currently `POST /preview/layout/html` resolves theme from the company's default. To preview unsaved theme changes, add an optional `themeOverride` body field:

```typescript
// preview-layout.dto.ts
themeOverride?: Partial<ThemeTokens>; // applies override tokens without saving
```

The `PreviewService.previewLayoutHtml()` merges `themeOverride` with the resolved theme before composition.

**B. Multiple themes (advanced):** The company might have multiple themes (default + drafts). A theme selector dropdown lets the user switch between themes without making one the default until they're ready.

---

### Phase G — Domain Credential Binding Workflow

**Goal:** Close the critical gap between "credentials configured" and "notifications delivered". After provisioning, the security domain has `channelsToUse: []`. Users cannot send notifications until credentials are bound to domains.

**Effort:** Low (backend), Medium (frontend)

**Backend changes:**

**New convenience endpoint:**
```
GET /domain-catalogue/by-company-domain?companyId=X&domainKey=security
```
Returns the domain including its current `channelsToUse` and resolved credential info. Avoids requiring the frontend to know the domain's ObjectId upfront.

Currently `getByCompanyAndDomainKey` exists in the service but is not exposed via HTTP.

**Modified files:**
- `domain-catalogue.controller.ts` — add `GET /by-company-domain` route

**New convenience endpoint (delivery status):**
```
GET /domain-catalogue/:id/delivery-status
```
Returns whether the domain can currently deliver on each channel (has active credential bound, CCP is active, etc.).

**Frontend changes:**

**A. Domain list page** (`portal/domain-catalogue/page.tsx`)
- Show channel delivery status per domain (green checkmark = bound + active credentials, orange = bound but credential issue, red = not bound)
- "Configure Delivery" action per domain

**B. Domain detail / credential binding panel**
- For each channel the domain could use (email, SMS):
  - Current bound credential (or "Not configured" state)
  - Dropdown: select from available active credentials for that channel
  - "Assign" button → calls `PATCH /domain-catalogue/:id/credentials/:channel`
  - "Unassign" button → calls `PATCH /domain-catalogue/:id` to remove from channelsToUse

**C. Guided setup callout:**
On the Domains page, if any domain has unbound channels, show a callout: "Your domains are not configured for delivery. Assign credentials to enable notification sending."

---

### Phase H — Test Notification Workflow (DEC-016 Step 8)

**Goal:** The "Test Notifications" step in the Business App sidebar (DEC-016 step 8) must work end-to-end. The page currently exists at `portal/notifications/test`.

**Effort:** Low (backend), Medium (frontend)

**Backend changes:**

Currently `POST /notifications/event` sends a real notification. For testing, the company admin needs to:
1. Choose an event by canonical key
2. Fill in variables (or use defaults)
3. Specify a test recipient email/phone
4. Send and see the result immediately

The existing endpoint already supports this. The only addition needed:

**New endpoint variant for test dispatch (optional but cleaner):**
```
POST /notifications/test
{
  companyId: string;
  canonicalEventKey: string;
  testEmail?: string;       // override recipient
  testPhone?: string;       // override recipient
  data?: Record<string, any>;
}
```

This is a thin wrapper over `POST /notifications/event` that:
- Validates access (company_owner or company_admin only)
- Injects `testEmail`/`testPhone` as the recipient
- Returns the full execution result including which steps succeeded/failed
- Does NOT write an execution log (or writes one with `deliveryStatus: 'test'`)

Alternatively, `POST /notifications/event` can be used directly with the company's JWT and explicit email override.

**Frontend:**

The `portal/notifications/test` page should have:
- Step 1: Select canonical event (dropdown populated from `GET /event-catalogue`)
- Step 2: Fill in required variables (form driven by event's `requiredVariables`)
- Step 3: Enter test recipient email/phone
- Step 4: "Send Test" button
- Result panel: shows channel results (success/failure per channel), rendered subject/HTML preview, delivery status

---

### Phase I — Platform Company Provisioning + PlatformMailService Migration

**Goal:** Complete the Sprint 002 Phase 6 deferred item. Replace `PlatformMailService` hardcoded templates with the event catalogue.

**Effort:** Medium (backend), None (frontend)

**Part 1: Platform company event provisioning**

Sprint 002 provisioned only company-scoped events. The platform company (the company with `isPlatformCompany: true`) needs platform-scoped events:

| Event key | Scope | Used by |
|---|---|---|
| `user_registered` | platform | Email verification flow |
| `welcome_message` | platform | Post-activation welcome |
| `password_changed` | platform | Platform user password changed |
| `forgot_password` | platform | Platform password reset |
| `user_invitation` | platform | Platform admin invites another platform admin |

**New constant:** `DEFAULT_PLATFORM_EVENTS` in `company/provisioning/constants/`

**Modified:** `CompanyProvisioningService.provisionCompany()` — when `company.isPlatformCompany === true`, also provision platform-scoped events.

The `POST /companies/:id/provision` repair endpoint handles both cases.

**Part 2: PlatformMailService migration**

`PlatformMailService` currently calls hardcoded template functions. After platform events are provisioned:

1. `trySendVerifyEmail()` → trigger `security.user_registered` via `NotificationService`
2. `trySendResetPassword()` → trigger `security.forgot_password`
3. `trySendTempPasswordInvitation()` → trigger `security.user_invitation`

**Implementation approach:**

`PlatformMailService` gains a dependency on `NotificationService`. When the platform company's event catalogue is ready, all three methods delegate to `NotificationService.notifyEvent()`. The hardcoded template files (`invite-user.template.ts`, `reset-password.template.ts`, `verify-email.template.ts`) are retained as fallback for the window before migration and then removed.

**Compatibility requirement:** Provisioning must run for the platform company before this migration activates. A feature flag or env variable (`PLATFORM_MAIL_USE_EVENT_CATALOGUE=true`) gates the new path in `PlatformMailService`. The default remains the hardcoded path until the flag is explicitly enabled.

**Risk:** Medium. This touches auth flows (password reset, invite). Must be tested with real SMTP before flag is enabled. The fallback to hardcoded templates must be preserved until confident.

---

### Phase J — Multi-Channel Preview

**Goal:** SMS and PDF preview by canonical key (analogous to the email preview added in Sprint 002 Phase 5).

**Effort:** Low (backend), Low (frontend)

**New endpoints:**

```
POST /notifications/preview/sms-by-key
{
  companyId: string;
  canonicalEventKey: string;
  data?: Record<string, any>;
}
→ { text: string }

POST /notifications/preview/pdf-by-key
{
  companyId: string;
  canonicalEventKey: string;
  data?: Record<string, any>;
}
→ { html: string }  // or binary PDF — TBD
```

**Backend:**
- `NotificationRenderService.renderSms()` — analogous to `renderEmail()`, no layout (SMS has no layout wrapper)
- `NotificationRenderService.renderPdf()` — uses PDF layout template + event content + compose
- Both methods exposed via `NotificationController` or `PreviewController`

**Decision point:** PDF preview returns HTML (same as email) or actual binary PDF? Given `PreviewService.previewReportPdf()` returns a Buffer, the PDF endpoint should return binary PDF with `Content-Type: application/pdf`. The canonical key variant adds convenience without changing this pattern.

---

### Phase K — Communication Dashboard (Platform Admin + Business App)

**Goal:** Both dashboards need meaningful communication metrics. Currently the dashboard pages are stubs.

**Effort:** Medium (backend), Medium (frontend)

**New endpoint — Business App dashboard:**
```
GET /companies/:id/communication-dashboard
{
  summary: {
    totalNotificationsSent: number;   // execution logs, deliveryStatus: sent
    totalNotificationsFailed: number; // deliveryStatus: failed
    lastNotificationAt: string | null;
    readiness: ReadinessReport;       // same shape as Phase B
  };
  recentLogs: ExecutionLogResponseDto[]; // last 10
  topEvents: Array<{
    canonicalEventKey: string;
    sentCount: number;
    failedCount: number;
  }>;
}
```

**New endpoint — Platform Admin dashboard:**
```
GET /platform/communication-summary
{
  totalCompanies: number;
  companiesReadyForDelivery: number;
  companiesReadyForCustomisationOnly: number;
  notProvisioned: number;
  totalNotificationsSent24h: number;
  totalNotificationsFailed24h: number;
  topProviders: Array<{ providerKey: string; sentCount: number }>;
}
```

**Implementation:** Both endpoints aggregate from `notification_execution_logs` and existing company/channel collections. Use MongoDB aggregation pipelines. No new schema.

**Frontend:** Replace stub dashboard pages with metric cards + recent activity table + readiness status.

---

## 4. Dependencies

### Between phases

```
Phase A (Access Control)   ← Prerequisite for all company-facing UI work
      ↓
Phase B (Readiness API)    ← Can start in parallel with A
Phase C (Execution Log)    ← Can start in parallel with A, B
      ↓
Phase D (Event Editor)     ← Requires Phase A for auth; Phase C optional
Phase E (Layout Editor)    ← Requires Phase A
Phase F (Theme Editor)     ← Requires Phase A
Phase G (Domain Binding)   ← Requires Phase A; logically after Phases E, F
Phase H (Test Workflow)    ← Requires Phase G (domain must have credentials bound)
      ↓
Phase I (PlatformMail)     ← Requires Phase H (provisioning + notification dispatch tested)
Phase J (Multi-Preview)    ← Independent; no phase dependency
Phase K (Dashboard)        ← Requires Phase B + Phase C
```

### External dependencies

- **MongoDB replica set** — already required by `CompanyThemeService` which uses sessions/transactions. No new requirement.
- **Redis** — already present for BullMQ (queues unused but registered). No new requirement.
- **SMTP** — Phase I requires the platform company's SMTP to be configured in the event catalogue before migration.

---

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase I (PlatformMail migration) breaks auth flows | Medium | High | Feature-flagged (`PLATFORM_MAIL_USE_EVENT_CATALOGUE`). Hardcoded fallback retained. Only activated after end-to-end test in staging. |
| Phase D event editor overwrites production event content | Medium | Medium | Confirm dialog before save. Audit trail via `updatedAt`. Consider soft-delete or manual version snapshot before edit. |
| Phase E layout editor introduces invalid `{{content}}`-free HTML | Low | Medium | Real-time validation in editor. Blocked at save if `{{content}}` is missing. Backend guard already enforces this. |
| Phase A access control breaks existing API key callers | Low | High | Guard is additive — API key path is unchanged. Integration tests added for both auth paths per endpoint. |
| Phase G domain credential binding disrupts live notifications | Low | Medium | Binding to a new credential is additive; it does not delete the old one. Notifications in flight use the existing credential. |
| Phase K dashboard aggregation pipeline is slow on large datasets | Medium | Low | Time-box aggregation to 24h / 7d windows. Add TTL index on logs for old records. Cap `recentLogs` at 10 entries. |

---

## 6. API Changes

### New endpoints

| Method | Path | Phase | Purpose |
|---|---|---|---|
| `GET` | `/companies/:id/readiness` | B | DEC-017 §17 readiness states |
| `GET` | `/companies/:id/communication-dashboard` | K | Business App dashboard data |
| `GET` | `/platform/communication-summary` | K | Platform Admin dashboard data |
| `GET` | `/notifications/logs/:id` | C | Single log entry |
| `GET` | `/domain-catalogue/by-company-domain` | G | Domain lookup by company + domainKey |
| `GET` | `/domain-catalogue/:id/delivery-status` | G | Per-channel delivery readiness of a domain |
| `POST` | `/notifications/test` | H | Test notification dispatch (company-scoped) |
| `POST` | `/notifications/preview/sms-by-key` | J | SMS preview by canonical key |
| `POST` | `/notifications/preview/pdf-by-key` | J | PDF preview by canonical key |

### Modified endpoints

| Method | Path | Phase | Change |
|---|---|---|---|
| `GET` | `/notifications/logs` | C | Add filter params: `canonicalEventKey`, `channel`, `renderStatus`, `deliveryStatus`, `from`, `to` |
| `POST` | `/preview/layout/html` | F | Add optional `themeOverride` body field |
| `PATCH` | `/event-catalogue/:id` | D | Add V-05 validation (reject `<header>`/`<footer>` in email content) |

### No breaking changes

All existing endpoints retain their current request/response shapes. New query params are optional. New response fields are additive.

---

## 7. Database Changes

### New index — `notification_execution_logs`

```typescript
{ companyId: 1, deliveryStatus: 1, createdAt: -1 }
// Name: idx_execlog_company_delivery_created
```

Required by Phase C filter queries on `deliveryStatus`. Already has:
- `{ companyId: 1, createdAt: -1 }`
- `{ companyId: 1, canonicalEventKey: 1, createdAt: -1 }`
- `{ deliveryStatus: 1, createdAt: -1 }`

### Optional TTL index — `notification_execution_logs`

For high-volume production environments, execution logs may be retained for 90 days only:

```typescript
{ createdAt: 1 }, { expireAfterSeconds: 7776000 /* 90 days */ }
// Name: ttl_execlog_90d
```

This is opt-in (env variable `EXECUTION_LOG_TTL_DAYS`). Default: no expiry in Sprint 003.

### No new collections

No new Mongo collections are introduced in Sprint 003. All new functionality works against existing collections.

---

## 8. Frontend Impact

### Pages to build or complete

| Page | Route | DEC-016 Section | Status |
|---|---|---|---|
| Dashboard (Business App) | `(portal)/dashboard` | Overview | Needs metric cards from Phase K |
| Theme editor | `(portal)/company/themes` | Setup step 2 | Enhance with color pickers + preview |
| Domain list + delivery status | `(portal)/domain-catalogue` | Setup step 5 | Add delivery status badges + binding action |
| Domain credential binding | `(portal)/domain-catalogue/[id]/credentials` | Setup step 5 | New page |
| Layout template editor | `(portal)/layout-templates/[id]` | Setup step 6 | New editor page |
| Event list (enhanced) | `(portal)/event-catalogue` | Setup step 7 | Group by domain, show channel status |
| Event content editor | `(portal)/event-catalogue/[id]` | Setup step 7 | New editor page — biggest gap |
| Test Notifications | `(portal)/notifications/test` | Step 8 | Complete the stub |
| Delivery History | `(portal)/notifications/history` | Operations | New page |

### New API hooks required

| Hook | Endpoint(s) | Phase |
|---|---|---|
| `useCompanyReadiness` | `GET /companies/:id/readiness` | B |
| `useExecutionLogs` (extend) | `GET /notifications/logs` with filters | C |
| `useExecutionLog` | `GET /notifications/logs/:id` | C |
| `useNotificationPreview` | `POST /notifications/preview/event-by-key` | D |
| `useUpdateEventContent` | `PATCH /event-catalogue/:id` | D |
| `useDomainDeliveryStatus` | `GET /domain-catalogue/:id/delivery-status` | G |
| `useBindDomainCredential` | `PATCH /domain-catalogue/:id/credentials/:channel` | G |
| `useTestNotification` | `POST /notifications/test` | H |
| `useCommunicationDashboard` | `GET /companies/:id/communication-dashboard` | K |

### Design system compliance

All new pages must follow DEC-015:
- List pages: DataGrid (desktop) + mobile card layout
- Filter area: `<Paper variant="outlined">` wrapper
- Empty states: shared `EmptyState` component
- Reference implementation: `app/(portal)/users/page.tsx`

---

## 9. Backward Compatibility

### API key callers

All existing `x-api-key` callers are unaffected by Phase A. The new guard is additive. No endpoint changes its current auth behavior.

### Response shapes

No existing response fields are removed or renamed. New fields are additive. Consumers that ignore unknown fields (standard JSON consumption) see no change.

### NotifyEventDto

The existing `email`, `phone`, `variables`, `payload` fields are preserved exactly. The new `recipient` field (Phase H) is optional and has no effect when absent.

### CompanyController.createWithOwner

The response already includes `provisioning: ProvisioningReportDto`. No change.

### PlatformMailService (Phase I)

The feature flag `PLATFORM_MAIL_USE_EVENT_CATALOGUE` defaults to `false`. All existing behavior is preserved until the flag is explicitly enabled after validation.

### Layout template validation (Phase E)

The `{{content}}` guard already exists (Sprint 002 Phase 1). The guard is not changed in Sprint 003. The editor UI enforces the same constraint in the frontend before save.

---

## 10. Testing Strategy

### Phase A — Access control

For every modified endpoint, two test cases per auth method:
1. Valid API key → 200/201
2. Valid JWT with correct role and companyId → 200/201
3. Valid JWT with wrong companyId → 403
4. Valid JWT with insufficient role → 403
5. No auth → 401

### Phase B — Readiness API

- Fresh company (just provisioned) → `isReadyForCustomisation: true`, `isReadyForDelivery: false`
- Company with enabled provider + credentials → `isReadyForDelivery: true`
- Company with no provisioning → `isReadyForCustomisation: false`
- Company with inactive provider → `isReadyForDelivery: false`

### Phase C — Execution log filtering

- Filter by `deliveryStatus: failed` → returns only failed entries
- Filter by `canonicalEventKey: security.company_user_invitation` → returns only that event's logs
- Filter by `from` / `to` date range → bounded results
- Combined filters → intersection applied
- `GET /logs/:id` with valid ID → 200
- `GET /logs/:id` with wrong companyId → 403

### Phase D — Event editor / V-05 validation

- `PATCH /event-catalogue/:id` with `channelContent.email.content` containing `<header>` → 400
- `PATCH /event-catalogue/:id` with `channelContent.email.content` containing `<footer>` → 400
- `PATCH /event-catalogue/:id` with clean HTML body → 200
- `PATCH /event-catalogue/:id` with empty content → 200 (allowed — event can have no content defined yet)

### Phase G — Domain credential binding

- `PATCH /domain-catalogue/:id/credentials/email` with active credential → 200, domain `channelsToUse` updated
- `PATCH /domain-catalogue/:id/credentials/email` with credential from different company → 400
- `PATCH /domain-catalogue/:id/credentials/email` with inactive credential → 400
- After binding, `GET /domain-catalogue/:id/delivery-status` → `emailChannel.isReady: true`

### Phase I — PlatformMailService migration

- With flag off: hardcoded template used (existing behavior)
- With flag on: event catalogue resolved, NotificationService called
- With flag on, platform company not provisioned: graceful fallback to hardcoded template with warning log
- Password reset flow: end-to-end test with real SMTP in staging

### Regression

After each phase, run the existing notification dispatch test (if any) and verify:
- `POST /notifications/event` still returns 200/207
- `POST /notifications/preview/event-by-key` still returns `{ subject, html }`
- `GET /notifications/logs` still returns paginated results

---

## Appendix A: Areas Evaluated

| Area | Sprint 003 Decision |
|---|---|
| Event Catalogue management | Phase D — event content editor; V-05 validation added |
| Theme management | Phase F — color picker + preview; existing APIs sufficient |
| Layout management | Phase E — HTML editor with live preview |
| Company provisioning improvements | Phase B (readiness API); Phase I (platform events) |
| Preview improvements | Phase J (SMS + PDF by canonical key); Phase F (theme override in layout preview) |
| Provider management | Existing APIs sufficient; exposure via Phase A auth |
| Provider credentials | Existing APIs sufficient; exposure via Phase A auth |
| Provider enable/disable | Existing `CompanyChannelProvider` CRUD sufficient; Phase A auth unlocks it |
| Communication dashboard | Phase K — metrics aggregation from execution logs |
| Execution log improvements | Phase C — filtering, single entry, access control |
| Template versioning | **Deferred** — DEC-017 §19 explicitly marks as future architecture |
| Event versioning | **Deferred** — DEC-017 §19 explicitly marks as future architecture |
| Company customization workflow | Phases D + E + F + G + H compose the full workflow end to end |
| Import/export defaults | **Deferred** — useful but not blocking production use |
| Multi-channel preview | Phase J |
| PDF preview by canonical key | Phase J |
| SMS preview by canonical key | Phase J |
| Future queue integration | **Deferred** — DEC-003 Phase C; not required for production at current volume |
| Audit improvements | **Deferred** — AUDIT_QUEUE has no processor; blocked until DEC-003 Phase C |

---

## Appendix B: File Count Estimate

| Phase | New Files | Modified Files |
|---|---|---|
| A (Access Control) | 2 | 6 |
| B (Readiness API) | 0 | 2 |
| C (Execution Log) | 0 | 2 |
| D (Event Editor) | 2 | 2 (backend V-05); 4+ (frontend) |
| E (Layout Editor) | 2 (frontend) | 1 (backend themeOverride) |
| F (Theme Editor) | 1 (frontend) | 1 (backend themeOverride) |
| G (Domain Binding) | 2 (frontend) | 1 (backend route) |
| H (Test Workflow) | 2 | 2 |
| I (PlatformMail) | 1 (constant) | 3 (provisioning + mail service) |
| J (Multi-Preview) | 2 | 2 |
| K (Dashboard) | 2 | 2 (frontend) |
| **Total** | **~16** | **~24** |

---

## Appendix C: Sprint 002 Compliance Verification

Before Sprint 003 begins, verify that all Sprint 002 deliverables are functional in the running backend:

| Check | How to verify |
|---|---|
| Provisioning runs on company creation | `POST /companies/with-owner` response includes `provisioning.created.*: true` |
| Execution log writes on dispatch | `POST /notifications/event` → `GET /notifications/logs` shows entry |
| Canonical key resolution | `POST /notifications/event` with `event: "security.company_user_invitation"` → resolves |
| Preview by canonical key | `POST /notifications/preview/event-by-key` → returns HTML + subject |
| `{{content}}` guard | `POST /layout-templates` without `{{content}}` → 400 |
| Repair endpoint | `POST /companies/:id/provision` on provisioned company → all `skipped: true` |
