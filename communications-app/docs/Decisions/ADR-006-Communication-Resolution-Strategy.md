---
date: 2026-06-23
status: accepted
tags: [adr, architecture, backend, communication, modules, multi-tenant]
---

# ADR-006: Communication Resolution Strategy

## Status

Accepted — 2026-06-23

Builds on [[ADR-004 Platform Operator Company Model]] and [[ADR-005 Platform Company Field and Invariants]].
Supersedes the invitation-specific credential algorithm in DEC-010 §4.3 with a general-purpose communication resolution model.

---

## Context

After ADR-004 and ADR-005, the system has two distinct communication contexts:

**Platform context** — communications that the platform sends as part of its own operational flow. Examples: owner invitations, password resets, email verification, security alerts.

**Company context** — communications that tenant companies send as part of their own operational workflows. Examples: team member invitations, domain event notifications, invoice delivery.

DEC-010 §4 introduced `senderCredentialScope: 'platform' | 'company'` to handle the invitation case. This is a partial solution. It answers *which credential scope to use* for invitations only. It does not answer:

- Which template to use for any communication type.
- Which branding (logo, sender identity, colours) to apply.
- Who owns operational notifications.
- How to scale this to new channels (SMS, push, storage).
- How to handle fallback at each resource type consistently.

Without a general rule, each service (AuthService, InvitationService, NotificationService) independently implements its own version of the same lookup. The result is scattered, duplicated, and inconsistent logic across modules.

---

## Decision

### Principle: Every communication has exactly one owner

Every outbound communication is owned by exactly one company. That company's credentials, templates, and branding are used. The owner is always one of:

- The **Platform Company** (`isPlatformCompany === true`)
- A specific **Tenant Company**

This owner is declared explicitly by the calling service as a `CommunicationContext`. The resolution infrastructure does not infer ownership from the initiating user's role or scope — the caller always states it.

---

### 1. Communication Ownership Classification

The following rule determines which company owns a communication:

**Platform-owned** when the communication is part of the platform's own operational lifecycle — not part of any tenant company's workflow:

| Communication Type | Reason |
|---|---|
| Email verification | Platform manages auth for all users |
| Password reset | Platform manages auth for all users |
| Platform admin invitation | Inviting another platform operator |
| Company owner invitation | Platform onboarding a new customer |
| Platform announcements | Platform-to-all-customers broadcast |
| Billing notifications | Platform billing relationship |
| Security alerts | Platform security events |

**Company-owned** when the communication is part of a tenant company's own operational workflow:

| Communication Type | Reason |
|---|---|
| Company user invitations (admin, operator, viewer) | Company managing its own team |
| Domain / event-triggered notifications | Company operational workflows |
| Invoice delivery to customers | Company business outputs |
| Report delivery | Company data to its users |
| Company announcements | Company to its own users |

**Key rule for ambiguous cases:** When in doubt, ask — *"Is this communication part of the platform's relationship with the company, or the company's relationship with its own users?"* The former is platform-owned. The latter is company-owned.

---

### 2. CommunicationContext

Every communication is initiated with a `CommunicationContext` that identifies the owner. The context is constructed by the calling service before any resource resolution:

```typescript
interface CommunicationContext {
  ownerCompanyId: ObjectId;         // modules company or tenant company _id
  channel: CommunicationChannel;   // 'email' | 'sms' | 'push' | ...
  communicationType: CommunicationType; // drives template + branding selection
}
```

The calling service is responsible for constructing this object. The resolution infrastructure is not responsible for inferring it.

---

### 3. Resource Resolution Algorithm

`CommunicationContextResolver.resolve(ctx)` executes three parallel lookups:

**Credential Resolution:**
```
1. Find active credential: { companyId: ctx.ownerCompanyId, channelType: ctx.channel }
2. If found → use it.
3. If NOT found AND owner is a tenant company AND communicationType is an onboarding type:
     fallback → find credential for platformCompany on same channel
4. If still not found → throw CommunicationConfigurationError
```

**Template Resolution:**
```
1. Find template: { ownerCompanyId: ctx.ownerCompanyId, communicationType: ctx.communicationType }
2. If NOT found AND owner is a tenant company:
     fallback → find template for platformCompany, same communicationType
3. If still not found → use built-in hardcoded default (emergency fallback only)
```

**Branding Resolution:**
```
1. Find branding: { companyId: ctx.ownerCompanyId }
2. If NOT found AND owner is a tenant company:
     fallback → find platformCompany branding
3. If still not found → use platform name + no logo
```

---

### 4. Fallback Policy

The fallback policy is deliberately asymmetric. Not all resource types fall back in all contexts:

| Context | Credentials fallback | Template fallback | Branding fallback |
|---|---|---|---|
| **Platform** | None — config error | Built-in default | Platform defaults |
| **Company — onboarding type** | Yes → platform credentials | Yes → platform template | Yes → platform branding |
| **Company — operational type** | **No — hard error** | Yes → platform template | Yes → platform branding |

**Critical rule:** Credential fallback for operational notifications is explicitly forbidden. If a company has not configured their SMTP credentials and they attempt to send an operational notification, the system returns a clear configuration error. It does not silently send from the platform's sender identity — that would be a privacy, deliverability, and branding violation.

---

### 5. CommunicationContextResolver Service

A dedicated service owns all resolution logic. No other service may directly query credentials, templates, or branding for communication purposes.

```
CommunicationContextResolver
  ├── platformContext(channel, communicationType) → CommunicationContext
  ├── companyContext(companyId, channel, communicationType) → CommunicationContext
  └── resolve(ctx) → ResolvedCommunicationResources
        ├── credentials: ProviderCredential | null
        ├── template: Template | null
        ├── branding: CompanyBranding | null
        └── fallbackApplied: { credentials: boolean; template: boolean; branding: boolean }
```

The `fallbackApplied` field enables callers and monitoring tools to detect when platform fallback was used for a company context, which should be logged as a warning.

---

### 6. Service Responsibility Map

Each calling service is responsible for declaring the correct context. The resolver is responsible for finding resources. Neither may override the other's domain.

| Service | Context it must declare | Reason |
|---|---|---|
| `AuthService` — email verification | Platform | Platform manages auth lifecycle |
| `AuthService` — password reset | Platform | Platform manages auth lifecycle |
| `InvitationService` — owner/admin invitation | Platform | Platform onboarding a customer |
| `InvitationService` — company user invitation | **Platform** ¹ | See amendment note below |
| `NotificationService` — event trigger | Company | Company operational workflow |
| `NotificationService` — test notification | Company | Testing company's own pipeline |

No service may determine context by inspecting the actor's role or scope. The context is determined by the **purpose of the communication**, not the identity of the sender.

> **¹ Amendment — 2026-07-07:** The original table classified company user invitations as "Company" context. This was revised during implementation. All invitation events (`company_admin_invitation`, `company_user_invitation`, `company_invitation_resent`, `company_welcome_message`) now use **Platform** context.
>
> **Reason:** An invited user's company may not yet have a `CommunicationConnection` configured (newly provisioned companies start with no connection). Using the Platform connection ensures delivery regardless of the tenant's configuration state. The `companyId` is still passed for diagnostic logging but does not affect which connection is used.
>
> **Authoritative source:** `business-app/docs/communications/auth-communication-events.md` and `communication-event-routing.md`.

---

### 7. Template Ownership

Templates are stored per company. Platform templates use `ownerCompanyId = platformCompany._id`. Company templates use `ownerCompanyId = company._id`.

A `communicationType` field on each template enables lookup by purpose:

```
Templates for platformCompany:
  EMAIL_VERIFICATION, PASSWORD_RESET, PLATFORM_ADMIN_INVITATION, COMPANY_OWNER_INVITATION, ...

Templates for a tenant company:
  COMPANY_USER_INVITATION, OPERATIONAL_NOTIFICATION, INVOICE, ...
```

Tenant templates can customise any platform template type by creating their own version. The resolver always checks the tenant first and falls back to the platform template of the same type.

In the short term, platform templates (verification, reset, invitation) are code-defined inside `PlatformMailService`. The long-term target is database-managed platform templates owned by the platform company.

---

### 8. Branding Ownership

`CompanyBranding` is a document per company containing:

| Field | Purpose |
|---|---|
| `logoUrl` | Sender logo in HTML emails |
| `primaryColor` | Email accent colour |
| `senderName` | `From:` display name |
| `senderEmail` | `From:` email address |
| `footerText` | Legal / unsubscribe footer |

Resolution: own company → platform company fallback. Every tenant can override platform branding. A tenant with no branding configured inherits platform branding seamlessly.

---

### 9. Multi-channel Applicability

The `CommunicationContext.channel` field makes the model channel-agnostic:

| Channel | Credential type | Template rendering |
|---|---|---|
| `email` | SMTP config | HTML + plain text |
| `sms` | SMS provider API key | Plain text only |
| `push` | Push service credentials | Title + body |
| `storage` | Not a communication channel | N/A |

Adding a new channel requires adding a `CommunicationChannel` enum value and implementing the channel-specific dispatcher. The ownership model, context declaration, and fallback rules are identical across all channels.

---

### 10. Relation to DEC-006

DEC-010 §4 introduced `senderCredentialScope` and a partial `MailResolverService` algorithm for invitations. That model is correct for invitations but incomplete.

DEC-010 §4 is **superseded** by DEC-008. The `senderCredentialScope` field on `Invitation` documents is retained but its meaning is absorbed into the `CommunicationContext` model. The `MailResolverService` algorithm is replaced by `CommunicationContextResolver`.

DEC-010 §1–§3 (dual-surface module model and security rule) are unaffected.

---

## Consequences

### Positive

- A single, explicit model covers all communication types, channels, and resource types.
- Fallback logic is defined once in `CommunicationContextResolver`, not reimplemented in each service.
- Credential fallback for operational notifications is explicitly banned, preventing silent privacy violations.
- Template and branding resolution follow the same ownership principle as credentials — consistent mental model.
- White-label tenants are supported by default: their `ownerCompanyId` resolves to their own branding and credentials.
- Adding a new channel requires no changes to the ownership or resolution model.

### Negative

- `CommunicationContextResolver` is a new service that all communication-initiating services must depend on. Existing services (AuthService, InvitationService) need updates.
- Platform templates are currently code-defined. Moving them to database-managed templates requires a migration.
- `CompanyBranding` is a new collection that does not yet exist.
- DEC-010 §4.3 `MailResolverService` is superseded and must be replaced (not extended) by `CommunicationContextResolver`.

### Neutral

- The `senderCredentialScope` field on `Invitation` documents can be retained as a denormalized hint for audit/debugging purposes but is no longer the authoritative resolution input.
- The resolution model makes `PLATFORM_SMTP_*` environment variables a bootstrap-only fallback rather than the primary credential source.

---

## Related

- [[Decisions]] — full ADR index
- [[ADR-004 Platform Operator Company Model]] — establishes the platform company
- [[ADR-005 Platform Company Field and Invariants]] — formalizes `isPlatformCompany`
- DEC-006 — dual-surface model (§1–§3 valid; §4 superseded by DEC-008)
- DEC-008 — full technical specification of the resolution algorithm
