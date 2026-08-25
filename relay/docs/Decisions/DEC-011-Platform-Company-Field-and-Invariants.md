# DEC-011 — Platform Company Field and Invariants

| Field | Value |
|---|---|
| ID | DEC-011 |
| Status | **Approved (2026-06-23)** |
| Authors | Architecture |
| Last Updated | 2026-06-23 |
| Depends on | ADR-004, DEC-004 Amendment A3 |
| Extends | ADR-005 |

---

## 1. Problem

DEC-004 A3 established that `platform_admin` users must have `companyId` pointing to the Grapifly platform company. It set `companyKey MUST be 'grapifly'` as the validation rule.

This introduces two structural weaknesses:

1. **Hardcoded business name in infrastructure.** Every guard, validator, and resolver that checks `companyKey === 'grapifly'` couples system behaviour to a string. Renaming the company key breaks invisible invariants.

2. **No schema-enforced uniqueness.** Nothing prevents a second company from being mistakenly created as a platform company, or prevents the platform company from being accidentally deleted or deactivated.

---

## 2. Decision

### 2.1 New field: `isPlatformCompany`

Add to the `companies` collection schema:

```typescript
// company.schema.ts
@Prop({ type: Boolean, default: false, required: true })
isPlatformCompany: boolean;
```

Default: `false` for all customer companies.  
Value: `true` for exactly one document — the Grapifly seed company.

### 2.2 Database-enforced uniqueness

Create a unique partial index on the companies collection:

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

This guarantees at the storage layer that at most one platform company can exist. No application-layer check provides equivalent protection.

### 2.3 Updated validation rule for platform_admin (replaces DEC-004 A3 §A3.6)

Old rule:
```
platform_admin.companyKey MUST be 'grapifly'
```

New rule:
```
platform_admin.companyId MUST reference a company document where isPlatformCompany === true
```

No code may reference `'grapifly'` (or any hardcoded string) to identify the platform company.  
All lookups use:

```typescript
const platformCompany = await CompanyModel.findOne({ isPlatformCompany: true });
```

### 2.4 Service-layer protection rules

The following operations on the platform company are rejected at the service layer:

| Operation | Condition that triggers rejection | HTTP response |
|---|---|---|
| `DELETE /companies/:id` | `company.isPlatformCompany === true` | 422 Unprocessable Entity |
| `PATCH /companies/:id` → `isActive: false` | `company.isPlatformCompany === true` | 422 |
| `PATCH /companies/:id` → change `companyKey` | `company.isPlatformCompany === true` | 422 |
| `PATCH /companies/:id` → `isPlatformCompany: false` | `company.isPlatformCompany === true` | 422 |
| `POST /companies` → `isPlatformCompany: true` | always | 422 |

Response body must include a machine-readable error code: `PLATFORM_COMPANY_PROTECTED`.

### 2.5 Bootstrap sequence

`UsersBootstrapService` must execute in this order:

```
1. findOne({ isPlatformCompany: true })

2. IF not found:
   INSERT {
     displayName: 'Grapifly',
     companyKey:  'grapifly',
     isPlatformCompany: true,
     isActive: true
   }

3. Resolve platformCompany._id

4. Upsert seed platform_admin user:
   {
     email:      process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL,
     role:       'platform_admin',
     scope:      'global',
     companyId:  platformCompany._id,
     companyKey: platformCompany.companyKey
   }
```

`CompanyBootstrapService` is the preferred name for the split-off service that owns step 1–3.

---

## 3. Formal Invariants

| ID | Invariant | Enforcement |
|---|---|---|
| INV-PC-001 | Exactly one company has `isPlatformCompany === true` | Unique partial index |
| INV-PC-002 | Platform company cannot be soft-deleted or hard-deleted | Service guard |
| INV-PC-003 | Platform company `companyKey` is immutable after bootstrap | Service guard |
| INV-PC-004 | `isPlatformCompany: true` cannot be set to `false` once set | Service guard |
| INV-PC-005 | `platform_admin.companyId` must point to the platform company | User creation / validation |
| INV-PC-006 | Customer companies always have `isPlatformCompany: false` | Schema default + DTO strip |
| INV-PC-007 | Platform company created only during bootstrap — never via API | Service guard on `POST /companies` |
| INV-PC-008 | No service may use `companyKey === 'grapifly'` as platform discriminator | Code review invariant |

---

## 4. Schema Change

### 4.1 `company.schema.ts`

```typescript
@Prop({ type: Boolean, default: false, required: true })
isPlatformCompany: boolean;
```

### 4.2 `CreateCompanyDto`

```typescript
// isPlatformCompany must NOT be exposed in any public DTO.
// It is stripped by the DTO and set only by the bootstrap service.
```

### 4.3 `UpdateCompanyDto`

```typescript
// isPlatformCompany must NOT be updatable via the PATCH endpoint.
// Excluded from UpdateCompanyDto entirely.
```

---

## 5. Credential and Template Resolution

All services that resolve platform-level resources must use `isPlatformCompany === true`:

```typescript
// ✅ CORRECT
async getPlatformCredentials(): Promise<ProviderCredential[]> {
  const platform = await this.companyModel.findOne({ isPlatformCompany: true });
  return this.credentialsModel.find({ companyId: platform._id });
}

// ❌ WRONG — hardcodes business name
async getPlatformCredentials(): Promise<ProviderCredential[]> {
  return this.credentialsModel.find({ companyKey: 'grapifly' });
}
```

This applies to:
- `PlatformMailService` — SMTP credential resolution
- `MailResolverService` — sender credential scope resolution
- Any future notification template or branding resolver

---

## 6. Access Control — Unchanged

| Rule | Status |
|---|---|
| `platform_admin` access is governed by `scope: 'global'` | Unchanged |
| `platform_admin.companyId` points to the platform company for operational purposes | Unchanged (from DEC-004 A3) |
| `companyId === null` must never be used as the global access discriminator | Unchanged (from DEC-004 A3) |
| Customer companies are accessed by `scope === 'company'` and own `companyId` | Unchanged |

---

## 7. Migration

### 7.1 Schema migration

```javascript
// Step 1: Add isPlatformCompany: false to all existing companies
db.companies.updateMany(
  { isPlatformCompany: { $exists: false } },
  { $set: { isPlatformCompany: false } }
);

// Step 2: Set isPlatformCompany: true on the Grapifly seed company
// (Bootstrap service handles this on next startup via upsert logic;
//  manual backfill only needed if bootstrap has already run)
db.companies.updateOne(
  { companyKey: 'grapifly' },
  { $set: { isPlatformCompany: true } }
);

// Step 3: Create unique partial index
db.companies.createIndex(
  { isPlatformCompany: 1 },
  {
    unique: true,
    partialFilterExpression: { isPlatformCompany: true },
    name: 'unique_platform_company'
  }
);
```

### 7.2 Test data

Any test that creates a company fixture must include `isPlatformCompany: false`.  
Any test that creates a platform admin must ensure a company fixture with `isPlatformCompany: true` exists first.

---

## 8. Impact on Existing Documents

| Document | Change |
|---|---|
| DEC-004 A3 §A3.4 backend validation | `companyKey MUST be 'grapifly'` → `companyId MUST reference isPlatformCompany === true` |
| DEC-004 A3 §A3.6 seed bootstrap | Updated to use `isPlatformCompany: true` lookup |
| DEC-010 §4.3 MailResolverService | Resolution must use `isPlatformCompany: true`; `companyId is null` branch is dead code |
| Database.md | `isPlatformCompany` field added; index added; migration entry added |

---

## 9. Test Scenarios

| # | Scenario | Expected |
|---|---|---|
| PC-01 | Bootstrap on empty DB | Platform company created with `isPlatformCompany: true` |
| PC-02 | Bootstrap on DB with existing platform company | No duplicate created |
| PC-03 | Attempt to create second company with `isPlatformCompany: true` via API | 422 `PLATFORM_COMPANY_PROTECTED` |
| PC-04 | Attempt to insert duplicate via direct DB write | MongoDB unique index violation |
| PC-05 | DELETE /companies/:platformCompanyId | 422 `PLATFORM_COMPANY_PROTECTED` |
| PC-06 | PATCH /companies/:platformCompanyId with `isActive: false` | 422 `PLATFORM_COMPANY_PROTECTED` |
| PC-07 | PATCH /companies/:platformCompanyId with new `companyKey` | 422 `PLATFORM_COMPANY_PROTECTED` |
| PC-08 | Customer company DELETE | 200 — proceeds normally |
| PC-09 | platform_admin JWT | `companyId` resolves to platform company where `isPlatformCompany === true` |
| PC-10 | `PlatformMailService` credential resolution | Finds credentials via `isPlatformCompany === true`, not `companyKey === 'grapifly'` |
