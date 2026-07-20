---
date: 2026-06-23
status: accepted
tags: [adr, architecture, backend, data-model, modules, schema]
---

# ADR-005: Platform Company Field and Invariants

## Status

Accepted — 2026-06-23

Extends [[ADR-004 Platform Operator Company Model]].
Resolves the deferred placeholder in ADR-004 §1 (`"type": "platform_owner" (or a isPlatformCompany: true flag)`).

---

## Context

[[ADR-004 Platform Operator Company Model]] established that a platform operator company must exist as the owner of all platform-level communication resources. It correctly decided *that* this company must exist, but left the discriminator ambiguous:

> `"type": "platform_owner" (or a isPlatformCompany: true flag)`

This ambiguity creates two concrete problems:

**Problem 1 — Hardcoded identity.**  
DEC-004 A3 resolved the discriminator as `companyKey === 'grapifly'`. This hardcodes a business name into infrastructure validation logic. If the company key ever changes, every validation rule that references the string `'grapifly'` breaks silently. The platform company identity should be represented as a structural database property, not a name convention.

**Problem 2 — No system-enforced invariant.**  
Nothing in the current schema prevents:
- A second company being created with `isPlatformCompany === true`.
- The platform company being deleted or deactivated.
- The platform company's `companyKey` being changed.
- A future developer creating a customer company with the same key.

These are silent failure modes. The platform company must be protected by the schema and service layer, not by documentation alone.

---

## Decision

### 1. Add `isPlatformCompany: Boolean` to the Company schema

```typescript
isPlatformCompany: {
  type: Boolean,
  default: false,
  required: true,
  immutable: false,   // immutable only through service-layer guard, not schema lock
}
```

All customer companies have `isPlatformCompany: false` (the default). Only the Grapifly seed company has `isPlatformCompany: true`.

---

### 2. Enforce uniqueness at the database level

A unique partial index ensures that at most one document can have `isPlatformCompany: true`:

```javascript
db.companies.createIndex(
  { isPlatformCompany: 1 },
  {
    unique: true,
    partialFilterExpression: { isPlatformCompany: true },
    name: 'unique_platform_company'
  }
)
```

This is a database-enforced invariant. No application-layer check can substitute for it.

---

### 3. Replace hardcoded key references in backend validation

Old rule (DEC-004 A3):
```
platform_admin.companyKey MUST be 'grapifly'
```

New rule:
```
platform_admin.companyId MUST reference the document where isPlatformCompany === true
```

No backend rule may reference the string `'grapifly'` to identify the platform company. The lookup is always:

```typescript
const platformCompany = await CompanyModel.findOne({ isPlatformCompany: true });
```

---

### 4. Service-layer protection invariants

The following operations on the platform company must be rejected at the service layer (HTTP 403 or 422 with a clear message):

| Operation | Rule |
|---|---|
| `DELETE /companies/:id` | Rejected if `company.isPlatformCompany === true` |
| `PATCH /companies/:id` with `isActive: false` | Rejected if `company.isPlatformCompany === true` |
| `PATCH /companies/:id` with `companyKey: <new value>` | Rejected if `company.isPlatformCompany === true` |
| `POST /companies` with `isPlatformCompany: true` | Rejected always — platform company is seeded, never created via API |
| `PATCH /companies/:id` with `isPlatformCompany: false` | Rejected if current `isPlatformCompany === true` — cannot un-mark the platform company |

---

### 5. Bootstrap auto-creation

`UsersBootstrapService` (or a dedicated `PlatformCompanyBootstrapService`) must:

1. On every application startup, check if a company with `isPlatformCompany === true` exists.
2. If none exists, create it:
   ```json
   {
     "displayName": "Grapifly",
     "companyKey": "grapifly",
     "isPlatformCompany": true,
     "isActive": true
   }
   ```
3. Only then proceed to create or update the seed `platform_admin` user.

The platform company is never created via `POST /auth/register` or `POST /companies`.

---

### 6. Credential and template resolution

All services that resolve platform-level resources (SMTP credentials, notification templates, branding) must look up by `isPlatformCompany === true`, never by `companyKey === 'grapifly'`:

```typescript
// CORRECT
const platformCompany = await CompanyModel.findOne({ isPlatformCompany: true });
const credentials = await ProviderCredentialsModel.find({ companyId: platformCompany._id });

// WRONG — hardcodes business name
const credentials = await ProviderCredentialsModel.find({ companyKey: 'grapifly' });
```

---

## Formal Invariants

| ID | Invariant |
|---|---|
| INV-PC-001 | Exactly one company document has `isPlatformCompany === true` at all times. Enforced by a unique partial index. |
| INV-PC-002 | The platform company cannot be soft-deleted (`isActive = false`) or hard-deleted. Enforced at service layer. |
| INV-PC-003 | The platform company's `companyKey` is immutable after bootstrap creation. Enforced at service layer. |
| INV-PC-004 | The platform company's `isPlatformCompany` field cannot be set to `false` once true. Enforced at service layer. |
| INV-PC-005 | `platform_admin` users must have `companyId` pointing to the platform company (`isPlatformCompany === true`). Enforced during user creation and validation. |
| INV-PC-006 | Customer companies must have `isPlatformCompany: false`. This is the default; the field cannot be set to `true` via any API endpoint. |
| INV-PC-007 | The platform company is created during bootstrap only. The `POST /companies` endpoint must reject any request with `isPlatformCompany: true`. |
| INV-PC-008 | No backend service or guard may use `companyKey === 'grapifly'` (or any hardcoded company name) as the discriminator for platform identity. The lookup is always `isPlatformCompany === true`. |

---

## What this changes

| Before (ADR-004 / DEC-004 A3) | After (ADR-005) |
|---|---|
| Platform company identified by `companyKey === 'grapifly'` | Platform company identified by `isPlatformCompany === true` |
| No unique constraint — second platform company possible | Unique partial index prevents duplicates |
| No service-layer protection on delete/deactivate | Service layer rejects destructive operations on platform company |
| `platform_admin` validation checks hardcoded key | `platform_admin` validation checks `isPlatformCompany === true` lookup |
| `PlatformMailService` resolution logic is heuristic | Resolution is deterministic: find company where `isPlatformCompany === true` |

## What does NOT change

| Concern | Still true |
|---|---|
| `platform_admin` has global access via `scope: 'global'` | Yes — unchanged |
| Platform company name is Grapifly, key is `grapifly` | Yes — these are data values, not code identifiers |
| Access control is governed by `scope`, not `companyId` | Yes — unchanged |
| DEC-005 invitation lifecycle | Yes — unchanged |
| Three-layer protection model | Yes — unchanged |

---

## Consequences

### Positive

- The platform company is a first-class, schema-enforced concept. No documentation or convention required to identify it.
- Renaming Grapifly (display name or company key) does not break any validation rule.
- The unique partial index provides a database-level guarantee stronger than any application check.
- Consistent lookup pattern: all services use `isPlatformCompany === true`, eliminating string-hardcoding across the codebase.
- Protection rules (no delete, no deactivate, no key rename) prevent accidental or adversarial destruction of the platform company.

### Negative

- Schema migration required: existing companies collection must have `isPlatformCompany: false` added to all documents, and the Grapifly seed must have `isPlatformCompany: true` set.
- `CompaniesService` update, delete, and patch handlers need explicit guard checks.
- Any existing test that sets up a company without `isPlatformCompany` must be updated to add `isPlatformCompany: false`.

### Neutral

- The string `'grapifly'` continues to appear in seed data and configuration as a default value — it is just no longer a code-level identifier used in guards or validators.

---

## Implementation checklist

- [ ] Add `isPlatformCompany: Boolean, default: false` to `company.schema.ts`
- [ ] Create unique partial index `{ isPlatformCompany: 1 }` where `isPlatformCompany: true`
- [ ] `CompaniesService.remove()` — guard: reject if `isPlatformCompany === true`
- [ ] `CompaniesService.update()` — guard: reject `isActive: false` or `companyKey` change or `isPlatformCompany: false` if current is true
- [ ] `POST /companies` DTO — strip `isPlatformCompany` field; reject if present and true
- [ ] `UsersBootstrapService` — `findOne({ isPlatformCompany: true })` before upsert; create with `isPlatformCompany: true` if absent
- [ ] `UsersService` (platform_admin validation) — replace `companyKey === 'grapifly'` check with `company.isPlatformCompany === true` lookup
- [ ] `PlatformMailService` / `MailResolverService` — replace key-based lookup with `isPlatformCompany: true` lookup
- [ ] Migration script — backfill `isPlatformCompany: false` on all existing companies; set `isPlatformCompany: true` on Grapifly seed
- [ ] Update `Database.md` migration history

---

## Related

- [[Decisions]] — full ADR index
- [[ADR-004 Platform Operator Company Model]] — establishes why the platform company exists; this ADR formalizes how it is identified
- DEC-004 Amendment A3 — backend validation rule updated by this decision
- DEC-007 — formal schema and invariant specification (project docs)
