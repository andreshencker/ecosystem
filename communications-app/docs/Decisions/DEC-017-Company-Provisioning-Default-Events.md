---
id: DEC-017
title: Company Provisioning, Default Events, and Notification Composition Model
status: Accepted — amended 2026-07-07
created: 2026-06-25
tags: [backend, frontend, provisioning, notifications, events, templates, rendering]
---

> **Amendment 2026-07-07 — Provisioning lifecycle for tenant companies:**
>
> Section §3 (Provisioning Lifecycle) describes provisioning as triggered at company creation. This applies **only to the platform company** (the Grapifly company that owns Communications Platform). For **tenant Business companies**, the correct model is defined in `ADR-019-seed-catalog.md` and `business-app/docs/architecture/communication-architecture.md`:
>
> - Tenant company created → NO calls to Communications (no token yet)
> - Seed Catalog in Business App defines all domains/events/templates
> - Tenant Business saves its integration token → Business App reads Seed Catalog → provisions all assets in Communications idempotently
>
> The composition model (§2), default events spec (§6), rendering flow (§8), and validation rules (§9) are unaffected by this amendment.

# DEC-017 — Company Provisioning, Default Events, and Notification Composition Model

## 1. Context

The platform needs a defined model for how notifications are structured, how new companies are bootstrapped with default assets, and what the rendering engine must compose at delivery time.

Without this decision, implementations risk:

- Creating one HTML template per notification type (incorrect — violates the composition model)
- Shipping empty companies that cannot send any notification without manual setup for every asset
- Embedding corporate headers and footers inside event content (incorrect — duplicates branding per event)
- Treating Layout Templates and Events as interchangeable (they are fundamentally different things)

This decision defines the complete company provisioning lifecycle and the asset composition model that governs all notification delivery.

---

## 2. Decision

### 2.1 Core Principle

**All notifications are event-based.**

A notification is never sent directly from a template. A notification is triggered by an **Event**. The Event defines the business message content. The Layout Template defines the corporate structure and branding wrapper. The Notification Engine composes both at runtime.

### 2.2 Critical Separation of Responsibilities

The four assets involved in a notification are strictly separated. No asset may take on the responsibility of another.

| Asset | Responsibility | Must NOT contain |
|---|---|---|
| **Theme** | Visual identity — colors, typography, brand tokens | Any message content or business copy |
| **Company** | Identity data — name, logo, support contacts, legal links | Notification content or layout structure |
| **Layout Template** | Corporate structure — header, footer, branding wrapper, `{{content}}` placeholder | Event-specific subject, message copy, or variables |
| **Event** | Business message — subject, body content, required/optional variables, channel-specific payload | Full corporate HTML layout, global header, global footer |

**Wrong pattern:**
```
WelcomeEmail.html
├── corporate header
├── "Welcome, {{firstName}}"
└── corporate footer
```

**Correct pattern:**
```
DefaultEmailLayout.html       (Layout Template)
├── corporate header
├── {{content}}               ← injected at runtime
└── corporate footer

welcome_message               (Event channelContent.email.content)
└── "Welcome, {{data.firstName}}. Your account is ready."
```

---

## 3. Provisioning Lifecycle

Provisioning is triggered in **exactly two scenarios**:

**Trigger A — Public Registration (`POST /auth/register`)**
A new user creates their own company. Provisioning runs atomically as part of registration before the user record is created.

**Trigger B — Platform Admin Creates a Company (`POST /companies/with-owner`)**
A platform admin creates a company and its initial owner from the Global Users page. Provisioning runs atomically as part of company creation before the owner user record is created.

In both cases, company creation and provisioning follow a **two-phase model**:

### Phase 1 — Database Transaction (atomic, synchronous)

```
┌─────────────────────────────────────────────────────┐
│  BEGIN TRANSACTION                                  │
│                                                     │
│  1. Create Company record                           │
│  2. Create Owner User record (if applicable)        │
│                                                     │
│  COMMIT                                             │
└─────────────────────────────────────────────────────┘
```

Phase 1 is atomic. If either step fails, the entire transaction is rolled back. No partial state is written.

**API response is returned after Phase 1 commits**, before Phase 2 begins.

### Phase 2 — Asynchronous Operations (non-atomic, fire-and-forget)

```
┌─────────────────────────────────────────────────────┐
│  (Runs after Phase 1 commits — does NOT block API)  │
│                                                     │
│  3. Provision Default Theme                         │
│  4. Provision Default Email Layout Template         │
│  5. Provision Default PDF Layout Template           │
│  6. Provision security Domain                       │
│  7. Provision Default Events                        │
│  8. Trigger invitation/verification notification    │
│                                                     │
│  ⚠ Failures in Phase 2 NEVER roll back Phase 1.    │
│    Company and user records are permanent once      │
│    Phase 1 commits, regardless of Phase 2 outcome. │
└─────────────────────────────────────────────────────┘
```

**Phase 2 failures must be observable but must not undo the transaction.** If provisioning fails, the company exists and the owner can log in; the missing assets will be created on the next provisioning run (idempotent repair — see §21.2). If the notification fails, the admin can resend the invitation; the user account is still active.

This separation ensures the API never returns a transaction error due to a downstream email delivery failure or a provisioning timeout.

In both cases, the backend **must automatically provision** the following assets in order (Phase 2):

```
1. Company record    ← Phase 1
2. Owner User        ← Phase 1 (if applicable)
3. Default Theme     ← Phase 2
4. Default Email Layout Template  ← Phase 2
5. Default PDF Layout Template    ← Phase 2
6. Default Domains   ← Phase 2
7. Default Events    ← Phase 2
8. Notification      ← Phase 2
```

**The company must never start empty.** The purpose of provisioning is to give the company owner a ready-to-customize communication setup from day one.

### 3.1 Idempotency Requirement

Provisioning must be **idempotent**. Running it twice on the same company must not duplicate default themes, layout templates, domains, or events. Each provisioned asset must have a stable key or identifier that provisioning checks before creating.

### 3.2 What Must NOT Be Auto-Created

The following require explicit user action and must never be auto-provisioned:

- Provider credentials (SMTP, API Key, OAuth, Access Keys)
- Enabled providers (channel → provider assignments)
- Real sending domains (DKIM, SPF, MX records)
- OAuth tokens

A company can have complete default events and layout templates while delivery remains **non-operational** until providers and credentials are configured. This is the expected initial state.

---

## 4. Default Layout Templates

### 4.1 Required Templates

When a company is created, two layout templates must be automatically created:

| # | Key | Template Type | Purpose |
|---|---|---|---|
| 1 | `default_email_layout` | `email` | Corporate wrapper for all email notifications |
| 2 | `default_pdf_layout` | `pdf` | Corporate wrapper for all PDF-rendered documents |

Both are **company-scoped**, marked as default, and set to active.

### 4.2 Template Variable Contract

Every default layout template must be able to render the following variables, resolved at runtime from the company record and active theme:

**Company variables:**
- `company.displayName`
- `company.legalName`
- `company.logoFullUrl`
- `company.logoIconUrl`
- `company.supportEmail`
- `company.supportPhone`
- `company.supportHours`
- `company.webBaseUrl`
- `company.privacyPolicyUrl`
- `company.termsUrl`
- `company.unsubscribeUrl`
- `company.copyrightText`

**Theme variables:**
- `theme.primaryColor`
- `theme.secondaryColor`
- `theme.backgroundColor`
- `theme.surfaceColor`
- `theme.textColor`
- `theme.mutedTextColor`
- `theme.borderColor`
- `theme.linkColor`
- `theme.fontFamily`

### 4.3 Required `{{content}}` Placeholder

Every layout template **must** contain a `{{content}}` placeholder. This is a hard validation rule enforced at template creation and update. A layout template that does not contain `{{content}}` is invalid and must be rejected.

### 4.4 What Templates Must NOT Contain

- Event-specific subject lines
- Business message copy
- Per-event variables (`data.*`)
- Inline styles that would override event-level formatting

---

## 5. Default Domains

### 5.1 Required Default Domains

The following domain must be created for every company during provisioning:

| Domain Key | Display Name | Category | Purpose |
|---|---|---|---|
| `security` | Security | `system_notifications` | Authentication, account access, password management, user invitations, and security-related messages |

Additional domains may be defined in future decisions. This decision establishes only the minimum required domain.

### 5.2 Domain Properties

Each provisioned domain is:
- Scoped to the company
- Set to active
- Linked to email channel by default (delivery is contingent on provider/credentials being configured)

---

## 6. Default Events

Events are split into two groups: **Platform-level events** (provisioned for the platform-owned Grapifly company) and **Company-level events** (provisioned for every new tenant company).

All events listed here belong to the `security` domain.

### Event catalog overview

| Canonical Key | Provisioned For | Authentication Role | Triggered By |
|---|---|---|---|
| `security.company_verify_email` | Every company (tenant + platform) | Registration — email gate | `POST /auth/register` |
| `security.company_user_invitation` | Every company (tenant + platform) | Onboarding — all invited users | `POST /users/invite`, `POST /companies/with-owner` |
| `security.company_password_changed` | Every company | Security notification | `PATCH /users/me/password`, `POST /auth/reset-password` |
| `security.company_forgot_password` | Every company | Account recovery | `POST /auth/forgot-password` |
| `security.company_welcome_message` | Every company | **Optional** — not part of auth flow | Business-triggered only |
| `security.platform_admin_invitation` | Platform company only | Platform admin onboarding | `POST /users/invite` (platform_admin → platform_admin) |
| `security.platform_forgot_password` | Platform company only | Platform admin account recovery | `POST /auth/forgot-password` (global scope users) |
| `security.platform_password_changed` | Platform company only | Platform admin security notification | `PATCH /users/me/password` (global scope users) |

---

### 6.1 Platform Company Events

These events are provisioned for the Grapifly platform company only. They cover lifecycle operations that concern platform administrators specifically.

---

#### `platform_admin_invitation`

| Field | Value |
|---|---|
| Display Name | Platform Admin Invitation |
| Canonical Key | `security.platform_admin_invitation` |
| Event Type | `notification` |
| Domain | `security` |
| Purpose | Invite a new Platform Admin to the platform |

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `You have been invited to join {{company.displayName}}` |
| Required variables | `data.firstName`, `data.companyName`, `data.role`, `data.email`, `data.tempPassword`, `data.loginUrl` |

---

#### `platform_forgot_password`

| Field | Value |
|---|---|
| Display Name | Platform Forgot Password |
| Canonical Key | `security.platform_forgot_password` |
| Event Type | `security` |
| Domain | `security` |
| Purpose | Deliver a password reset link to a platform admin |

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `Reset your password` |
| Required variables | `data.firstName`, `data.resetUrl`, `data.expiresAt` |
| Optional variables | `data.email` |

---

#### `platform_password_changed`

| Field | Value |
|---|---|
| Display Name | Platform Password Changed |
| Canonical Key | `security.platform_password_changed` |
| Event Type | `security` |
| Domain | `security` |
| Purpose | Notify a platform admin that their password was changed |

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `Your password was changed` |
| Required variables | `data.firstName`, `data.email`, `data.when` |
| Optional variables | `data.ipAddress` |

---

### 6.2 Company Events (Provisioned for Every Tenant Company)

These events are created for every new company during provisioning — both when a company is created via `POST /auth/register` and via `POST /companies/with-owner`.

---

#### `company_verify_email`

| Field | Value |
|---|---|
| Display Name | Email Verification |
| Canonical Key | `security.company_verify_email` |
| Event Type | `security` |
| Domain | `security` |
| Purpose | Deliver the email verification link to a user who registered via public registration. Without verification, the user cannot log in. |

**Triggered by:** `POST /auth/register` only. Never triggered for invited users.

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `Verify your email address` |
| Required variables | `data.firstName`, `data.verificationUrl`, `data.expiresAt` |
| Optional variables | `data.email` |

---

#### `company_user_invitation`

| Field | Value |
|---|---|
| Display Name | Company User Invitation |
| Canonical Key | `security.company_user_invitation` |
| Event Type | `notification` |
| Domain | `security` |
| Purpose | Deliver onboarding credentials to any invited user. Used for ALL invitation flows: company_owner (via POST /companies/with-owner), company_admin, operator, and viewer (via POST /users/invite). The `data.role` variable allows the email template to address the invitee by their assigned role. |

**Triggered by:** `POST /companies/with-owner` and `POST /users/invite`.

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `You have been invited to join {{company.displayName}}` |
| Required variables | `data.firstName`, `data.companyName`, `data.role`, `data.email`, `data.tempPassword`, `data.loginUrl` |
| Optional variables | `data.expiresAt` |

> **Important:** `data.tempPassword` is a required variable. The email must display the temporary password so the invitee can log in. This field is passed to `notifyEvent()` from application memory and is never stored in the database.

---

#### `company_password_changed`

| Field | Value |
|---|---|
| Display Name | Company Password Changed |
| Canonical Key | `security.company_password_changed` |
| Event Type | `security` |
| Domain | `security` |
| Purpose | Notify a company user that their password was successfully changed |

**Triggered by:** `PATCH /users/me/password` and `POST /auth/reset-password` (company-scoped users).

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `Your password was changed` |
| Required variables | `data.firstName`, `data.email`, `data.when` |
| Optional variables | `data.ipAddress` |

---

#### `company_forgot_password`

| Field | Value |
|---|---|
| Display Name | Company Forgot Password |
| Canonical Key | `security.company_forgot_password` |
| Event Type | `security` |
| Domain | `security` |
| Purpose | Deliver a password reset link to a company user |

**Triggered by:** `POST /auth/forgot-password` (company-scoped users).

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `Reset your password` |
| Required variables | `data.firstName`, `data.resetUrl`, `data.expiresAt` |
| Optional variables | `data.email` |

---

#### `company_welcome_message`

| Field | Value |
|---|---|
| Display Name | Company Welcome Message |
| Canonical Key | `security.company_welcome_message` |
| Event Type | `notification` |
| Domain | `security` |
| **Role** | **Platform event — triggered on invitation completion** |
| Purpose | Notify a user that their account is fully active after they complete the forced first-login password change at the end of the invitation flow. |

---

**Triggered by:** `UserInvitationsService.handlePasswordCompleted()` — fired when an invited user changes their temporary password and fully activates their account.

Uses `type: 'platform'` (base company connection). This ensures delivery even if the tenant's `CommunicationConnection` is not yet configured.

**This event is part of the invitation completion flow.** It is fired automatically when `handlePasswordCompleted()` runs for a company-scoped invitation. It is NOT triggered by public registration (Flow A users verify email instead).

Future use for standalone business-triggered welcome sequences (e.g., CRM onboarding, re-engagement campaigns) is also valid — simply call `notifyEvent('security.company_welcome_message', ...)` from the relevant business service.

**Email channel content:**

| Field | Value |
|---|---|
| Subject | `Welcome to {{company.displayName}}` |
| Required variables | `data.firstName` |
| Optional variables | `data.email`, `data.loginUrl` |

---

## 7. Event Content Responsibility

Each event must define `channelContent` for every channel it supports.

For the `email` channel, each event's `channelContent.email` must define:

| Field | Type | Required |
|---|---|---|
| `enabled` | boolean | Yes |
| `subject` | string (template) | Yes |
| `content` | string (template, body only) | Yes |
| `requiredVariables` | string[] | Yes |
| `optionalVariables` | string[] | No |
| `files` | object[] | No |

**`content` contains the body of the event message only.** It must not include:
- Full corporate HTML layout
- Global header or footer markup
- Company logo or brand colors (those come from the layout template and theme)

The rendering engine applies the layout wrapper after the event content is resolved.

---

## 8. Rendering Flow

When a notification is triggered by `eventKey` and runtime `data`:

```
1.  Receive eventKey + runtime data payload
2.  Resolve company (from context or companyId)
3.  Resolve domain (from event.domainCatalogueId)
4.  Resolve event (from domain + eventKey)
5.  Resolve channelContent for the target channel
6.  Resolve company's default layout template for the channel/templateType
7.  Resolve the company's active theme
8.  Inject event content → layout {{content}} placeholder
9.  Render all template variables from:
      - company.*         (displayName, logoUrl, supportEmail, etc.)
      - theme.*           (colors, typography)
      - data.*            (event-specific runtime variables)
      - meta.*            (timestamp, requestId, etc.)
10. Resolve enabled provider and valid credentials
11. Send notification via provider
12. Store execution log / delivery result
```

Steps 1–9 constitute **composition**. Step 10–12 constitute **delivery**. Composition must succeed even when delivery is not operational (useful for previewing).

---

## 9. Validation Rules

The following rules are enforced at the system boundary (API, service layer, or provisioning):

| # | Rule |
|---|---|
| V-01 | A company must always have exactly one default active theme |
| V-02 | A company must always have exactly one default active email layout template |
| V-03 | A company must always have exactly one default active PDF layout template |
| V-04 | Every layout template must contain `{{content}}` — enforced on create and update |
| V-05 | Event `channelContent.email.content` must not contain `<header>`, `<footer>`, or corporate wrapper markup |
| V-06 | Every default event must belong to a provisioned default domain |
| V-07 | Notifications cannot be delivered unless an enabled provider and valid credentials exist |
| V-08 | Provider credentials are never auto-provisioned — they require explicit user action |
| V-09 | Provisioning is idempotent — running it twice must not create duplicate assets |
| V-10 | Default domain keys and event keys are stable identifiers — they are never auto-renamed |

---

## 10. Frontend Implications

### 10.1 Post-Provisioning UI State

After company creation, the Business App must **never show empty pages** for the following sections:

| Section (DEC-016) | Expected State After Provisioning |
|---|---|
| Theme | Default theme pre-populated and editable |
| Domains | `security` domain pre-populated |
| Templates | Default email layout + default PDF layout pre-populated |
| Events | All default events pre-populated under their domains |
| Enabled Providers | Empty — requires user action |
| Credentials | Empty — requires user action |

### 10.2 What the User Customizes

The user should be able to immediately edit any provisioned asset:

- Theme colors, typography, brand tokens
- Email layout structure and variables used
- PDF layout structure
- Event subjects, content body, variable lists
- Event channel configuration (enable/disable channels per event)

### 10.3 What the User Must Configure

The following actions are **not provisioned** and block delivery until completed:

1. Enable at least one provider per channel (`/company-channel-providers`)
2. Add credentials for the enabled provider (`/credentials`)

The Business App sidebar order (DEC-016) is: My Company → Theme → Enabled Providers → Credentials → Domains → Templates → Events. Enabled Providers and Credentials intentionally appear before Domains, Templates, and Events. The sidebar guides the user to configure the delivery infrastructure first, then define what to deliver. Without providers and credentials, the content sections (Domains, Templates, Events) can be customized but nothing can be dispatched.

### 10.4 Preview Without Delivery

The rendering engine (step 1–9 of §8) must be executable without a configured provider, to support:
- Layout template preview in the Templates UI
- Event content preview in the Events UI
- Brand preview in the Theme UI

These previews compose the full output without dispatching to any provider.

---

## 11. Naming Rules

All frontend labels and API keys must follow the business terminology defined in DEC-016 and this decision:

| Use | Do Not Use |
|---|---|
| **Layout Templates** | "Template per event" or "Email template" (implying full HTML per notification) |
| **Events** | "Notification definitions" or "Message templates" |
| **Domains** | "Event groups" or "Category tables" |
| **Theme** | "Styling" or "CSS config" |
| **Enabled Providers** | "Channel providers" or "Provider assignments" |

---

## 12. Consequences

### Positive

- Companies are immediately functional from a content perspective after creation
- The composition model prevents duplication of corporate branding across hundreds of event records
- Changing the company logo or primary color propagates instantly to all notifications (single source: theme + company record)
- Previewing a notification does not require a configured provider
- Adding a new event never requires touching the layout template
- The rendering flow is deterministic and auditable (each step has a resolvable artifact)

### Negative

- Backend provisioning logic must be implemented before companies can be created without manual seed work
- The idempotency requirement adds complexity to the provisioning service
- Frontend Event and Template editors must enforce the separation — the event content editor must not allow full corporate HTML
- Staff training is required: support teams must understand that "edit the welcome email" means editing the `welcome_message` event content, not the layout template

---

## 13. Implementation Notes

1. **Notification Engine is not required immediately.** The composition model defined in §8 governs future implementation. Current work can focus on provisioning (§3) and data structure without building the full rendering pipeline.

2. **Do not build template-per-event patterns.** Any feature that creates a dedicated full HTML file per event key is non-compliant with this decision and will need to be refactored.

3. **Do not send notifications by resolving a template directly.** All notification dispatch must pass through event resolution. There is no "send template" endpoint — only "trigger event" endpoints.

4. **Layout template HTML** should be stored as raw HTML with `{{mustache}}` or equivalent placeholder syntax. The rendering engine is responsible for substituting variables. The template editor is responsible for syntax validation.

5. **Event `content` fields** store only the message body — plain text or HTML snippet — not the full document. The rendering engine wraps it in the layout.

6. **Provisioning service** must be callable at company creation time and also be runnable in isolation for re-provisioning or migration scenarios.

---

## 14. References

- `docs/Decisions/DEC-012-Platform-Communication-Resolution-Strategy.md` — communication ownership model
- `docs/Decisions/DEC-016-Navigation-Configuration-Flow.md` — Business App sidebar workflow order
- `docs/Decisions/DEC-018-Communication-Asset-Ownership.md` — asset ownership matrix, bounded context, canonical event key
- `docs/Decisions/DEC-019-Notification-Trigger-Flow.md` — trigger flow, companyId resolution, single entry point rule
- `docs/Decisions/DEC-020-Default-System-Domains-Templates-Events-Provisioning.md` — `isSystem` flag, notifications domain, change management, backfill procedure
- `docs/Decisions/DEC-021-Communication-Asset-Lifecycle.md` — master map of the Communication module; entry point for new developers
- `docs/Decisions/ADR-004-Platform-Operator-Company-Model.md` — platform vs. tenant company distinction
- `docs/Frontend/UX.md` §4 — sidebar configuration reflecting the provisioning workflow

---

## 15. Default Company Assets

The table below defines every communication asset in the system, whether it is required for production delivery, whether it is automatically created during provisioning, and whether the user can edit it after creation.

| Asset | Required | Auto-Created | Editable by User | Notes |
|---|---|---|---|---|
| **Theme** | Yes | ✅ Yes | ✅ Yes | Default theme created with platform brand tokens. User replaces with own colors and typography. |
| **Email Layout Template** | Yes | ✅ Yes | ✅ Yes | Default corporate wrapper with `{{content}}` placeholder. User adjusts header, footer, and variable usage. |
| **PDF Layout Template** | Yes | ✅ Yes | ✅ Yes | Default PDF wrapper. User adjusts branding and structure. |
| **Domains** | Yes | ✅ Yes | ✅ Yes | `security` domain provisioned automatically. User adds additional business domains. |
| **Events** | Yes | ✅ Yes | ✅ Yes | Default security events provisioned. User edits subjects, content, variables, and can add new events. |
| **Enabled Providers** | Required for delivery | ❌ No | ✅ Yes | User must explicitly choose which global providers to enable for each channel. |
| **Provider Credentials** | Required for delivery | ❌ No | ✅ Yes | User must add authentication credentials (API key, SMTP, OAuth) for each enabled provider. |

### 15.1 Design Intent

**Auto-created assets** give the company a complete, customisable communication catalog from the moment the company record is created. The user can personalise all of them without any asset being blank or missing.

**Not auto-created assets** require deliberate user action because they bind the platform to external infrastructure (a real SMTP server, a third-party API, a payment processor). Provisioning cannot make those choices on behalf of the company.

> **The objective is that every company starts ready for customisation — not ready for delivery.**
> Customisation is possible immediately. Delivery becomes possible only after the user configures providers and credentials.

---

## 16. Notification Lifecycle

The complete lifecycle of a notification, from the business action that triggers it to the execution log that records the result:

```
Business Action
      ↓
Raise Event
(eventKey + runtime data)
      ↓
Resolve Domain
      ↓
Resolve Event
      ↓
Resolve Layout Template
(company default for channel/templateType)
      ↓
Resolve Theme
(company active theme)
      ↓
Resolve Company
(identity, branding fields, legal links)
      ↓
──────────────────────────────
    RENDERING PHASE (steps 1–9)
──────────────────────────────
      ↓
Compose: inject event content → {{content}}
Render all variables:
  company.* / theme.* / data.* / meta.*
      ↓
Final HTML / PDF / SMS payload produced
      ↓
──────────────────────────────
    DELIVERY PHASE (steps 10–12)
──────────────────────────────
      ↓
Resolve Enabled Provider
(channel → provider assignment for company)
      ↓
Resolve Credentials
(provider authentication secrets)
      ↓
Send Notification via Provider
      ↓
Store Execution Log
```

### 16.1 Rendering and Delivery Are Independent Phases

**Rendering** is the process of composing the final notification payload from company, theme, layout, and event data. It has no external dependencies beyond the database.

**Delivery** is the process of dispatching the rendered payload through a configured provider. It requires external infrastructure (an SMTP relay, a transactional email API, an SMS gateway).

This separation has two important consequences:

1. **Preview is always possible.** The rendering engine can produce a fully composed HTML email for preview in the frontend even when no provider is configured. There is no partial rendering.

2. **Delivery failure does not corrupt the rendered output.** If delivery fails (provider down, credentials expired), the rendered payload is already complete. Retry logic operates at the delivery phase without re-rendering.

> The engine first builds the notification completely. Only after rendering succeeds does delivery begin.

---

## 17. Required Company State

A company passes through two distinct states during setup. These states are not persisted as a field — they are inferred from whether the required assets exist.

```
Company Created
      ↓
Theme              ← provisioned automatically
      ↓
Layout Templates   ← provisioned automatically
      ↓
Domains            ← provisioned automatically
      ↓
Events             ← provisioned automatically
      ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━
   READY FOR CUSTOMISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━
(all content assets exist and are editable)
      ↓
Configure Enabled Providers   ← user action required
      ↓
Configure Credentials          ← user action required
      ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━
    READY FOR DELIVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━
(notifications can be dispatched)
```

### 17.1 Ready for Customisation

A company is **Ready for Customisation** when:

- A default theme exists and is active
- A default email layout template exists, is active, and contains `{{content}}`
- A default PDF layout template exists, is active, and contains `{{content}}`
- At least one domain exists (the `security` domain)
- At least one event exists under that domain

In this state the user can:
- Edit the theme
- Edit or replace layout templates
- Add domains and events
- Preview composed notifications

In this state the user **cannot**:
- Send any real notification (delivery is non-operational)

### 17.2 Ready for Delivery

A company is **Ready for Delivery** when it is Ready for Customisation **and**:

- At least one enabled provider is configured for the target channel
- Valid credentials exist for that provider

In this state all notification dispatch is operational.

### 17.3 Why These Are Different States

The distinction exists because the content workflow (what to say, to whom, in what format) is completely independent from the infrastructure workflow (how to send it, through which provider, with which credentials).

A company can spend days perfecting its email layout, event copy, and variable structure before ever connecting a provider. Those two workflows must not block each other.

---

## 18. Default Communication Catalog

The communication catalog is the set of domains and events that organise a company's notification strategy.

### 18.1 Catalog Structure

The catalog is organised as:

```
Company
  └── Domain (business area)
        └── Event (notification trigger)
              └── channelContent (per channel: email / sms / etc.)
```

Domains group events by business area. A domain is not a technical namespace — it is a business label that describes which area of the product a notification belongs to.

### 18.2 Mandatory Default Domain in v1

In the current version, only one domain is mandatory and automatically provisioned:

| Domain Key | Display Name | Mandatory | Scope |
|---|---|---|---|
| `security` | Security | ✅ Yes (v1) | All companies |

### 18.3 Future Domain Catalogue

The following domains represent the intended growth of the catalog. They are **not provisioned in v1** but should be treated as reserved keys. Future decisions will define when and how they are provisioned.

| Domain Key | Display Name | Business Area |
|---|---|---|
| `security` | Security | Auth, access, passwords, invitations (v1 mandatory) |
| `users` | Users | User lifecycle, profile changes, role updates |
| `reports` | Reports | Scheduled report delivery, download links |
| `trading` | Trading | Order execution, position updates, trade confirmations |
| `invoices` | Invoices | Invoice generation, payment due notices, receipts |
| `payments` | Payments | Payment confirmation, failure notices, refunds |
| `marketing` | Marketing | Campaigns, announcements, product updates |
| `automation` | Automation | Workflow triggers, scheduled jobs, integration events |
| `storage` | Storage | File upload confirmations, storage quota alerts |
| `integrations` | Integrations | Webhook delivery results, third-party sync events |

> **Only `security` is provisioned in v1.** All other domain keys are reserved and must not be used for other purposes.

---

## 19. Future Architecture — Event Versioning

> **Status: Future Architecture. Not implemented in v1. No implementation action required.**

### 19.1 Problem

Event content changes over time. If the `welcome_message` event's email body is updated, all future notifications use the new content — but historical execution logs reference the event record as it exists today, not as it existed at the time of sending. This makes audit trails inaccurate.

### 19.2 Intended Future Model

Events should eventually support versioning, where each change to an event's content creates a new version rather than overwriting the existing record.

```
Event: welcome_message
      ↓
Version 1  (created 2026-06-01)
  subject: "Welcome to {{company.displayName}}"
  content: "Hi {{data.firstName}}, your account is ready."
      ↓
Version 2  (updated 2026-08-01)
  subject: "Welcome to {{company.displayName}}, {{data.firstName}}"
  content: "Hi {{data.firstName}}, welcome aboard. Here is what's next..."
      ↓
Version 3  (current)
  subject: "Welcome, {{data.firstName}} — your account is active"
  content: "..."
```

### 19.3 Execution Log Binding

When a notification is rendered and dispatched, the execution log must record:

- The event key (`welcome_message`)
- The **version identifier** used at render time (e.g., `v2`)
- The full rendered payload (or a hash of it)

This allows support teams to reconstruct exactly what was sent to a user on a specific date, regardless of subsequent edits to the event.

### 19.4 Why Not in v1

Versioning adds storage and query complexity that is not justified until the event catalog is stable and in production use. The data model should be designed from the start to accommodate versioning (e.g., an event `currentVersion` field and a `event_versions` collection), but the versioning write path is not activated until a future sprint.

---

## 20. Architecture Principles

The following principles are mandatory for all current and future implementations. They are binding from the date this decision was accepted.

| # | Principle |
|---|---|
| P-01 | A newly created company must never start empty. The provisioning step is not optional. |
| P-02 | The communication platform provisions a complete communication catalog automatically at company creation. |
| P-03 | Branding is owned exclusively by Themes and Layout Templates. No event record may contain brand colors, logos, or corporate structure. |
| P-04 | Business messaging is owned exclusively by Events. No layout template may contain event-specific subject lines, message copy, or `data.*` variable references. |
| P-05 | Notification rendering is independent from notification delivery. Rendering must succeed before delivery begins. A rendering failure must never be confused with a delivery failure. |
| P-06 | Provider configuration is the only manual step required before production delivery. All other communication assets are provisioned automatically and can be customised without blocking delivery setup. |

---

## 21. Implementation Rules

The following rules govern the provisioning service and any code that touches default assets.

### 21.1 Idempotency

Provisioning must be **idempotent**. It can be called any number of times on the same company without producing duplicate assets.

Implementation: before creating any default asset, the provisioning service checks whether an asset with the same stable key already exists for that company.

```
for each default asset:
  if exists(company, asset.key):
    skip — do not overwrite
  else:
    create
```

### 21.2 Repair Semantics

Provisioning must **repair missing assets**. If a default theme, layout template, domain, or event is deleted or corrupted, re-running provisioning must restore it.

This means provisioning is also the recovery mechanism — not just the creation mechanism.

### 21.3 Preserve User Customisations

Provisioning must **never overwrite user customisations**.

If a user has edited the default email layout, changed the theme colors, or updated an event's subject line, re-running provisioning must leave those changes intact.

The rule is: **create if missing, skip if present**. There is no update path in the provisioning service.

### 21.4 Stable Keys

Every provisioned asset must have a stable, deterministic key that does not change across provisioning runs. These keys are the identity contract between provisioning and the rest of the system.

| Asset | Stable Key Field |
|---|---|
| Theme | `isDefault: true` + `companyId` |
| Email Layout | `templateKey: 'default_email_layout'` + `companyId` |
| PDF Layout | `templateKey: 'default_pdf_layout'` + `companyId` |
| Security Domain | `domainKey: 'security'` + `companyId` |
| Default Events | `eventKey` (e.g. `welcome_message`) + `domainId` |

---

## 22. Communication Engine Architecture Diagram

The diagram below is the **canonical architecture reference** for the communication engine. All implementations must conform to this model.

```
┌─────────────────────────────────────────────────────────────┐
│                        COMPANY                               │
│  displayName · legalName · logo · supportEmail · copyrightText │
└───────────────────┬─────────────────────────────────────────┘
                    │ identity data
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                         THEME                                │
│     primaryColor · fontFamily · backgroundColor · ...        │
└───────────────────┬─────────────────────────────────────────┘
                    │ brand tokens
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYOUT TEMPLATE                            │
│     corporate header + {{content}} + corporate footer        │
│     uses: company.* · theme.*                                │
└───────────────────┬─────────────────────────────────────────┘
                    │ wrapper structure
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        DOMAIN                                │
│              security · users · invoices · ...               │
└───────────────────┬─────────────────────────────────────────┘
                    │ business grouping
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                         EVENT                                │
│     eventKey · subject · content (body only)                 │
│     requiredVariables · optionalVariables · channelContent   │
│     uses: data.* (runtime variables only)                    │
└───────────────────┬─────────────────────────────────────────┘
                    │ message content
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  NOTIFICATION ENGINE                          │
│                                                              │
│   1. Resolve company, theme, layout, domain, event           │
│   2. Inject event content → {{content}}                      │
│   3. Render all variables (company.* theme.* data.* meta.*)  │
│   4. Produce final payload (HTML / PDF / SMS)                │
│                                                              │
│   ── RENDERING COMPLETE ──                                   │
│                                                              │
│   5. Resolve enabled provider for channel                    │
│   6. Resolve provider credentials                            │
│   7. Dispatch notification                                   │
│   8. Store execution log                                     │
│                                                              │
│   ── DELIVERY COMPLETE ──                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
┌──────────────────┐  ┌──────────────────────┐
│    PROVIDER      │  │  EXECUTION LOG        │
│  (SMTP / API /   │  │  eventKey · version   │
│   OAuth / etc.)  │  │  renderedAt · sentAt  │
└────────┬─────────┘  │  status · provider    │
         │            └──────────────────────┘
         ▼
┌──────────────────┐
│   CREDENTIALS    │
│  (api_key / smtp │
│  / access_keys)  │
└────────┬─────────┘
         │
         ▼
      DELIVERY
```

### 22.1 Reading the Diagram

- Everything above the **Notification Engine** box is **resolved from the database** at render time.
- The Notification Engine is the **single composition boundary** — no other service may compose notifications.
- **Provider** and **Credentials** are resolved only after the full payload is rendered.
- The **Execution Log** records both the render result and the delivery result as separate fields.

### 22.2 What This Diagram Forbids

- Direct "send template" paths that bypass the event layer
- Providers that receive raw HTML without going through the engine
- Templates that embed event-specific copy
- Events that embed corporate wrappers
- Rendering and delivery happening in the same atomic step with no separation
