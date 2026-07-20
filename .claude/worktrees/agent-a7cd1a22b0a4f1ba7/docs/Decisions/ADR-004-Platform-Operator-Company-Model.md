---
date: 2026-06-23
status: accepted
tags: [adr, architecture, backend, data-model, modules, auth]
---

# ADR-004: Platform Operator Company Model

## Status

Accepted — 2026-06-23

Supersedes **DEC-004 A2 Business Rule BR-004** ("platform_admin must never have companyId or companyKey — any non-null value is invalid"). That rule is replaced by Amendment A3 of DEC-004.

Extended by [[ADR-005 Platform Company Field and Invariants]] — formalizes the `isPlatformCompany` discriminator field, schema-level uniqueness constraint, service-layer protection rules, and the requirement to use `isPlatformCompany === true` lookups instead of hardcoded key references.

---

## Context

DEC-004 Amendment A2 established that `platform_admin` users must have `companyId = null` and `companyKey = null`. The reasoning was that platform admins operate globally and are "above" all tenant companies.

This assumption breaks down when the platform needs to send outbound communication:

- Invitation emails sent to new `company_owner` accounts come from the platform, not from any tenant company.
- System notifications, password resets, and other platform-initiated emails need a sending identity.
- DEC-010 §4 worked around this by reading `PLATFORM_SMTP_*` environment variables directly, bypassing the company credential storage system entirely.

This workaround has two problems:

1. **Inconsistency.** Tenant companies store their SMTP credentials in the `provider_credentials` collection. The platform stores its own in env vars. Two systems, one purpose.
2. **No ownership.** There is no entity in the database that "owns" the platform's communication credentials. When the platform sends an email, the sender identity has no corresponding company record.

Additionally, the platform operator — Grapifly — is itself a product company that may need to manage its own channel configurations, templates, and credentials through the same tools it provides to tenants.

The correct solution is to give Grapifly a real company record and associate all `platform_admin` users with it. This makes the model consistent: **every user in the system belongs to a company**.

---

## Decision

### 1. Create the Grapifly platform operator company

A dedicated company record is created once during database seeding:

| Field | Value |
|---|---|
| `displayName` | Grapifly |
| `companyKey` | `grapifly` |
| `isPlatformCompany` | `true` |

The `isPlatformCompany` field is the formal discriminator. See [[ADR-005 Platform Company Field and Invariants]] for the schema definition, uniqueness constraint, and service-layer protection rules.

This company is never created via `POST /auth/register` or `POST /companies`. It is seeded at bootstrap.

---

### 2. All platform_admin users belong to Grapifly

| Field | Old value (DEC-004 A2) | New value (A3) |
|---|---|---|
| `companyId` | `null` | `<grapifly._id>` (required) |
| `companyKey` | `null` | `'grapifly'` (required) |
| `scope` | `'global'` | `'global'` (unchanged) |

The seed admin:

```json
{
  "email":      "admin@grapifly.com",
  "role":       "platform_admin",
  "scope":      "global",
  "companyId":  "<grapifly._id>",
  "companyKey": "grapifly"
}
```

---

### 3. Access control is governed by scope, not companyId

`companyId` now serves two distinct purposes depending on scope:

| `scope` | `companyId` meaning | Effect on data access |
|---|---|---|
| `'global'` | Identifies the operator company (Grapifly) | **Not used as a filter.** Global access to all data. |
| `'company'` | Identifies the tenant company the user belongs to | **Always applied as a filter.** Access limited to own company. |

The backend access rule is:

```
IF JWT.scope === 'global':
  → no companyId filter on any query
  → JWT.companyId is present but must NOT be used to restrict data access

IF JWT.scope === 'company':
  → every query must apply WHERE companyId = JWT.companyId
  → JWT.companyId identifies the tenant; access is bounded by it
```

**Access is controlled by `scope`, never by checking `companyId === null`.**  
Code that reads `if (authContext.companyId === null) { allow global access }` must be replaced by `if (authContext.scope === 'global')`.

---

### 4. Platform credentials belong to Grapifly

Platform-level communication credentials (SMTP for invitation emails, system notifications, etc.) are stored in the `provider_credentials` collection under `companyId = <grapifly._id>`, following the exact same structure as tenant credentials.

This replaces the `PLATFORM_SMTP_*` environment variable approach described in DEC-010 §4.3.

| Credential type | Owner | Storage |
|---|---|---|
| Platform SMTP (invitations, system emails) | Grapifly | `provider_credentials` where `companyId = grapifly._id` |
| Tenant SMTP | Tenant company | `provider_credentials` where `companyId = tenant._id` |

---

### 5. Invitation sender resolution update

DEC-010 §4.3 `MailResolverService` has this condition:

```typescript
IF params.senderCredentialScope === 'platform' OR params.companyId is null:
  → PlatformMailService.sendInvitation(params)
```

Under the new model, `params.companyId` is **never null** for platform_admin — it is Grapifly's ID. The `params.companyId is null` branch becomes unreachable for `platform_admin`.

The `senderCredentialScope === 'platform'` condition remains the correct primary discriminator and continues to work without change. The `OR params.companyId is null` clause should be removed in a future cleanup as it is now dead code for all production paths.

---

### 6. Seed bootstrap order

The seed must run in this order:

1. Create Grapifly company (no user required at this point).
2. Create seed `platform_admin` user with `companyId = grapifly._id`.

The `UsersBootstrapService` must ensure Grapifly exists before attempting to create or update the seed admin account.

---

### 7. Backend validation rule changes

Old rule (DEC-004 A2 §5.1):

```
IF role === 'platform_admin':
  companyId  MUST be null
  companyKey MUST be null
  scope      MUST be 'global'
```

New rule (A3):

```
IF role === 'platform_admin':
  companyId  MUST reference the company where isPlatformCompany === true
  companyKey MUST match that company's companyKey
  scope      MUST be 'global'
```

> **Refined by ADR-005:** The original A3 rule referenced the string `'grapifly'` directly. ADR-005 replaces all hardcoded key references with `isPlatformCompany === true` lookups.

---

## What does NOT change

| Concern | Still true |
|---|---|
| `platform_admin` has global access | Yes — governed by `scope: 'global'` |
| Company-scoped roles have their own tenant companyId | Yes — unchanged |
| Frontend `role-config.ts` `showCompanyName: false` for platform_admin | Yes — Grapifly company name is not shown in the navbar |
| DEC-005 §3.2 (inviting another platform_admin needs no targetCompanyId) | Yes — backend derives companyId from Grapifly automatically |
| Three-layer protection model (DEC-003) | Yes — unchanged |
| Public registration always creates company_owner | Yes — unchanged |

---

## Consequences

### Positive

- Every user in the system belongs to a company. The model is consistent.
- Platform SMTP credentials can be stored and managed through the same `provider_credentials` system used by tenants, instead of raw env vars.
- Grapifly gains a real company identity that can be managed through the admin interface.
- The `scope` field becomes the unambiguous authority for access control. No code needs to check `companyId === null` as a proxy for global access.

### Negative

- DEC-004 A2 BR-004 is superseded. Any backend validation that rejects `platform_admin` users with non-null `companyId` must be updated.
- The seed script must create the Grapifly company before any `platform_admin` account.
- DEC-010 §4.3 `MailResolverService` has `OR params.companyId is null` as dead code — should be cleaned up when that service is next touched.
- Any test assertion that verifies `JWT.companyId === null` for `platform_admin` must be updated to check `JWT.companyId === grapifly._id` and `JWT.scope === 'global'`.

### Neutral

- The JWT payload field `companyId` was already present but previously carried `null` for platform_admin. Its presence in the token shape is unchanged; only its value changes.
- `companyKey` was already in the JWT. Its value changes from `null` to `'grapifly'`.

---

## Related

- [[Decisions]] — full ADR index
- [[ADR-005 Platform Company Field and Invariants]] — formalizes the `isPlatformCompany` discriminator, uniqueness constraint, and protection rules
- [[ADR-001 Dual Navigation Strategy]] — dual-mode nav is unaffected by this change
- [[DEC-003 Role Navigation and Route Protection]] — three-layer protection model (unchanged)
- DEC-004 Amendment A3 — formal update to the role/scope mapping table and business rules
- DEC-005 — authentication and invitation lifecycle (§3.2 remains valid; §5 scope derivation unchanged)
- DEC-006 — module ownership and invitation sender credentials (§4.3 cleanup noted above)
