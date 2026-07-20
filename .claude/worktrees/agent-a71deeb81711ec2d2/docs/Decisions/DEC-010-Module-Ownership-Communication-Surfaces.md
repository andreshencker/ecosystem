# DEC-010 — Module Ownership, Admin Views and Invitation Sender Credentials

| Field | Value |
|---|---|
| ID | DEC-010 |
| Status | **Approved (2026-06-16) — §4 partially superseded by DEC-008 (2026-06-23)** |
| Authors | Architecture |
| Last Updated | 2026-06-23 |
| Depends on | DEC-004 Amendment A2, DEC-005 |

> ⚠️ **Partial supersession (2026-06-23):** DEC-008 supersedes §4 of this document (Invitation Sender Credential Rules). The `MailResolverService` algorithm in §4.3 is replaced by `CommunicationContextResolver`. The `senderCredentialScope` field on `Invitation` documents is retained as an audit hint but is no longer the authoritative resolution input.
>
> **Sections §1–§3 (dual-surface module model, security rule, module surface definitions) remain fully authoritative and are not affected.**

---

## 1. Dual-Surface Module Model

Every module that exposes data to users defines two surfaces. This document is the authoritative reference for this rule.

### Surface 1 — Company Business View

| Attribute | Value |
|---|---|
| Roles | `company_owner`, `company_admin`, `operator`, `viewer` |
| Data scope | Filtered by `authContext.companyId` |
| Backend rule | Every query must apply `WHERE companyId = authContext.companyId` |
| Navigation | Company sidebar: My Company, Users, Notifications, Reports & Files |

### Surface 2 — Platform Admin Support View

| Attribute | Value |
|---|---|
| Role | `platform_admin` only |
| Data scope | Global — no `companyId` filter applied |
| Backend rule | No `companyId` filter. |
| Navigation | Platform admin sidebar: Platform Management, Support / Operations |

**platform_admin does not operate as a company user.** There is no hybrid view where an admin acts inside a company via the sidebar. Direct URL access to company routes is permitted for support investigation only.

---

## 2. Security Rule

```
Backend modules must NEVER use:
  if (role === 'platform_admin') { ... different logic ... }

Separation must occur through:
  - JWT scope field (global vs company)
  - Guards (RolesGuard, ScopeGuard)
  - Dedicated routes (e.g. /companies vs /company)
  - Platform surface vs business surface
```

Correct pattern for data filtering:

```typescript
// Controller:
const companyId = ctx.scope === 'company' ? ctx.companyId : null;

// Service:
const filter = companyId ? { companyId } : {};  // global: no filter
```

---

## 3. Module Surface Definitions

Before implementing any module, its surface definitions must be documented here.

| Module | Business Route | Business Roles | Platform Route | Platform Role | Status |
|---|---|---|---|---|---|
| Users / Team | `/users` | owner, admin | `/users` (global) | platform_admin | Implemented |
| Companies | `/company` | owner, admin | `/companies` | platform_admin | Partial |
| Platform Admins | — | — | `/platform-admins` | platform_admin | Coming Soon |
| Channels | — | — | `/channels` | platform_admin | Coming Soon |
| Providers | — | — | `/providers` | platform_admin | Coming Soon |
| Global Templates | — | — | `/global-templates` | platform_admin | Coming Soon |
| Channel Providers | `/company-channel-providers` | owner, admin | — | — | Coming Soon |
| Credentials | `/provider-credentials` | owner, admin | — | — | Coming Soon |
| Templates | `/layout-templates` | owner, admin | — | — | Coming Soon |
| Domain Catalogue | `/domain-catalogue` | owner, admin | — | — | Coming Soon |
| Event Catalogue | `/event-catalogue` | owner, admin | — | — | Coming Soon |
| Test Notifications | `/notifications/test` | owner, admin, operator | `/support/failed-notifications` | platform_admin | Coming Soon |
| Reports | `/files/reports` | owner, admin, operator, viewer | `/support/company-activity` | platform_admin | Coming Soon |
| Media | `/files/media` | owner, admin, operator | — | — | Coming Soon |
| Storage | `/files/storage` | owner, admin, operator | — | — | Coming Soon |
| Audit Logs | — | — | `/audit-logs` | platform_admin | Coming Soon |
| API Usage | — | — | `/support/api-usage` | platform_admin | Coming Soon |
| Error Logs | — | — | `/support/error-logs` | platform_admin | Coming Soon |

---

## 4. Invitation Sender Credential Rules

### 4.1 Rule

| Invitation type | Endpoint | Sender |
|---|---|---|
| `platform_admin` invites `platform_admin` | `POST /users/invite` | Platform company credentials |
| `platform_admin` creates `company_owner` | `POST /companies/with-owner` | New company's credentials (provisioned at creation) |
| `company_owner` invites `company_admin / operator / viewer` | `POST /users/invite` | Company's own credentials |
| `company_admin` invites `operator / viewer` | `POST /users/invite` | Company's own credentials |

> **Revised 2026-06-29:** All invitation notifications are delivered through `NotificationService.notifyEvent()`. There is no direct use of platform SMTP or a global fallback. Each notification uses the credentials of the resolved `companyId`. See DEC-013 Rev-1, DEC-014 Rev-1.

> **`company_owner` is not invitable via `POST /users/invite`.** See DEC-009 Rev-2 §4.1.

### 4.2 Scope derivation

Set automatically in `UsersService.invite()` based on target role:

```typescript
function resolveInvitationScopes(role: UserRole) {
  const isPlatformLevel = role === 'platform_admin' || role === 'company_owner';
  const scope = isPlatformLevel ? 'platform' : 'company';
  return { invitationScope: scope, senderCredentialScope: scope };
}
```

### 4.3 MailResolverService

`src/infrastructure/platform-mail/mail-resolver.service.ts`

Resolution algorithm:

```
FUNCTION sendInvitation(params):
  IF params.senderCredentialScope === 'platform' OR params.companyId is null:
    → PlatformMailService.sendInvitation(params)
    RETURN

  smtp = resolveCompanySmtp(params.companyId)

  IF smtp is null:
    LOG warning: "Company has no SMTP credential — falling back to platform sender"
    → PlatformMailService.sendInvitation(params)
    RETURN

  → nodemailer.sendMail via company transporter
  ON ERROR:
    LOG error
    → PlatformMailService.sendInvitation(params)  // fallback

FUNCTION resolveCompanySmtp(companyId):
  ccps = CompanyChannelProvider.find({ companyId, isActive: true })
           .populate('providerId')

  smtpCcp = first ccp where providerId.connectionType === 'smtp'

  IF smtpCcp is null: RETURN null

  cred = ProviderCredentials.findOne({
    companyChannelProviderId: smtpCcp._id,
    isActive: true
  })

  IF cred is null: RETURN null

  smtp = CryptoService.decryptJson(cred.encrypted)

  IF smtp.host AND smtp.user AND smtp.pass:
    RETURN nodemailer.createTransport(smtp)

  RETURN null
```

### 4.4 Fallback behaviour

If a company has no configured SMTP provider credential, invitations for that company fall back to the platform sender with a warning log. This ensures invitation delivery is never blocked by missing company configuration.

---

## 5. Implementation Checklist (before each module)

Before implementing any new module, add its surface definition to §3 of this document and confirm:

- [ ] Backend: query uses `companyId` filter when `authContext.scope === 'company'`
- [ ] Backend: platform_admin path applies no `companyId` filter
- [ ] Backend: no `if (role === 'platform_admin')` inside business logic
- [ ] Frontend: module page reads data scope from `authStore.companyId`, not from role
- [ ] route-rules.ts: company route excluded from `platform_admin.allowedRoutes`
- [ ] role-config.ts: platform surface route excluded from company role sidebars
