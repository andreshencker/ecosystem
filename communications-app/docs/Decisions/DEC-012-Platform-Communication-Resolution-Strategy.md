# DEC-012 — Platform Communication Resolution Strategy

| Field | Value |
|---|---|
| ID | DEC-012 |
| Status | **Approved (2026-06-23)** |
| Authors | Architecture |
| Last Updated | 2026-06-23 |
| Depends on | ADR-004, ADR-005, ADR-006, DEC-010 |
| Supersedes | DEC-010 §4 (Invitation Sender Credential Rules — invitation-only algorithm replaced by the general model below) |

---

## 1. Problem

After ADR-004 and ADR-005, the system has two communication contexts (platform and company). DEC-010 §4 introduced `senderCredentialScope` to handle the invitation credential case. This is incomplete:

- It covers credentials for invitations only.
- It does not cover templates, branding, or non-invitation communication types.
- It uses a partial algorithm in `MailResolverService` that duplicates ownership logic.
- There is no formal rule for operational notifications, password resets, email verification, or future channels.

Without a general rule, each service independently implements its own version of the same resource lookup — scattered, duplicated, and inconsistent.

---

## 2. Communication Ownership Model

### 2.1 Ownership Principle

Every outbound communication is **owned** by exactly one company. The owner company's credentials, templates, and branding are used. The owner is always one of:

- The **Platform Company** (`isPlatformCompany === true`) — for platform-lifecycle communications
- A specific **Tenant Company** — for company-operational communications

### 2.2 Communication Type Taxonomy

```
PLATFORM_OWNED types:
  EMAIL_VERIFICATION          — platform manages auth for all users
  PASSWORD_RESET              — platform manages auth for all users
  PLATFORM_ADMIN_INVITATION   — inviting a new platform operator
  COMPANY_OWNER_INVITATION    — platform onboarding a new customer
  PLATFORM_ANNOUNCEMENT       — platform broadcast to all companies
  BILLING_NOTIFICATION        — platform billing events
  SECURITY_ALERT              — platform security events

COMPANY_OWNED types:
  COMPANY_USER_INVITATION     — company inviting their own team (admin, operator, viewer)
  DOMAIN_EVENT_NOTIFICATION   — company event triggers
  OPERATIONAL_NOTIFICATION    — company operational workflows
  INVOICE_GENERATED           — company billing to its customers
  REPORT_GENERATED            — company data delivery
  COMPANY_ANNOUNCEMENT        — company broadcast to its own users
```

**Decision rule for new types:** If the communication is part of the platform's relationship with a company → platform-owned. If it is part of a company's relationship with its own users → company-owned.

### 2.3 Ownership Classification Table

| Communication | Owner | Fallback allowed |
|---|---|---|
| Email verification | Platform | No credentials fallback needed |
| Password reset | Platform | No credentials fallback needed |
| Platform admin invitation | Platform | No credentials fallback needed |
| Company owner invitation | Platform | No credentials fallback needed |
| Company user invitation | Company | Credentials fallback: yes (onboarding) |
| Domain / event notification | Company | Credentials fallback: **no** |
| Operational notification | Company | Credentials fallback: **no** |
| Invoice, report delivery | Company | Credentials fallback: **no** |

---

## 3. CommunicationContext

The calling service always constructs and passes an explicit `CommunicationContext`. The resolver never infers ownership.

### 3.1 TypeScript Interface

```typescript
enum CommunicationChannel {
  EMAIL = 'email',
  SMS   = 'sms',
  PUSH  = 'push',
}

enum CommunicationType {
  // Platform-owned
  EMAIL_VERIFICATION        = 'EMAIL_VERIFICATION',
  PASSWORD_RESET            = 'PASSWORD_RESET',
  PLATFORM_ADMIN_INVITATION = 'PLATFORM_ADMIN_INVITATION',
  COMPANY_OWNER_INVITATION  = 'COMPANY_OWNER_INVITATION',
  PLATFORM_ANNOUNCEMENT     = 'PLATFORM_ANNOUNCEMENT',
  BILLING_NOTIFICATION      = 'BILLING_NOTIFICATION',
  SECURITY_ALERT            = 'SECURITY_ALERT',

  // Company-owned
  COMPANY_USER_INVITATION   = 'COMPANY_USER_INVITATION',
  DOMAIN_EVENT_NOTIFICATION = 'DOMAIN_EVENT_NOTIFICATION',
  OPERATIONAL_NOTIFICATION  = 'OPERATIONAL_NOTIFICATION',
  INVOICE_GENERATED         = 'INVOICE_GENERATED',
  REPORT_GENERATED          = 'REPORT_GENERATED',
  COMPANY_ANNOUNCEMENT      = 'COMPANY_ANNOUNCEMENT',
}

interface CommunicationContext {
  ownerCompanyId: ObjectId;          // always set — modules or tenant _id
  channel: CommunicationChannel;
  communicationType: CommunicationType;
}

interface ResolvedCommunicationResources {
  credentials:       ProviderCredential | null;
  template:          CommunicationTemplate | null;
  branding:          CompanyBranding | null;
  fallbackApplied: {
    credentials: boolean;
    template:    boolean;
    branding:    boolean;
  };
}
```

### 3.2 Context Construction Helpers

`CommunicationContextResolver` exposes two factory methods for convenience:

```typescript
// For modules-owned communications
async platformContext(
  channel: CommunicationChannel,
  type: CommunicationType
): Promise<CommunicationContext>
// → ownerCompanyId = platformCompany._id (found by isPlatformCompany === true)

// For company-owned communications
companyContext(
  companyId: ObjectId,
  channel: CommunicationChannel,
  type: CommunicationType
): CommunicationContext
// → ownerCompanyId = companyId
```

---

## 4. Resolution Algorithms

### 4.1 Credential Resolution

```
FUNCTION resolveCredentials(ctx: CommunicationContext): ProviderCredential | null

  credential = ProviderCredentials.findOne({
    companyId: ctx.ownerCompanyId,
    channelType: ctx.channel,
    isActive: true
  })

  IF credential found:
    RETURN credential

  // Credential not found for owner company
  isPlatformContext = (ctx.ownerCompanyId === platformCompany._id)

  IF isPlatformContext:
    THROW CommunicationConfigurationError("Platform credentials not configured for channel: " + ctx.channel)

  // Tenant context — check fallback eligibility
  IF ctx.communicationType NOT IN ONBOARDING_TYPES:
    THROW CommunicationConfigurationError(
      "Company " + ctx.ownerCompanyId + " has no credentials for channel " + ctx.channel +
      ". Fallback is not permitted for operational communications."
    )

  // Onboarding type — fall back to platform credentials
  LOG.warn("Company credential not found. Falling back to platform credentials.", { companyId, channel, type })

  platformCredential = ProviderCredentials.findOne({
    companyId: platformCompany._id,
    channelType: ctx.channel,
    isActive: true
  })

  IF NOT platformCredential:
    THROW CommunicationConfigurationError("Platform fallback credentials also missing for channel: " + ctx.channel)

  RETURN platformCredential WITH fallbackApplied.credentials = true

ONBOARDING_TYPES = [
  COMPANY_USER_INVITATION
  // future: other types where company may not yet have credentials
]
```

### 4.2 Template Resolution

```
FUNCTION resolveTemplate(ctx: CommunicationContext): CommunicationTemplate | null

  template = CommunicationTemplates.findOne({
    ownerCompanyId: ctx.ownerCompanyId,
    communicationType: ctx.communicationType,
    isActive: true
  })

  IF template found:
    RETURN template

  isPlatformContext = (ctx.ownerCompanyId === platformCompany._id)

  IF isPlatformContext:
    RETURN built-in hardcoded default template for ctx.communicationType
    // Log warning: platform DB template not found, using built-in
    // This should only happen during bootstrap or misconfiguration

  // Tenant context — fall back to platform template
  LOG.info("Tenant template not found. Falling back to platform template.", { companyId, type })

  platformTemplate = CommunicationTemplates.findOne({
    ownerCompanyId: platformCompany._id,
    communicationType: ctx.communicationType,
    isActive: true
  })

  IF platformTemplate found:
    RETURN platformTemplate WITH fallbackApplied.template = true

  RETURN built-in hardcoded default template for ctx.communicationType
  // Log warning: fallback template also missing
```

### 4.3 Branding Resolution

```
FUNCTION resolveBranding(ctx: CommunicationContext): CompanyBranding

  branding = CompanyBranding.findOne({ companyId: ctx.ownerCompanyId })

  IF branding found:
    RETURN branding

  isPlatformContext = (ctx.ownerCompanyId === platformCompany._id)

  IF isPlatformContext:
    RETURN platform defaults: { senderName: 'Grapifly', senderEmail: env.PLATFORM_FROM_EMAIL }
    // No logo, no custom colours — bootstrap fallback

  // Tenant context — fall back to platform branding
  LOG.info("Tenant branding not found. Using platform branding.", { companyId })

  platformBranding = CompanyBranding.findOne({
    companyId: platformCompany._id
  })

  IF platformBranding found:
    RETURN platformBranding WITH fallbackApplied.branding = true

  RETURN platform defaults
```

### 4.4 Fallback Summary Table

| Context | Resource | Fallback target | Allowed? |
|---|---|---|---|
| Platform | Credentials | None | Config error |
| Platform | Templates | Built-in hardcoded | Yes — emergency |
| Platform | Branding | Platform defaults (env) | Yes — bootstrap |
| Company — onboarding | Credentials | Platform credentials | Yes — with warning log |
| Company — operational | Credentials | None | **No — hard error** |
| Company | Templates | Platform template of same type | Yes |
| Company | Branding | Platform branding | Yes |

---

## 5. CommunicationContextResolver Service

### 5.1 Location

```
src/infrastructure/communication/communication-context.resolver.ts
src/infrastructure/communication/communication-context.module.ts
```

Located in the `infrastructure` layer as a shared, cross-module utility. Imported by AuthModule, InvitationModule, NotificationModule.

### 5.2 Public Interface

```typescript
@Injectable()
export class CommunicationContextResolver {

  // Build a modules-owned context
  async platformContext(
    channel: CommunicationChannel,
    type: CommunicationType
  ): Promise<CommunicationContext>

  // Build a company-owned context (synchronous — no DB lookup needed)
  companyContext(
    companyId: ObjectId,
    channel: CommunicationChannel,
    type: CommunicationType
  ): CommunicationContext

  // Resolve all three resource types for a context
  async resolve(
    ctx: CommunicationContext
  ): Promise<ResolvedCommunicationResources>

  // Convenience: resolve credentials only (avoids template/branding lookups)
  async resolveCredentials(ctx: CommunicationContext): Promise<ProviderCredential>
}
```

### 5.3 Dependency Injection

`CommunicationContextResolver` depends on:
- `CompanyModel` — to find `isPlatformCompany === true`
- `ProviderCredentialsModel` — credential lookup
- `CommunicationTemplateModel` — template lookup (future)
- `CompanyBrandingModel` — branding lookup (future)

---

## 6. Service Responsibility Map

Each service declares the correct context. Neither the resolver nor the dispatcher may override the caller's declared context.

| Service | Method / scenario | Context | Reason |
|---|---|---|---|
| `AuthService` | `sendVerificationEmail()` | Platform | Platform auth lifecycle |
| `AuthService` | `sendPasswordReset()` | Platform | Platform auth lifecycle |
| `InvitationService` | invite `platform_admin` | Platform | Platform inviting platform operator |
| `InvitationService` | invite `company_owner` | Platform | Platform onboarding a new customer |
| `InvitationService` | invite `company_admin / operator / viewer` | Company (`actor.companyId`) | Company managing its own team |
| `NotificationService` | test notification | Company (`actor.companyId`) | Testing company's own pipeline |
| `NotificationService` | event-triggered notification | Company (`event.companyId`) | Company operational workflow |
| Future `BillingService` | invoice delivery | Platform | Platform billing relationship |
| Future `ReportService` | report delivery | Company | Company data |

---

## 7. Relation to DEC-006

### What DEC-010 §4 said

DEC-010 §4.1 defined: invitations to `platform_admin` or `company_owner` → platform SMTP; invitations to `company_admin`, `operator`, `viewer` → company SMTP with platform fallback.

DEC-010 §4.3 defined `MailResolverService` with a credential-only algorithm.

### What changes

| DEC-006 element | Status under DEC-008 |
|---|---|
| §4.1 Invitation sender rule | Absorbed into DEC-012 §2.3 (ownership classification table) |
| §4.2 `resolveInvitationScopes()` function | Replaced by `CommunicationContextResolver.companyContext()` / `platformContext()` |
| §4.3 `MailResolverService` algorithm | **Superseded** — replaced by `CommunicationContextResolver.resolveCredentials()` |
| §4.4 Fallback behaviour | Superseded — replaced by DEC-012 §4.4 with formal per-type rules |
| `senderCredentialScope` on Invitation documents | **Retained** as a denormalized audit field; no longer the authoritative resolution input |

### What DEC-006 remains authoritative for

DEC-010 §1 (dual-surface module model), §2 (security rule), and §3 (module surface definitions) are unchanged and remain authoritative.

---

## 8. Schema Changes Required

### 8.1 `CommunicationTemplate` collection (new)

```typescript
{
  ownerCompanyId:    ObjectId,   // modules company or tenant company
  communicationType: string,     // CommunicationType enum value
  channel:           string,     // CommunicationChannel enum value
  name:              string,
  subjectTemplate:   string,     // for email: Handlebars/Mustache subject
  bodyHtmlTemplate:  string,     // for email: HTML body template
  bodyTextTemplate:  string,     // plain text fallback
  isActive:          boolean,
  createdAt:         Date,
  updatedAt:         Date,
}
```

Index: `{ ownerCompanyId, communicationType, channel, isActive }` — compound.

### 8.2 `CompanyBranding` collection (new)

```typescript
{
  companyId:      ObjectId,   // unique — one branding per company
  senderName:     string,     // e.g. "Acme Corp" or "Grapifly"
  senderEmail:    string,     // e.g. "noreply@acme.com"
  logoUrl:        string | null,
  primaryColor:   string | null,  // hex colour
  footerText:     string | null,
  updatedAt:      Date,
}
```

Index: `{ companyId }` — unique.

### 8.3 Invitation document update

Add `communicationType: CommunicationType` to the `Invitation` schema to support DEC-008 resolution. The existing `senderCredentialScope` field is retained as an audit hint.

---

## 9. Short-Term vs Long-Term Template Model

### Short-term (current implementation)

Platform communication templates (verification, reset, invitations) remain code-defined inside `PlatformMailService` / `AuthService`. This is acceptable for the initial implementation.

`CommunicationContextResolver.resolveTemplate()` returns `null` for platform-owned types in the short term. The calling service falls back to its hardcoded template.

### Long-term target

1. Platform templates moved to the `CommunicationTemplate` collection with `ownerCompanyId = platformCompany._id`.
2. Tenant companies can create custom templates for any `communicationType`.
3. Resolution is fully database-driven — no hardcoded templates remain in code.

---

## 10. Multi-Channel Scalability

The model scales to new channels without redesign:

| Adding a new channel | Required changes |
|---|---|
| Add enum value to `CommunicationChannel` | 1 line |
| Implement channel-specific dispatcher | New dispatcher class |
| Add credentials for the channel in company settings | Data only |
| Add templates for the channel in template collection | Data only |
| Ownership model, context, fallback rules | **No change** |

---

## 11. White-label Tenant Readiness

White-label tenants are supported by the existing model with no special casing:

| Concern | Resolution |
|---|---|
| Own sender identity | Company's `CompanyBranding.senderName` + `senderEmail` |
| Own logo | Company's `CompanyBranding.logoUrl` |
| Own SMTP credentials | Company's `ProviderCredentials` for email channel |
| Own notification templates | Company's `CommunicationTemplate` documents |
| Platform templates as base | Automatic fallback for types the company hasn't customised |

---

## 12. Error Handling

| Error class | When thrown | HTTP equivalent |
|---|---|---|
| `CommunicationConfigurationError` | Platform credentials missing | 500 (config error — not user fault) |
| `CommunicationConfigurationError` | Company credentials missing + no fallback permitted | 422 — company must configure credentials |
| `CommunicationOwnerNotFoundError` | `isPlatformCompany === true` company not found | 500 (bootstrap failure) |

All errors must be logged with full context (companyId, channel, communicationType) for operational debugging.

---

## 13. Migration and Bootstrap Impact

### 13.1 Bootstrap sequence update

```
1. Ensure platform company exists (isPlatformCompany: true)  ← ADR-005
2. Ensure seed platform admin exists                          ← ADR-004
3. Seed platform company branding (CompanyBranding document)
4. Seed platform SMTP credentials for email channel (ProviderCredentials)
5. Seed platform templates for: EMAIL_VERIFICATION, PASSWORD_RESET,
   PLATFORM_ADMIN_INVITATION, COMPANY_OWNER_INVITATION
```

Steps 3–5 are new. The bootstrap service must be extended.

### 13.2 Existing data

`MailResolverService` is the only existing service with credential resolution logic. It handles invitations only. It must be deprecated and replaced by `CommunicationContextResolver` in a single, planned refactor pass.

The `senderCredentialScope` field on existing `Invitation` documents requires no migration — it is retained as an audit field.

---

## 14. Implementation Checklist

> **Build status (2026-06-23):** `npm run build` passes with 0 TypeScript errors. Pre-existing test failures remain (67 failing — unimplemented controller/service stubs, not related to communication resolution).

- [x] `PlatformMailService.sendInvitation()` implemented — delegates to `inviteUserHtml` / `inviteUserSubject` templates via the private `send()` method. `MailResolverService` call sites type-check correctly. *(2026-06-23)*
- [x] `Company` schema has `isPlatformCompany: Boolean` with unique partial index — prerequisite for `CommunicationContextResolver.platformContext()`. *(2026-06-23)*
- [x] `UsersBootstrapService` creates the Grapifly platform company (`isPlatformCompany: true`) and seeds `admin@grapifly.com` with `companyId = <grapifly._id>` — satisfies DEC-012 §13.1 steps 1–2. *(2026-06-23)*
- [ ] Create `CommunicationChannel` and `CommunicationType` enums
- [ ] Create `CommunicationContext` and `ResolvedCommunicationResources` interfaces
- [ ] Implement `CommunicationContextResolver` in `src/infrastructure/communication/`
- [ ] Create `CommunicationContextModule` and export resolver
- [ ] Update `AuthService.sendVerificationEmail()` to use `platformContext()`
- [ ] Update `AuthService.sendPasswordReset()` to use `platformContext()`
- [ ] Update `InvitationService` — split platform/company context by target role
- [ ] Deprecate `MailResolverService` — route all callers through `CommunicationContextResolver`
- [ ] Create `CommunicationTemplate` schema and collection
- [ ] Create `CompanyBranding` schema and collection
- [ ] Update bootstrap service to seed platform branding + credentials + templates (DEC-012 §13.1 steps 3–5)
- [ ] Add `communicationType` to `Invitation` schema
- [ ] Update `Database.md` with new collections and indexes

---

## 15. Test Scenarios

| # | Scenario | Expected |
|---|---|---|
| CR-01 | `platformContext()` resolves to platform company | ownerCompanyId = platform company _id |
| CR-02 | `companyContext(companyId)` resolves to tenant company | ownerCompanyId = companyId |
| CR-03 | Platform credential lookup — credential found | Returns credential, no fallback |
| CR-04 | Platform credential lookup — credential missing | Throws `CommunicationConfigurationError` |
| CR-05 | Company credential lookup — credential found | Returns credential, no fallback |
| CR-06 | Company credential lookup — missing, onboarding type | Returns platform credential, `fallbackApplied.credentials = true` |
| CR-07 | Company credential lookup — missing, operational type | Throws `CommunicationConfigurationError` |
| CR-08 | Template lookup — tenant has own template | Returns tenant template, no fallback |
| CR-09 | Template lookup — tenant missing, platform template exists | Returns platform template, `fallbackApplied.template = true` |
| CR-10 | Branding lookup — tenant has own branding | Returns tenant branding, no fallback |
| CR-11 | Branding lookup — tenant missing branding | Returns platform branding, `fallbackApplied.branding = true` |
| CR-12 | `AuthService` password reset | Uses platform context |
| CR-13 | `InvitationService` invites company_owner | Uses platform context |
| CR-14 | `InvitationService` invites company_admin | Uses company context with actor.companyId |
| CR-15 | `NotificationService` test notification | Uses company context |
| CR-16 | Company sends operational notification without credentials | Hard error — no fallback |
