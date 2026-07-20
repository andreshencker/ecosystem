---
id: DEC-018
title: Communication Asset Ownership and Bounded Context Boundaries
status: Accepted
created: 2026-06-25
tags: [backend, architecture, bounded-context, provisioning, notification-engine, ownership]
---

# DEC-018 — Communication Asset Ownership and Bounded Context Boundaries

## 1. Context

DEC-017 defines the company provisioning lifecycle, default events, layout composition model, and notification rendering flow. It answers the question **what** is created and **how** notifications are composed.

A gap remains: DEC-017 does not explicitly define **who owns each asset**, **which service may create or mutate it**, and **which boundaries must not be crossed**. Without that definition, implementations risk:

- Provisioning code that triggers notification dispatch
- Notification Engine code that creates or repairs default assets
- Services that read and write assets outside their bounded context
- Execution logs that lack the information needed for audit or replay
- Event identity that is ambiguous (same `eventKey` in different domains)

This decision resolves those gaps by defining strict ownership boundaries between Company Provisioning and the Notification Engine as two separate bounded contexts.

---

## 2. Core Decision

There are exactly two bounded contexts responsible for communication assets:

| Bounded Context | Triggered by | Responsibility |
|---|---|---|
| **Company Provisioning** | Company creation (or re-provisioning) | Create default communication assets and make the company ready for customisation |
| **Notification Engine** | A business action that raises an event | Render and deliver a notification using existing assets |

These two contexts are **strictly separated**:

- **Provisioning creates assets. Notification Engine uses assets.**
- **Provisioning must never send notifications.**
- **Notification Engine must never create or repair default company assets.**

Any code that violates this boundary is non-compliant with this decision regardless of the reason given.

---

## 3. Company Provisioning — Bounded Context

### 3.1 When It Runs

Company Provisioning runs when a company record is created by a Platform Admin. It may also be triggered explicitly for re-provisioning (to repair missing default assets without creating duplicates).

### 3.2 What It Creates

| Asset | Notes |
|---|---|
| Default Theme | Platform brand tokens as starting point; company replaces with own colors |
| Default Email Layout Template | Corporate wrapper with `{{content}}` placeholder |
| Default PDF Layout Template | Corporate wrapper with `{{content}}` placeholder |
| Default Security Domain | `domainKey: security`, category: `system_notifications` |
| Default Security Events | Platform events and company-scoped events as defined in DEC-017 §6 |
| Variable definitions | `requiredVariables` and `optionalVariables` on each event |
| Asset relationships | Event → Domain, Template → Company, Theme → Company |

### 3.3 What It Does NOT Create

The following must never be created by provisioning:

- Enabled Providers (channel → provider assignments)
- Provider Credentials (SMTP, API Key, OAuth, Access Keys)
- OAuth tokens
- Real external sending domains (DKIM/SPF/MX records)

### 3.4 What It Does NOT Do

Provisioning must never:

- Render notification payloads
- Send notifications to any provider
- Call any external messaging API
- Create execution logs
- Interact with the Notification Engine in any way

> **Provisioning is a write-only bootstrap operation. It creates a starting catalog and exits.**

---

## 4. Notification Engine — Bounded Context

### 4.1 When It Runs

The Notification Engine runs when a business action raises an event. It receives a canonical event identity and a runtime data payload, and it is responsible for producing and dispatching the final notification.

### 4.2 Full Execution Flow

```
Business Action
      ↓
Raise Event
  (canonicalEventKey + companyId + data payload)
      ↓
──────────────────────────
  RESOLUTION PHASE
──────────────────────────
Resolve Company
      ↓
Resolve Domain         (from canonicalEventKey domain prefix)
      ↓
Resolve Event          (from domain + eventKey)
      ↓
Resolve Layout Template  (company default for channel/templateType)
      ↓
Resolve Theme            (company active theme)
      ↓
──────────────────────────
  RENDERING PHASE
──────────────────────────
Inject event content → {{content}}
Render all variables:
  company.* · theme.* · data.* · meta.*
      ↓
Final payload produced
(HTML / PDF / SMS / push body)
      ↓
──────────────────────────
  DELIVERY PHASE
──────────────────────────
Resolve Enabled Provider
      ↓
Resolve Provider Credentials
      ↓
Send Notification via Provider
      ↓
──────────────────────────
  LOGGING PHASE
──────────────────────────
Store Execution Log
```

### 4.3 What It Does NOT Do

The Notification Engine must never:

- Create default themes, layout templates, domains, or events
- Repair missing provisioning assets
- Run provisioning on behalf of a company
- Expose a "send template" endpoint that bypasses event resolution

---

## 5. Asset Ownership Matrix

The table below defines the owning service, creating service, and consuming services for every communication asset in the system.

| Asset | Owning Service | Created By | May Mutate | Used By | Notes |
|---|---|---|---|---|---|
| **Company** | Company Service | Company Service | Company Service | All services | Root aggregate. `companyId` is the partition key for all scoped assets. |
| **Theme** | Theme Service | Company Provisioning (default) · Theme Service (user edits) | Theme Service | Notification Engine (render) · Frontend (preview) | One default theme per company; user may create additional themes. |
| **Layout Template** | Layout Template Service | Company Provisioning (default) · Layout Template Service (user edits) | Layout Template Service | Notification Engine (render) · Frontend (preview) | Must contain `{{content}}`; validated on create and update. |
| **Domain** | Domain Catalogue Service | Company Provisioning (default) · Domain Catalogue Service (user additions) | Domain Catalogue Service | Notification Engine (resolve) · Frontend (UI) | `domainKey` is stable; `displayName` is mutable. |
| **Event** | Event Catalogue Service | Company Provisioning (default) · Event Catalogue Service (user additions) | Event Catalogue Service | Notification Engine (resolve) · Frontend (preview) | `eventKey` is stable. Subject, content, and variables are mutable. |
| **Platform Provider** | Platform Provider Service | Platform Admin action | Platform Provider Service | Company Provider Service (enable) · Notification Engine (delivery) | Global catalog of available providers (SendGrid, Twilio, etc.). |
| **Enabled Provider** | Company Provider Service | User action (explicit) | Company Provider Service | Notification Engine (delivery resolution) | Binds a company to a specific global provider for a given channel. Never auto-provisioned. |
| **Provider Credentials** | Provider Credentials Service | User action (explicit) | Provider Credentials Service | Notification Engine (delivery) | Authentication secrets for the enabled provider. Never auto-provisioned. |
| **Rendered Payload** | Notification Engine | Notification Engine | — (immutable after creation) | Execution Log · Provider delivery | The fully composed HTML/PDF/SMS document. Produced once per notification attempt. |
| **Execution Log** | Notification Engine | Notification Engine | Notification Engine (delivery status update) | Support tooling · Audit Logs · Frontend (delivery status) | Must capture all resolution identifiers. See §8 for required fields. |

---

## 6. Stable Event Identity

### 6.1 The Identity Problem

When the Notification Engine resolves an event, it needs an unambiguous identity that does not collide across domains. A bare `eventKey` such as `user_invitation` is insufficient — two different domains could each have an event with that key.

### 6.2 Canonical Event Key

The canonical identity of an event is the **composite of `domainKey` and `eventKey`**, separated by a dot:

```
canonicalEventKey = domainKey + "." + eventKey
```

**Examples:**

| domainKey | eventKey | canonicalEventKey | Scope |
|---|---|---|---|
| `security` | `company_verify_email` | `security.company_verify_email` | All companies |
| `security` | `company_user_invitation` | `security.company_user_invitation` | All companies |
| `security` | `company_password_changed` | `security.company_password_changed` | All companies |
| `security` | `company_forgot_password` | `security.company_forgot_password` | All companies |
| `security` | `company_welcome_message` | `security.company_welcome_message` | All companies |
| `security` | `platform_admin_invitation` | `security.platform_admin_invitation` | Platform company only |
| `security` | `platform_password_changed` | `security.platform_password_changed` | Platform company only |
| `security` | `platform_forgot_password` | `security.platform_forgot_password` | Platform company only |

> **Superseded keys (do not use):** `user_registered`, `welcome_message`, `password_changed`, `forgot_password`, `user_invitation` — these were used in earlier versions and have been replaced by the correctly-named events above. See DEC-017 §6 for the authoritative event catalog.

### 6.3 Implementation Note

If the current data model stores only `eventKey` without a domain prefix (e.g. `company_user_invitation` rather than `security.company_user_invitation`), the canonical identity is still computed at runtime as:

```
canonicalEventKey = event.domain.domainKey + "." + event.eventKey
```

The `canonicalEventKey` must be recorded in every execution log even if the storage layer keeps `domainKey` and `eventKey` as separate indexed fields.

### 6.4 Mutability Rules

| Field | Mutable | Identity | Notes |
|---|---|---|---|
| `eventKey` | ❌ No | ✅ Yes | The stable identifier. Changing it would break the Notification Engine and all execution logs. |
| `domainKey` | ❌ No | ✅ Yes | Same constraint — part of the canonical identity. |
| `displayName` | ✅ Yes | ❌ No | UI label only; has no effect on engine resolution. |
| `subject` | ✅ Yes | ❌ No | Content; changes apply to future notifications only. |
| `content` | ✅ Yes | ❌ No | Message body; changes apply to future notifications only. |
| `requiredVariables` | ✅ Yes | ❌ No | Variable contract; validated at render time. |
| `optionalVariables` | ✅ Yes | ❌ No | Variable contract; not validated. |

---

## 7. No Cross-Boundary Writes

The following rules are absolute. No exception is permitted without a superseding decision record.

### Company Provisioning — permitted writes

| Action | Permitted |
|---|---|
| Create default Theme for a new company | ✅ Yes |
| Create default Layout Templates for a new company | ✅ Yes |
| Create default Domain(s) for a new company | ✅ Yes |
| Create default Events for a new company | ✅ Yes |
| Re-create a missing default asset (repair) | ✅ Yes |
| Overwrite a user-customised asset | ❌ No |
| Create Enabled Providers | ❌ No |
| Create Provider Credentials | ❌ No |
| Send any notification | ❌ No |
| Write to Execution Log | ❌ No |

### Notification Engine — permitted writes

| Action | Permitted |
|---|---|
| Read any provisioned asset (Theme, Layout, Domain, Event) | ✅ Yes |
| Create a Rendered Payload (internal, during composition) | ✅ Yes |
| Write an Execution Log entry | ✅ Yes |
| Update delivery status on an existing Execution Log entry | ✅ Yes |
| Create default Themes, Layouts, Domains, or Events | ❌ No |
| Repair missing provisioning assets | ❌ No |
| Create or modify Provider Credentials | ❌ No |

### Provider Delivery Services — permitted writes

| Action | Permitted |
|---|---|
| Update delivery status on Execution Log | ✅ Yes |
| Update provider-side message ID on Execution Log | ✅ Yes |
| Modify Event definitions | ❌ No |
| Modify Layout Templates | ❌ No |
| Modify Theme | ❌ No |

---

## 8. Rendering vs Delivery

These are two independent phases that must not be conflated in implementation.

### 8.1 Rendering Phase

| Consumes | Produces |
|---|---|
| Company (identity, branding fields) | Final notification payload |
| Theme (colors, typography) | |
| Layout Template (structure, `{{content}}`) | |
| Event (subject, body, variables) | |
| Runtime data (`data.*`, `meta.*`) | |

Rendering has **no external dependencies beyond the database**. It does not call any provider. It does not require credentials. It can succeed when no provider is configured.

### 8.2 Delivery Phase

| Consumes | Produces |
|---|---|
| Rendered payload (from rendering phase) | Delivery status |
| Enabled Provider | Provider-side message ID |
| Provider Credentials | Execution log entry |

Delivery requires external infrastructure. It can fail due to network issues, credential expiry, or provider downtime without affecting the rendered payload.

### 8.3 Separation Consequences

| Scenario | Rendering | Delivery | Result |
|---|---|---|---|
| Template preview in UI | ✅ Runs | ❌ Skipped | Fully composed HTML without dispatch |
| Event content preview in UI | ✅ Runs | ❌ Skipped | Fully composed email body preview |
| No provider configured | ✅ Runs | ❌ Blocked | Preview works; sending blocked |
| Provider configured, credentials expired | ✅ Runs | ❌ Fails | Payload composed; delivery error logged |
| Full production send | ✅ Runs | ✅ Runs | Notification dispatched; execution logged |

> **Rendering can succeed even when delivery cannot start. Preview depends only on rendering.**

---

## 9. Frontend Implications

### 9.1 Post-Provisioning UI State

Immediately after company creation, the Business App must show provisioned defaults in the relevant sections. No section covered by provisioning should appear empty.

| Section (DEC-016 sidebar) | State after provisioning | User can edit |
|---|---|---|
| Theme | Default theme present | ✅ Yes |
| Templates | Default email + PDF layouts present | ✅ Yes |
| Domains | `security` domain present | ✅ Yes |
| Events | Default security events present | ✅ Yes |
| Enabled Providers | Empty | ✅ Yes (required for delivery) |
| Credentials | Empty | ✅ Yes (required for delivery) |

### 9.2 Two UI States

The Business App must distinguish between two company readiness states and surface them to the user:

**Ready for Customisation** — all provisioned assets are present and editable. The user can preview notifications. The user cannot yet send real notifications.

**Ready for Delivery** — all provisioned assets are present AND at least one enabled provider with valid credentials exists for the target channel. The user can send real notifications.

The UI must **not** imply the company is ready to send until the delivery configuration is complete. A clear status indicator (or the absence of a "Send" capability on events) should communicate the current state.

### 9.3 No Delivery Capability Without Provider Configuration

The Business App must not expose a "Send notification" action for any event until:

1. At least one enabled provider exists for the event's channel
2. Valid credentials exist for that provider

Attempting to send before these conditions are met results in a clear message, not a silent failure.

---

## 10. Implementation Rules

### 10.1 Company Provisioning Rules

- Company creation must trigger Company Provisioning synchronously or via a reliable async job — but provisioning must complete before the company owner is given access to the Business App
- Provisioning must be idempotent (create if missing, skip if present — never update)
- Provisioning must use stable keys (see §6) so that re-running does not create duplicates
- Provisioning must be safe to run in isolation (e.g. via a CLI command or admin endpoint) for repair scenarios
- Provisioning must not trigger any notification dispatch

### 10.2 Notification Engine Rules

- The Notification Engine must require a `canonicalEventKey` (or `domainKey` + `eventKey` pair) for every notification request
- Direct "send template" flows — where a template ID is passed without an event — are forbidden
- Rendering must complete before delivery begins; a failed render must abort the delivery phase
- The Notification Engine must not call any provisioning logic

### 10.3 Execution Log — Required Fields

Every execution log entry must record the following fields at creation:

| Field | Type | Notes |
|---|---|---|
| `companyId` | string | Company that owns this notification |
| `domainKey` | string | Domain of the event (e.g. `security`) |
| `eventKey` | string | Event identifier (e.g. `company_user_invitation`) |
| `canonicalEventKey` | string | Composite identity (e.g. `security.company_user_invitation`) |
| `layoutTemplateId` | string | ID of the layout template used during rendering |
| `themeId` | string | ID of the theme used during rendering |
| `providerId` | string | ID of the platform provider used for delivery |
| `providerCredentialsId` | string | ID of the credential set used for delivery |
| `renderStatus` | enum | `success` \| `failed` |
| `deliveryStatus` | enum | `pending` \| `sent` \| `failed` \| `skipped` |
| `renderedAt` | timestamp | When rendering completed |
| `sentAt` | timestamp \| null | When delivery completed (null if not yet delivered) |
| `providerMessageId` | string \| null | External reference from the provider's API response |
| `errorMessage` | string \| null | Error detail if render or delivery failed |

> `layoutTemplateId`, `themeId`, `providerId`, and `providerCredentialsId` must be captured at render/delivery time — not derived later — to support accurate historical audit.

---

## 11. Relationship with DEC-017

DEC-017 and DEC-018 are complementary. They must both be read together to understand the full provisioning and notification architecture.

| Decision | Defines |
|---|---|
| **DEC-017** | What default assets exist and their content specifications · How layout and event content are composed · Company provisioning lifecycle · Notification rendering flow · Default domain and event catalog · Validation rules for asset content |
| **DEC-018** | Who owns each asset · Which service creates it · Which service may mutate it · Bounded context boundaries · Stable event identity (canonical key) · Cross-boundary write rules · Execution log required fields |

**DEC-018 does not replace DEC-017.** It adds the ownership and boundary layer that DEC-017 deliberately left out of scope.

If a conflict exists between the two documents, DEC-018 takes precedence on questions of ownership and boundary. DEC-017 takes precedence on questions of asset content and provisioning sequences.

---

## 12. Consequences

### Positive

- Provisioning and Notification Engine can be developed, tested, and deployed independently
- A failure in provisioning does not affect the Notification Engine — if defaults are missing, delivery simply fails at the "Resolve Event" step with a clear error
- Execution logs contain complete resolution context — a support engineer can reconstruct exactly what was used for any historical notification without querying multiple services
- Stable event keys allow the application layer to raise events by name (`security.company_user_invitation`) without knowing internal database IDs
- Preview is always available without a configured provider

### Negative

- Additional service boundaries mean that provisioning must be explicitly called and monitored — a silent provisioning failure would leave a company with missing defaults
- The strict "never overwrite" rule means that buggy defaults cannot be silently corrected by re-provisioning — a migration or admin tool is required to correct user-facing defaults
- Execution logs are larger than a minimal delivery record — the required fields add storage overhead per notification

---

## 13. References

- `docs/Decisions/DEC-017-Company-Provisioning-Default-Events.md` — asset content specifications, provisioning lifecycle, rendering flow
- `docs/Decisions/DEC-019-Notification-Trigger-Flow.md` — trigger flow, companyId resolution, single entry point rule
- `docs/Decisions/DEC-020-Default-System-Domains-Templates-Events-Provisioning.md` — `isSystem` flag semantics, notifications domain, change management, backfill procedure
- `docs/Decisions/DEC-021-Communication-Asset-Lifecycle.md` — master map of the Communication module; entry point for new developers
- `docs/Decisions/DEC-012-Platform-Communication-Resolution-Strategy.md` — communication ownership model (platform vs. tenant company)
- `docs/Decisions/DEC-016-Navigation-Configuration-Flow.md` — Business App sidebar order and company readiness states
- `docs/Decisions/ADR-004-Platform-Operator-Company-Model.md` — platform vs. tenant company distinction
