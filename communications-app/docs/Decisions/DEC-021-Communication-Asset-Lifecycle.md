---
id: DEC-021
title: Communication Asset Lifecycle
status: Accepted
created: 2026-06-28
tags: [backend, frontend, architecture, lifecycle, communication, master-map, canonical]
---

# DEC-021 — Communication Asset Lifecycle

> **This is the entry point for the Communication module.**
>
> Read this document first to understand the overall ecosystem. Follow the cross-references to the specific decisions for implementation details. This document deliberately avoids duplicating content that already exists in the predecessor decisions — it maps the system and connects the pieces.
>
> | If you want to know about… | Read… |
> |---|---|
> | Provisioning lifecycle and default asset content | DEC-017 |
> | Asset ownership and bounded context boundaries | DEC-018 |
> | Notification trigger flow and external integrations | DEC-019 |
> | `isSystem` flag, change management, backfill | DEC-020 |
> | This overview | DEC-021 (here) |

---

## 1. Communication Asset Map

The platform's communication system is built from eleven distinct asset types. Every notification that leaves the system is the product of resolving and composing a subset of these assets at runtime.

```
  PLATFORM (global — not company-scoped)
  ├── Channel Catalogue        channels: EMAIL · SMS · STORAGE
  └── Provider Catalogue       gmail · sendgrid · mailgun · twilio · s3 · …

  COMPANY (tenant-scoped — one set per company)
  │
  ├── Company                  root record — identity, branding fields, legal links
  │
  ├── Theme                    colors · typography · brand tokens
  │    └── (required by) Layout Templates
  │
  ├── Layout Templates
  │    ├── Email Layout         corporate email wrapper with {{content}} placeholder
  │    └── PDF Layout           corporate PDF wrapper with {{content}} placeholder
  │
  ├── Domains                  business groupings for notification events
  │    ├── security             (system domain — isSystem: true)
  │    ├── notifications        (system domain — planned, see DEC-020 §4.3)
  │    └── …custom domains…    (user-created)
  │         └── Events         notification definitions (subject, content body, variables)
  │
  ├── Company Channel Providers  company's enabled providers per channel
  │    └── (references) Provider Catalogue entries
  │
  ├── Provider Credentials      encrypted authentication secrets for enabled providers
  │    └── (linked to) Company Channel Provider
  │
  ├── Integrations              tokens for external app access (ERP, CRM, mobile apps)
  │    └── companyId resolved from token at trigger time
  │
  └── Execution Logs            immutable delivery record per notification attempt
       ├── companyId
       ├── canonicalEventKey    (domainKey.eventKey — DEC-018 §6)
       ├── layoutTemplateId     (resolved at render time)
       ├── themeId              (resolved at render time)
       ├── providerId           (resolved at delivery time)
       ├── providerCredentialsId (resolved at delivery time)
       ├── renderStatus         success | failed
       └── deliveryStatus       pending | sent | failed | skipped
```

### 1.1 Asset Responsibilities

| Asset | Responsibility | What It Must NOT Contain |
|---|---|---|
| **Company** | Identity data — `displayName`, `legalName`, `logoUrl`, `supportEmail`, `copyrightText`, legal URLs | Notification content, layout structure, credential secrets |
| **Theme** | Visual identity — `primaryColor`, `fontFamily`, `backgroundColor`, `linkColor`, etc. | Message copy, business logic, event-specific variables |
| **Layout Template** | Corporate structure — header, footer, `{{content}}` placeholder, `company.*` and `theme.*` variable slots | Event-specific subject lines, `data.*` variables, business message copy |
| **Domain** | Business grouping — organises events by area (`security`, `orders`, `billing`) | Event definitions, credential data |
| **Event** | Business message — `subject`, `content` (body snippet only), `requiredVariables`, `optionalVariables`, `channelContent` | Full corporate HTML wrapper, global header/footer, brand colors |
| **Channel Catalogue** | Platform catalog of available channel types (EMAIL, SMS, STORAGE) | Company-specific data |
| **Provider Catalogue** | Platform catalog of available provider integrations (Gmail, SendGrid, Twilio, S3) | Company credentials, company config |
| **Company Channel Provider** | Binds a company to a specific platform provider for a given channel | Credentials, event content |
| **Provider Credentials** | Encrypted authentication secrets for the enabled provider (API key, SMTP, OAuth, access keys) | Anything other than auth secrets for one provider |
| **Integration** | Maps an integration token to `{ companyId, integrationKey, environment }` | Company credentials, event content |
| **Execution Log** | Immutable delivery record — render status, delivery status, provider used, timestamps, error | Business logic, mutable state |

---

## 2. Provisioning Lifecycle

> **Implementation detail:** See DEC-017 §3 and DEC-020 §6 for the full provisioning service, idempotency rules, and repair semantics.

When a Platform Admin creates a company, the provisioning service runs automatically and brings the company from an empty record to a **ready-for-customisation** state.

```
  Platform Admin creates Company
           │
           ▼
  ─────────────────────────────
    PROVISIONING PHASE
  ─────────────────────────────
           │
           ├─▶  Default Theme
           │     isDefault: true
           │
           ├─▶  Default Email Layout     (linked to theme)
           │     templateKey: default_email_layout
           │     must contain: {{content}}
           │
           ├─▶  Default PDF Layout       (linked to theme)
           │     templateKey: default_pdf_layout
           │     must contain: {{content}}
           │
           ├─▶  security Domain          (isSystem: true)
           │     domainKey: security
           │     channelsToUse: []
           │
           └─▶  Default Events           (per domain)
                 company_user_invitation
                 company_welcome_message
                 company_password_changed
                 company_forgot_password
                 channelContent.email.enabled: true
           │
           ▼
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   READY FOR CUSTOMISATION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  All content assets present and editable.
  Preview is possible. Delivery is not.
           │
           │  User action required:
           │
           ├─▶  Enable Provider          (choose Gmail, SendGrid, Twilio, …)
           │
           └─▶  Configure Credentials   (API key, SMTP, OAuth, access keys)
           │
           ▼
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   READY FOR DELIVERY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Notifications can be dispatched.
```

### 2.1 The Two Readiness States

**Ready for Customisation** — every provisioned content asset (theme, layouts, domains, events) exists and is editable. The rendering engine can compose a full HTML preview. No notification can be sent to a real recipient.

**Ready for Delivery** — all content assets exist AND at least one enabled provider with valid credentials is bound to the target domain's channel. Dispatch is operational.

The two states are independent. A company can spend days refining its email layout, event copy, and brand colors before connecting a provider. Neither workflow blocks the other.

---

## 3. Customization Lifecycle

All provisioned assets are editable. Some fields on system assets are protected.

### 3.1 Editable Assets

| Asset | Editable By | What Can Be Changed |
|---|---|---|
| **Theme** | Company Owner / Admin | All token fields: colors, typography, border radius, etc. |
| **Email Layout** | Company Owner / Admin | All content: HTML structure, variable usage, header/footer copy |
| **PDF Layout** | Company Owner / Admin | All content: PDF wrapper HTML, variable usage |
| **Custom Domains** | Company Owner / Admin | `displayName`, `isActive`, `channelsToUse` (channel + credential binding) |
| **Custom Events** | Company Owner / Admin | `displayName`, `subject`, `content`, `requiredVariables`, `optionalVariables`, `channelContent` |
| **System Domains** | Company Owner / Admin | `isActive`, `channelsToUse` only — see §3.2 |
| **System Events** | Company Owner / Admin | `displayName`, `subject`, `content`, `variables` — `eventKey` is locked |
| **Provider Credentials** | Company Owner / Admin | Replace (rotate) the credential set for a provider |
| **Integrations** | Company Owner / Admin | `displayName`, `description`, `environment`, `isActive`, `expiresAt`; rotate token |

### 3.2 Protected Fields on System Assets

> Full protection rules: DEC-020 §3.2

| Asset | `isSystem` | Cannot Delete | Locked Fields |
|---|---|---|---|
| System Domain (`security`, `notifications`) | `true` | ✅ Yes — `403 Forbidden` | `domainKey` · `displayName` · `domainCategory` · `companyId` |
| System Event (planned) | `true` (planned) | ✅ Yes (planned) | `eventKey` · `domainCatalogueId` (planned) |
| Default Layout Template | `isDefault: true` | Planned: block deleting sole default | Content is editable |
| Default Theme | `isDefault: true` | Planned: block deleting sole default | Tokens are editable |

**Why these restrictions exist:** System assets are the platform's minimum viable communication catalog. Deleting the `security` domain would remove all authentication-related events and break login flows, invitation emails, and password resets. The `isSystem` flag makes this structurally impossible. See DEC-020 §3.

### 3.3 Adding Assets

Company owners can extend the catalog beyond the provisioned defaults:

| Addition | How |
|---|---|
| New domain | Create via Domains page — no `isSystem`, fully deletable |
| New event | Create under any domain, including system domains |
| Additional theme | Create via Theme page — company can have multiple themes |
| Additional layout | Create via Templates page — one per type must be default |
| New integration | Create via Integrations page — generates a scoped token |

---

## 4. Notification Lifecycle

> **Implementation detail:** See DEC-019 for the full trigger flow, source-specific companyId resolution, and credential resolution rules.

Every notification follows the same pipeline regardless of whether the trigger came from a business service, a platform admin operation, or an external application.

```
  Trigger Source
  ┌─────────────────────────────────────────────────────────┐
  │  Business Service         Platform Admin       External  │
  │  (companyId from          (companyId =         App       │
  │   auth context)            PLATFORM_ID)        (token →  │
  │                                                companyId)│
  └──────────────────────┬──────────────────────────────────┘
                         │  all paths converge here
                         ▼
            NotificationService.notifyEvent({
              companyId,              ← always resolved before this call
              event,                  ← domainKey.eventKey
              email?,
              phone?,
              payload?,
            })
                         │
           ──────────────────────────
             RESOLUTION PHASE
           ──────────────────────────
                         │
                         ├─▶  Resolve Event from Event Catalogue
                         │     (domainKey + eventKey)
                         │
                         ├─▶  Resolve Domain from Domain Catalogue
                         │     (channel list + credential references)
                         │
                         ├─▶  Resolve Layout Template
                         │     (company's default for channel/templateType)
                         │
                         └─▶  Resolve Theme
                               (company's active theme)
                         │
           ──────────────────────────
             RENDERING PHASE
           ──────────────────────────
                         │
                         ├─▶  Inject event content → {{content}} in layout
                         │
                         └─▶  Render all variables:
                               company.*  (identity, branding fields)
                               theme.*    (colors, typography)
                               data.*     (runtime event variables)
                               meta.*     (timestamp, requestId)
                         │
                         │  Final HTML / PDF / SMS payload ready
                         │
           ──────────────────────────
             DELIVERY PHASE
           ──────────────────────────
                         │
                         ├─▶  Resolve Enabled Provider
                         │     (domain's channelsToUse → Provider)
                         │
                         ├─▶  Resolve Provider Credentials
                         │     (decrypt only inside provider adapter)
                         │
                         └─▶  Dispatch via Provider Adapter
                               (Email / SMS / Storage)
                         │
           ──────────────────────────
             LOGGING PHASE
           ──────────────────────────
                         │
                         └─▶  Write Execution Log
                               (always — success or failure)
```

### 4.1 Phase Independence

Rendering has no external dependencies. It runs entirely against the database. This means:

- **Preview works without credentials** — the rendering engine produces a full HTML preview even when no provider is configured.
- **Delivery failure does not corrupt the rendered output** — if the provider is down or credentials expire, the rendered payload already exists. Retry runs only the delivery phase.
- **A rendering failure aborts delivery** — the delivery phase never starts if rendering fails.

---

## 5. Asset Dependency Matrix

Changing an upstream asset affects all assets downstream of it.

| Asset | Depends On | Downstream Impact if Changed |
|---|---|---|
| **Company** | — | All company-scoped assets are affected (logo change reflects in every email) |
| **Theme** | Company | All Layout Templates that reference `theme.*` variables re-render with new tokens |
| **Email Layout** | Theme, Company | All email notifications re-render with the new layout structure |
| **PDF Layout** | Theme, Company | All PDF notifications re-render with the new layout structure |
| **Domain** | Company | All Events under the domain; channelsToUse changes affect delivery routing |
| **Event** | Domain | Notifications for that event use new subject/content/variables from next trigger |
| **Company Channel Provider** | Provider (global), Company | Provider Credentials must reference an enabled provider; removing a provider blocks delivery on that channel |
| **Provider Credentials** | Company Channel Provider | Delivery for all domains bound to that credential set; rotating credentials requires updating `channelsToUse` on every affected domain |
| **Integration** | Company | The external apps using this token; revoking or rotating immediately blocks those callers |
| **Execution Log** | Notification attempt | Immutable — no downstream dependency; logs reference layout and theme IDs that were live at dispatch time |

### 5.1 High-Impact Changes

| Change | What Breaks or Requires Action |
|---|---|
| Replace the default theme | All future notifications use new brand tokens — verify layouts render correctly with new colors |
| Edit the default email layout | All future email notifications use the new structure — preview before activating |
| Rotate provider credentials | Update `channelsToUse` on every domain bound to the old credential set |
| Delete a custom domain | All events under it are deleted — verify no business service references those event keys |
| Rotate an integration token | All external apps using the old token lose access immediately — update their environment variables |

---

## 6. Ownership Matrix

> **Full ownership rules:** DEC-018 §5 (Asset Ownership Matrix) and §7 (No Cross-Boundary Writes).

| Asset | Platform-Owned | Company-Owned | Created By | May Be Deleted By |
|---|---|---|---|---|
| **Channel Catalogue** | ✅ Yes | — | Platform Ops | Platform Ops only |
| **Provider Catalogue** | ✅ Yes | — | Platform Ops | Platform Ops only |
| **Company** | — | ✅ Yes | Platform Admin | Platform Admin |
| **Theme** | — | ✅ Yes | Provisioning (default) · Company Owner | Company Owner / Admin |
| **Email Layout** | — | ✅ Yes | Provisioning (default) · Company Owner | Company Owner / Admin |
| **PDF Layout** | — | ✅ Yes | Provisioning (default) · Company Owner | Company Owner / Admin |
| **System Domain** | ✅ Managed | ✅ Scoped | Provisioning | ❌ Cannot delete (`isSystem: true`) |
| **Custom Domain** | — | ✅ Yes | Company Owner / Admin | Company Owner / Admin |
| **System Event** | ✅ Managed | ✅ Scoped | Provisioning | ❌ Cannot delete (planned) |
| **Custom Event** | — | ✅ Yes | Company Owner / Admin / Operator | Company Owner / Admin |
| **Company Channel Provider** | — | ✅ Yes | Company Owner / Admin | Company Owner / Admin |
| **Provider Credentials** | — | ✅ Yes | Company Owner / Admin | Company Owner / Admin |
| **Integration** | — | ✅ Yes | Company Owner / Admin | Company Owner / Admin |
| **Execution Log** | — | ✅ Yes | Notification Engine | ❌ Never deleted (audit record) |

**Platform-Managed / Company-Scoped** means the asset is created and governed by platform provisioning rules but belongs to the company's namespace and cannot be deleted by the company.

---

## 7. Communication States

Every communication asset passes through a lifecycle. These states are **not stored fields** — they are inferred from the combination of asset presence, configuration completeness, and active flags.

```
  ┌─────────────────┐
  │   PROVISIONED   │  Default asset exists. Content is platform defaults.
  └────────┬────────┘  No customisation yet. No delivery possible.
           │
           ▼
  ┌─────────────────┐
  │   CUSTOMISED    │  Company has edited theme colors, layout copy,
  └────────┬────────┘  or event subject/body. Content reflects brand.
           │           Preview is possible.
           ▼
  ┌─────────────────┐
  │   CONFIGURED    │  Provider credentials are bound to at least one
  └────────┬────────┘  domain channel. Delivery infrastructure is ready.
           │
           ▼
  ┌─────────────────┐
  │   OPERATIONAL   │  Notifications are being dispatched and logged.
  └────────┬────────┘  Execution Logs are accumulating.
           │
           ▼
  ┌─────────────────┐
  │   DEPRECATED    │  An asset is superseded. `isActive: false`.
  └────────┬────────┘  A new theme, layout, or event has replaced it.
           │           The old asset is retained for reference.
           ▼
  ┌─────────────────┐
  │    MIGRATED     │  A new mandatory asset was added to provisioning
  └────────┬────────┘  and backfilled into this company. The company's
           │           catalog is now aligned with the new platform baseline.
           ▼
  ┌─────────────────┐
  │    ARCHIVED     │  Asset is inactive, superseded, and retained only
  └─────────────────┘  for audit. Execution Logs that reference it remain
                       readable; the asset itself is no longer shown in UI.
```

### 7.1 State Descriptions

**Provisioned** — The provisioning service has run. Default theme, layouts, domains, and events exist. The company can browse and preview all content. No notification has been sent yet.

**Customised** — At least one content asset (theme token, layout HTML, event subject or body) has been edited by a company user. The company's notifications will reflect its own brand rather than the platform defaults.

**Configured** — The company has added at least one enabled provider and bound credentials to a domain channel via `channelsToUse`. Delivery is now structurally possible for that channel/domain combination.

**Operational** — The first real notification has been dispatched and an Execution Log entry exists. The company is actively using the communication system.

**Deprecated** — An asset has been replaced or deactivated but not removed. `isActive: false`. A new theme version, a replacement layout, or a superseded event. The asset record is retained for historical reference and for Execution Logs that captured its ID.

**Migrated** — A platform provisioning update introduced a new mandatory default asset. The backfill procedure (DEC-020 §8) has run and the new asset now exists in the company's catalog. Existing customisations were not touched.

**Archived** — An asset is fully inactive and no longer surfaced in the UI. Execution Logs that reference it by ID remain intact and readable. This state is terminal.

---

## 8. Maintenance Rules

### 8.1 Updating a Theme or Layout

```
  Company Admin opens Theme or Template editor
           │
           ▼
  Edit tokens / HTML in the editor UI
           │
           ▼
  Preview composed output
  (rendering engine — no provider required)
           │
           ▼
  Save changes
           │
           ▼
  All future notifications use the updated asset immediately
  (no deployment, no cache invalidation required)
```

Changing a theme or layout does **not** affect Execution Logs that were already recorded. Historical entries reference the layout and theme IDs that were live at dispatch time.

### 8.2 Adding a New Mandatory Communication Asset

> Full procedure: DEC-020 §7 (Change Management Procedure).

```
  1. Update DEC-020
     → Add asset specification
     → Reserve keys

  2. Update provisioning service
     → Add ensure* helper
     → Add to provisionCompany() sequence
     → Add to ProvisioningReportDto

  3. Write backfill procedure
     → Target all existing companies
     → Idempotency ensures no overwrites

  4. Update frontend
     → Reflect new asset in relevant pages

  5. Update tests
     → Provisioning unit tests
     → Integration tests

  6. Deploy in order
     → Schema migration → backend → backfill → frontend
```

### 8.3 Rotating Provider Credentials

```
  Company Admin opens Credentials page
           │
           ▼
  Create new credential record
  (old record still active — no downtime)
           │
           ▼
  Update channelsToUse on affected domains
  → replace old providerCredentialsId with new
           │
           ▼
  Delete old credential record
```

Because `channelsToUse` on each domain holds the credential reference directly, the switch is atomic per domain. One domain at a time can be migrated without affecting others.

### 8.4 Rotating an Integration Token

```
  Company Admin opens Integrations page → Rotate token
           │
           ▼
  New raw token generated and shown exactly once
           │
           ▼
  Old token invalidated immediately
           │
           ▼
  External app must update COMM_INTEGRATION_TOKEN
  in its environment variables before next request
```

Token rotation is irreversible. There is no grace period for the old token.

---

## 9. Golden Principles

These principles are binding across the entire Communication module. A violation of any of them is non-compliant with the platform architecture.

```
  NOTIFICATION ENTRY POINT
  ✓  NotificationService.notifyEvent() is the only permitted notification entry point.
     Business services, platform services, and external endpoints all converge there.
     No service may call a provider adapter directly.

  CONTENT SEPARATION
  ✓  Events never contain corporate HTML wrappers (header, footer, logo, brand colors).
     Layouts never contain event-specific subjects, message copy, or data.* variables.
     Themes never contain any message content.
     Company records never contain notification templates.

  RENDERING vs DELIVERY
  ✓  Rendering and delivery are independent phases.
     Rendering completes before delivery begins.
     A rendering failure aborts delivery.
     Delivery failure does not corrupt the rendered output.
     Preview always works — it requires only the rendering phase.

  CREDENTIAL SECURITY
  ✓  Credentials are company-scoped — no company can use another company's credentials.
     Credentials are decrypted only inside the provider adapter.
     No other layer ever sees decrypted secrets.
     Credentials are never returned in any API response.

  COMPANY IDENTITY
  ✓  companyId is always resolved server-side before NotificationService is called.
     External apps never send companyId — the integration token is the only source.
     Cross-company notification triggering is structurally impossible.

  PROVISIONING
  ✓  Every company starts provisioned — never empty.
     Provisioning is idempotent — running it twice never creates duplicates.
     Provisioning never sends notifications.
     The Notification Engine never creates or repairs provisioned assets.

  SYSTEM ASSETS
  ✓  System domains cannot be deleted (isSystem: true — enforced at service layer).
     Core fields on system domains cannot be modified.
     No mandatory asset is added to provisioning without first updating DEC-020.

  OBSERVABLE FAILURES
  ✓  Every notification attempt is logged — success and failure alike.
     ExecutionLog is always written, even when delivery fails.
     No notification failure is ever silent.

  STABLE IDENTITY
  ✓  eventKey and domainKey are immutable after creation.
     The canonical event key (domainKey.eventKey) is the stable contract
     between business services and the notification engine.
     Execution Logs record canonicalEventKey for every entry.
```

---

## 10. Relationship With Other Decisions

This document is the **architectural index** of the Communication module. The table below maps every relevant decision to its specific responsibility.

| Decision | Primary Responsibility | Read When You Need To… |
|---|---|---|
| **DEC-001** | Notification Endpoint Contract (207 multi-status response) | Understand the API response format for notification dispatch |
| **DEC-010** | Module Ownership and Communication Surfaces | Understand which NestJS module owns which communication concern |
| **DEC-012** | Platform Communication Resolution Strategy | Understand how platform-vs-company context is resolved for communication |
| **DEC-016** | Navigation Configuration Flow | Understand the Business App sidebar workflow order and its relation to the provisioning sequence |
| **DEC-017** | Company Provisioning — Default Events and Composition Model | Implement or understand provisioning, asset content specs, rendering flow, idempotency, validation rules |
| **DEC-018** | Communication Asset Ownership and Bounded Context Boundaries | Understand who owns each asset, which service creates it, execution log required fields |
| **DEC-019** | Notification Trigger Flow | Implement or understand how triggers reach NotificationService, companyId resolution for all three source types |
| **DEC-020** | Default System Domains, Templates and Events Provisioning | Understand `isSystem` semantics, the `notifications` domain, change management procedure, backfill |
| **DEC-021** | Communication Asset Lifecycle (this document) | Get the full system map, understand the ecosystem before reading any other decision |

### 10.1 Reading Order for New Developers

```
  DEC-021  ←  start here
     │
     ├── DEC-017  (provisioning + composition — the foundation)
     │
     ├── DEC-018  (ownership + bounded context)
     │
     ├── DEC-019  (trigger flow + external integration)
     │
     └── DEC-020  (isSystem + change management + backfill)
```

### 10.2 Finding the Right Document

| Question | Go To |
|---|---|
| What assets does a new company have after creation? | DEC-017 §3, §6, §15 |
| What is the exact rendering pipeline? | DEC-017 §8, §16 / DEC-018 §4 |
| Who owns the Event Catalogue? | DEC-018 §5 |
| How does an external app trigger a notification? | DEC-019 §6 |
| How is `companyId` resolved for an external trigger? | DEC-019 §6, §7 |
| What are the golden credential rules? | DEC-019 §7 |
| What does `isSystem: true` protect? | DEC-020 §3.2 |
| What is the `notifications` domain? | DEC-020 §4.3 |
| How do I add a new mandatory event to all companies? | DEC-020 §7 |
| How do I backfill a missing asset into existing companies? | DEC-020 §8 |
| Where is the full asset dependency map? | DEC-021 §5 (this section) |
| What are the golden architectural principles? | DEC-021 §9 (this section) |
