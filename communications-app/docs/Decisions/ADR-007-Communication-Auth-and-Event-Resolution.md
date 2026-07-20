---
date: 2026-07-05
status: accepted
tags: [adr, architecture, backend, communication, multi-tenant, auth, security, event-resolution]
---

# ADR-007: Communication Authentication, Trust Boundary, and Event Resolution

## Status

Accepted — 2026-07-05

Complements [[ADR-006 Communication Resolution Strategy]] and [[DEC-019 Notification Trigger Flow]].
Formally documents the security rules and event-resolution constraints that were implemented in the codebase during the 2026-07-05 architecture review session.

---

## Context

ADR-006 defined the general communication ownership model (platform vs. company ownership, fallback policies, `CommunicationContextResolver`). DEC-019 defined the single `notifyEvent()` pipeline and the three trigger sources.

Neither of those documents addressed a specific set of runtime security and data-isolation questions that emerged as the system moved from design to implementation:

1. **Body trust** — the notification endpoint received a `companyId` in the request body. Multiple code paths used that value to look up events, unintentionally allowing the caller to impersonate any company.

2. **Inconsistent companyId resolution** — the admin key path fell back to `dto.companyId` when the platform company was not configured. The integration-token path correctly resolved from the token, but there was no single rule that made this explicit.

3. **DomainCatalogue blocking delivery** — `EventCatalogueService.findByCompanyAndCanonicalKey` threw `400 Bad Request` when the domain was inactive. DEC-019 established that `EventCatalogue` is the source of truth for delivery decisions. An inactive domain should not prevent delivery of an active, enabled event.

4. **AuthContext field naming** — the `GlobalAuthGuard` wrote the resolved companyId into `authContext.organizationId`, a name inherited from an earlier model where the concept was called "organization". The correct domain concept in this system is `Company`. The field name `organizationId` was misleading and created confusion about what value it held.

5. **Missing explicit rule** — no single document stated, without ambiguity: *"Communications never trusts companyId from the request body."* Each developer who touched the notification endpoint had to rediscover this rule by reading the guard.

This ADR establishes the canonical, formally recorded answer to each of these questions. It is the v1 specification for the Communication system's trust model.

---

## Decision

### §1 — System Boundary and Responsibilities

The system is divided into two distinct actors with non-overlapping responsibilities.

#### Business App (caller)

Business App is responsible for:

- Deciding whether an event belongs to the **Platform** or to a specific **Company**
- Selecting the correct **authentication credential** (admin API key for platform-level operations; integration token for company-level operations)
- Building the notification payload (`event`, `email`, `phone`, `payload.data.*`)
- Calling `POST /notifications/event` with the correct header

Business App is **not** responsible for — and must not contain logic for:

| Concern | Owner |
|---|---|
| Selecting the email/SMS provider | Communications |
| Selecting or rendering the template | Communications |
| Deciding which channels are enabled | Communications |
| Encrypting or decrypting credentials | Communications |
| Knowing the company's branded layout | Communications |
| Knowing whether a channel is active | Communications |

The goal of this separation is that Communications can be extended with new channels (WhatsApp, push, webhook) without any change to Business App.

#### Communications (owner of all send logic)

Communications is responsible for:

- Authenticating every incoming request
- Resolving the **effective companyId** from the authentication mechanism — never from the request body
- Looking up the `EventCatalogue` for that company and event key
- Reading the channel configuration (`email.enabled`, `sms.enabled`, etc.)
- Resolving provider credentials for each enabled channel
- Rendering the template using the company's theme and layout
- Delivering via the provider adapter
- Writing the `ExecutionLog`

---

### §2 — Authentication Mechanisms

There are exactly two valid authentication mechanisms for the notification endpoint. No third mechanism will be added without a new ADR.

#### Mechanism A — COMMUNICATION_API_KEY

```
Caller sends:   x-api-key: <COMMUNICATION_API_KEY>
Guard resolves: isPlatformCompany === true → platform company record
Result:         authContext.companyId = platform company ObjectId
```

Used by:
- The Communications backend itself when processing internal events (auth flows, invitations, platform alerts)
- Platform administrators calling the notification endpoint directly

#### Mechanism B — Integration Token

```
Caller sends:   x-integration-token: gpf_live_<token>   (preferred)
            or  x-api-key: gpf_live_<token>             (legacy header, same effect)
Guard resolves: SHA-256(rawToken) → CompanyIntegration record → company
Result:         authContext.companyId = that company's ObjectId
```

Used by:
- Business App when it calls on behalf of a company
- External systems (ERP, CRM, mobile apps) connected via integration tokens

#### authContext shape after guard

Regardless of mechanism, after the guard runs, every authenticated request has:

```typescript
interface AuthContext {
  actorType: 'user' | 'apikey';
  companyId: string | null;   // ← always the resolved company; never from the body
  keyId?:    string;          // 'internal' | 'integration-token' | undefined
  userId?:   string;          // present for JWT (actorType === 'user')
}
```

---

### §3 — Trust Hierarchy: companyId Is Never Trusted from the Body

This is the central security rule of the notification endpoint.

```
RULE: Communications never reads companyId from the request body for
      any operational decision. The effective companyId is always and
      exclusively authContext.companyId, populated by GlobalAuthGuard.
```

The controller enforces this by building `effectiveDto` before calling the service:

```typescript
// Inside NotificationController.notifyEvent()
const effectiveCompanyId = authCtx?.companyId;         // ← from guard
if (!effectiveCompanyId) throw new UnauthorizedException(...);

const effectiveDto = { ...dto, companyId: effectiveCompanyId }; // ← override
await this.service.notifyEvent(effectiveDto);           // ← service never sees body value
```

The `companyId` field in `NotifyEventDto` is retained in the public API contract for backwards compatibility (existing callers send it) and for mismatch-warning logging. It is **never used** as the authoritative source of company identity.

If the guard resolves a different companyId than what the caller sent in the body, a warning is logged and the guard-resolved value is used. This makes misconfiguration visible without silently corrupting data.

---

### §4 — Event Resolution: Always Scoped by Company

Every query against `EventCatalogue` and `DomainCatalogue` must be scoped to the authenticated company. Global event lookups are prohibited.

```
PROHIBITED:
  this.eventModel.findOne({ eventKey: 'user_invitation' })

REQUIRED:
  // Canonical key path (domain.event format)
  this.domainModel.findOne({ companyId, domainKey })   →  domainId
  this.eventModel.findOne({ domainCatalogueId: domainId, eventKey, isActive: true })

  // Bare key path (legacy)
  this.domainModel.find({ companyId }).select('_id')   →  domainIds[]
  this.eventModel.findOne({ domainCatalogueId: { $in: domainIds }, eventKey, isActive: true })
```

The second isolation layer is `assertEventBelongsToCompanyOrThrow`, which verifies that the resolved event's domain belongs to the authenticated company even after the initial query.

---

### §5 — EventCatalogue as the Source of Truth for Delivery

The `EventCatalogue` document for a given event is the **only** authority over whether a channel should attempt delivery.

```
EventCatalogue.channelContent.email.enabled === true   → attempt email delivery
EventCatalogue.channelContent.email.enabled === false  → skip email (log reason)
EventCatalogue.channelContent.sms  (absent)            → skip SMS
```

No other document, field, or service may override this decision. In particular, `DomainCatalogue` must **not** be used to block delivery (see §6).

---

### §6 — DomainCatalogue Role: Organizational, Not a Delivery Gate

`DomainCatalogue` is a grouping and configuration document. It has two delivery-adjacent roles:

1. **Event lookup**: Events are stored under a domain. The domain must exist for the event to be found (a missing domain means the event cannot be resolved — this is a `NOT_FOUND` error, not a delivery block).

2. **Credential hints**: `DomainCatalogue.channelsToUse[].providerCredentialsId` provides an optional explicit credential reference for a channel. When present, it is used instead of the company default. When absent, `resolveDefault(companyId, channelKey)` is called.

`DomainCatalogue.isActive` is **not** a delivery gate. If a domain is inactive but the event exists and is enabled, delivery proceeds. The service logs a warning for observability:

```
WARN [EventCatalogueService] domain "security" is inactive — proceeding with
     event lookup (EventCatalogue is the delivery source of truth)
```

This rule prevents an operational accident (an admin toggling a domain off) from silently disabling all notifications for that domain, which would be a difficult-to-diagnose outage.

---

### §7 — Multi-tenancy: Complete Per-Company Isolation

The authenticated `companyId` must propagate through every layer of the notification pipeline. No layer may fetch assets (events, credentials, themes, layouts) from a different company.

| Resource | Isolation mechanism |
|---|---|
| `EventCatalogue` | Queried via domain, which is filtered by `companyId` |
| `DomainCatalogue` | Filtered directly by `companyId` |
| `ProviderCredentials` | Resolved via `companyId` + `channelKey` in `resolveDefault()`, or via an explicit `providerCredentialsId` that was itself stored under the authenticated company |
| `LayoutTemplate` | Resolved by `companyId` |
| `CompanyTheme` | Resolved by `companyId` |
| `ExecutionLog` | Written with `companyId`; list endpoint accepts `companyId` as a filter |

**Cross-company triggering is structurally impossible**: the integration token resolves exactly one company, and that companyId is used for every downstream lookup. An external caller cannot trigger a notification for a company other than the one whose token it holds.

---

### §8 — AuthContext.companyId Naming Convention

The internal `AuthContext` interface uses `companyId` as the field name for the resolved company identity. This is the only correct name within Communications.

```typescript
// CORRECT — internal AuthContext field
authCtx.companyId

// PROHIBITED — old name, removed from AuthContext interface
authCtx.organizationId  // ← does not exist
```

The JWT token payload issued by the auth backend may contain either `companyId` (new tokens) or `organizationId` (tokens issued before 2026-07-05). The guard handles both transparently:

```typescript
companyId: payload.companyId ?? payload.organizationId
```

This fallback is a **one-directional adapter** in the guard only. No other file may reference `organizationId` in an auth context.

---

### §9 — System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUSINESS APP                                   │
│                                                                             │
│   Decides: platform event?  → COMMUNICATION_API_KEY  (admin header)        │
│   Decides: company event?   → integration token      (x-api-key header)    │
│                                                                             │
│   Sends: event key · email · phone · payload.data.*                        │
│   Does NOT send: template · provider · channel decision · companyId        │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │  POST /notifications/event
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             COMMUNICATIONS                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  GlobalAuthGuard                                                    │   │
│  │                                                                     │   │
│  │  COMMUNICATION_API_KEY  →  resolvePlatformCompany()                 │   │
│  │                                  ↓                                  │   │
│  │                         authContext.companyId = platform company    │   │
│  │                                                                     │   │
│  │  integration token     →  resolveCompanyByToken()                   │   │
│  │                                  ↓                                  │   │
│  │                         authContext.companyId = token owner company │   │
│  └───────────────────────────────────┬─────────────────────────────────┘   │
│                                      │                                      │
│  ┌───────────────────────────────────▼─────────────────────────────────┐   │
│  │  NotificationController                                             │   │
│  │                                                                     │   │
│  │  effectiveCompanyId = authCtx.companyId  ← only valid source       │   │
│  │  effectiveDto       = { ...dto, companyId: effectiveCompanyId }    │   │
│  └───────────────────────────────────┬─────────────────────────────────┘   │
│                                      │                                      │
│  ┌───────────────────────────────────▼─────────────────────────────────┐   │
│  │  NotificationService.notifyEvent(effectiveDto)                      │   │
│  │                                                                     │   │
│  │  1. findByCompanyAndCanonicalKey(companyId, domainKey.eventKey)     │   │
│  │       └─ domain query:  { companyId, domainKey }  ← scoped         │   │
│  │       └─ event query:   { domainId, eventKey, isActive: true }     │   │
│  │                                                                     │   │
│  │  2. Read EventCatalogue.channelContent                              │   │
│  │       └─ .email.enabled  → attempt email?                          │   │
│  │       └─ .sms.enabled    → attempt SMS?                            │   │
│  │       (DomainCatalogue.isActive does NOT block delivery)           │   │
│  │                                                                     │   │
│  │  3. resolveCredentials(companyId, channelKey)                      │   │
│  │       └─ domain.channelsToUse[channel].providerCredentialsId (opt) │   │
│  │       └─ resolveDefault(companyId, channelKey)  (fallback)        │   │
│  │                                                                     │   │
│  │  4. renderEmail(companyId, eventKey, data)                         │   │
│  │       └─ Layout + Theme + EventContent  ← all scoped to companyId │   │
│  │                                                                     │   │
│  │  5. deliver via provider adapter                                   │   │
│  │                                                                     │   │
│  │  6. writeLog(companyId, channel, result)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### §10 — Golden Rules

The following rules are non-negotiable. Any code that violates them is non-compliant with this ADR.

```
✓  companyId always comes from authContext.companyId, populated by GlobalAuthGuard.
   Never from the request body. Never from a query parameter (except admin list endpoints).

✓  EventCatalogue is the sole authority for delivery decisions.
   If EventCatalogue says a channel is enabled, deliver.
   If it says disabled or absent, skip.
   Nothing else may override this.

✓  DomainCatalogue.isActive does not block delivery.
   An inactive domain produces a log warning and the lookup continues.
   The event's own isActive and channelContent.enabled are what matter.

✓  Every EventCatalogue and DomainCatalogue query must include a companyId scope.
   findOne({ eventKey }) without a companyId scope is prohibited.

✓  Business App is responsible for choosing the right credential.
   Communications is responsible for everything after the request arrives.
   Neither may reach into the other's domain.

✓  Integration tokens identify the company server-side.
   External callers must not send companyId. The server resolves it from the token.
   Cross-company triggering via the body is structurally impossible.

✓  All company assets (events, credentials, themes, layouts) are isolated per company.
   No query may return assets belonging to a different company than the one authenticated.

✓  AuthContext uses companyId as the field name. organizationId does not exist in AuthContext.
   The guard's JWT fallback (payload.companyId ?? payload.organizationId) is the only place
   where the legacy name may appear, and only for token backwards-compatibility.
```

---

## Consequences

### Positive

- **Security by construction** — it is not possible to trigger a notification for a company other than the authenticated one. The body's `companyId` value is ignored; only the token decides.
- **Predictable behavior** — all three trigger sources (platform admin, internal service, external app) go through the same pipeline with the same resolution logic. There are no special cases.
- **Operational resilience** — an admin accidentally deactivating a domain does not silently disable notifications. The `EventCatalogue` remains the single control surface for delivery.
- **Clear ownership** — Business App teams know exactly what they are responsible for (choosing credentials, building payloads). Communications teams know they own everything downstream.
- **Safe JWT migration** — the `payload.companyId ?? payload.organizationId` fallback allows token rotation to happen gradually without forcing a coordinated deploy of all services.
- **Extensible to new channels** — the pipeline is channel-agnostic. Adding WhatsApp, push, or webhook requires no changes to Business App or to the authentication layer.

### Negative

- **Preview endpoint limited to platform company** — `POST /notifications/preview/event-by-key` authenticated with `COMMUNICATION_API_KEY` can only preview events belonging to the platform company. Admins who want to preview a tenant company's events must authenticate with a JWT for that company. This is intentional but may require a dedicated platform admin preview mechanism in the future.
- **body.companyId is a documented no-op** — the field exists in the DTO (for backwards compatibility), is validated, and is then ignored. This is a minor confusion surface for new callers who might expect it to work. The API documentation must clearly state that the field is informational only.

### Neutral

- The `companyId` field in `NotifyEventDto` remains `@IsString()` required. Removing it would technically be a backwards-compatible change, but is deferred to avoid any friction with existing callers. The value is received, logged for mismatch detection, and discarded.
- `DomainCatalogue.channelsToUse` continues to provide optional credential hints. It is a secondary configuration layer, not a delivery gate. This distinction must be preserved in any future evolution of the domain model.

---

## Relations

| Decision | Relationship |
|---|---|
| [ADR-004](ADR-004-Platform-Operator-Company-Model.md) | Establishes the platform company that admin-key auth resolves to |
| [ADR-005](ADR-005-Platform-Company-Field-and-Invariants.md) | Formalizes `isPlatformCompany` used by `resolvePlatformCompany()` |
| [ADR-006](ADR-006-Communication-Resolution-Strategy.md) | General ownership model; this ADR adds the runtime trust rules |
| [DEC-001](DEC-001-Notification-Endpoint-Contract.md) | `POST /notifications/event` response contract (200 / 207) |
| [DEC-011](DEC-011-Platform-Company-Field-and-Invariants.md) | Technical invariants of the platform company record |
| [DEC-012](DEC-012-Platform-Communication-Resolution-Strategy.md) | Communication resolution at the platform vs company boundary |
| [DEC-017](DEC-017-Company-Provisioning-Default-Events.md) | Default events provisioned per company at creation time |
| [DEC-018](DEC-018-Communication-Asset-Ownership.md) | Who creates and who consumes communication assets |
| [DEC-019](DEC-019-Notification-Trigger-Flow.md) | Full pipeline description; this ADR's §3–§7 are the runtime enforcement of DEC-019's Golden Rules |
| [DEC-021](DEC-021-Communication-Asset-Lifecycle.md) | Master lifecycle map for all communication assets |
