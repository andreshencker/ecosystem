---
id: DEC-020
title: Default System Domains, Templates and Events Provisioning
status: Accepted
created: 2026-06-28
tags: [backend, provisioning, isSystem, system-domains, notifications-domain, change-management, backfill, system-assets]
---

# DEC-020 — Default System Domains, Templates and Events Provisioning

> **Prerequisite reading — read these first.**
> This decision is a focused extension. It records only what is NOT already covered by the predecessor documents.
>
> | Document | Covers |
> |---|---|
> | **DEC-017** | Provisioning lifecycle · Default asset content specs · Composition model · Rendering flow · Idempotency · Validation rules · Future domain catalog |
> | **DEC-018** | Asset ownership · Bounded context boundaries · Canonical event key · Cross-boundary write rules · Execution log fields |
> | **DEC-019** | Trigger flow · `companyId` resolution · External application integration |
>
> Do not duplicate content from those documents here. Cross-reference instead.

---

## 1. Purpose

This document is the **mandatory gate** for every communication asset that is automatically provisioned when a new company is created.

Before any new mandatory communication asset is added to provisioning, it **must be documented in this DEC first**. Implementation without a prior DEC update is non-compliant.

This document adds four topics that DEC-017 and DEC-018 deliberately left out of scope:

1. The `isSystem` flag and its enforcement semantics
2. The `notifications` domain as the planned second default system domain
3. The explicit channel provisioning rule
4. The change management and backfill procedures for future mandatory assets

---

## 2. What is Already Documented — Reference Map

Do not re-read this section as a definition. Follow the links to the source.

| Topic | Source |
|---|---|
| Default Theme creation | DEC-017 §3, §4, §15, §22 |
| Default Email Layout creation | DEC-017 §4, §15 |
| Default PDF Layout creation | DEC-017 §4, §15 |
| Default Domain Catalogue creation | DEC-017 §5, §18 |
| Default Event Catalogue creation | DEC-017 §6, §7 |
| Notification rendering flow | DEC-017 §8, §16, §22 |
| Theme / Layout / Event content separation | DEC-017 §2 |
| Template ownership | DEC-018 §5 |
| Layout ownership | DEC-018 §5 |
| Theme ownership | DEC-018 §5 |
| Bounded context: Provisioning vs Notification Engine | DEC-018 §2–4 |
| What provisioning must NOT create | DEC-017 §3.2, DEC-018 §3.3–3.4 |
| Idempotency rule | DEC-017 §21.1 |
| Repair semantics | DEC-017 §21.2 |
| Preserve user customisations rule | DEC-017 §21.3 |
| Stable key fields | DEC-017 §21.4 |
| Canonical event key format | DEC-018 §6 |
| Mutability rules per field | DEC-018 §6.4 |
| Validation rules (V-01 to V-10) | DEC-017 §9 |
| Company readiness states | DEC-017 §17 |
| Future domain catalog (reserved keys) | DEC-017 §18.3 |
| Architecture principles (P-01 to P-06) | DEC-017 §20 |

---

## 3. The `isSystem` Flag

### 3.1 Definition

`isSystem` is a boolean field on the `DomainCatalogue` schema (collection: `domain_catalogues`). When `true`, it marks the domain as **platform-owned and system-managed**.

```typescript
// domain-catalogue.schema.ts — current implementation
@Prop({ default: false, index: true })
isSystem!: boolean;
```

The flag is enforced at the service layer, not at the database layer.

### 3.2 Protection Rules

When `isSystem === true` on a domain:

| Operation | Allowed | Behaviour |
|---|---|---|
| **Delete** | ❌ No | Service responds `403 Forbidden: System domains cannot be deleted` |
| Modify `domainKey` | ❌ No | Service responds `403 Forbidden` with field name |
| Modify `displayName` | ❌ No | Service responds `403 Forbidden` with field name |
| Modify `domainCategory` | ❌ No | Service responds `403 Forbidden` with field name |
| Modify `companyId` | ❌ No | Service responds `403 Forbidden` with field name |
| Modify `isActive` | ✅ Yes | Allows deactivating without deleting |
| Modify `channelsToUse` | ✅ Yes | Allows binding credentials for delivery |

The protection is implemented in `DomainCatalogueService.update()` (lines 140–148) and `DomainCatalogueService.remove()` (lines 225–227).

### 3.3 Which Asset Types Carry `isSystem`

| Asset | Has `isSystem` | Status |
|---|---|---|
| Domain Catalogue | ✅ Yes — schema field exists and is enforced | Implemented |
| Event Catalogue | Planned — field not yet on schema | Future |
| Layout Template | Not planned | — |
| Theme | Not planned | — |

### 3.4 Known Gap: Security Domain Created Without `isSystem: true`

**Current state:** `CompanyProvisioningService.ensureSecurityDomain()` creates the `security` domain without setting `isSystem: true`. The field defaults to `false`. This means users can currently delete the `security` domain.

**Expected state:** All system-provisioned domains must be created with `isSystem: true`.

```typescript
// Required fix in CompanyProvisioningService — NOT yet applied
const created = await this.domainService.create({
  companyId,
  domainKey: 'security',
  displayName: 'Security',
  domainCategory: 'system_notifications',
  isActive: true,
  isSystem: true,   // ← missing from current implementation
  channelsToUse: [],
});
```

**Action required:**
1. Add `isSystem: true` to the `ensureSecurityDomain()` create payload.
2. Backfill all existing `security` domain records to set `isSystem: true` (see §8 for procedure).

This is a single-line fix in `company-provisioning.service.ts` plus a one-time migration.

---

## 4. Default System Domains

### 4.1 Complete Definition

A **system domain** is a domain created by the provisioning service with `isSystem: true`. System domains are the platform's baseline communication catalog. Every company always has them. Users cannot delete them.

### 4.2 v1 — Current Provisioned System Domains

| Domain Key | Display Name | Category | `isSystem` | Provisioned Events |
|---|---|---|---|---|
| `security` | Security | `system_notifications` | Should be `true` — see §3.4 | `company_verify_email`, `company_user_invitation`, `company_password_changed`, `company_forgot_password`, `company_welcome_message` — see DEC-017 §6.2 |

### 4.3 Planned v2 — `notifications` Domain

The `notifications` domain is the planned second default system domain. It covers general informational events that do not belong to the security context.

| Field | Value |
|---|---|
| Domain Key | `notifications` |
| Display Name | Notifications |
| Category | `system_notifications` |
| `isSystem` | `true` |
| Scope | Every company |

**Status: Planned — not yet provisioned.** A dedicated task must define its events and complete the change management checklist in §7 before this domain is added to provisioning.

**Reserved event keys (do not use for other purposes before the domain is defined):**

| Event Key | Canonical Key | Purpose |
|---|---|---|
| `general_announcement` | `notifications.general_announcement` | Platform or company announcements |
| `account_update` | `notifications.account_update` | Non-security account change confirmations |
| `maintenance_alert` | `notifications.maintenance_alert` | Scheduled downtime or service notices |

### 4.4 Future Candidates

See DEC-017 §18.3 for the full list of reserved domain keys (`users`, `reports`, `trading`, `invoices`, `payments`, `marketing`, `automation`, `storage`, `integrations`). These domains are not system domains — they are user-addable. Only `security` and `notifications` are platform-provisioned system domains.

---

## 5. Channel Provisioning Rule

Events are provisioned with the email channel **enabled** (`channelContent.email.enabled: true`). This means event content is immediately editable and previewable.

However, the domain starts with `channelsToUse: []` — no credentials are bound. Delivery is therefore blocked until the user configures credentials and binds them to the domain.

```
After provisioning:

  security domain
    channelsToUse: []            ← no credentials bound yet

  company_verify_email event
    channelContent.email.enabled: true   ← channel declared
    channelContent.email.subject: "..."  ← content ready

  company_user_invitation event
    channelContent.email.enabled: true   ← channel declared
    channelContent.email.subject: "..."  ← content ready
    channelContent.email.content: "..."  ← content ready

  Result:
    Preview    → ✅ works (composition only — see DEC-017 §16.1)
    Delivery   → ❌ blocked (no channelsToUse entry on domain)
```

This is the **intended initial state**. The user must navigate to Enabled Providers → Credentials and bind a credential to the domain before delivery becomes operational (DEC-017 §17.2).

Provisioning must **never** create `channelsToUse` entries. That is always a user action.

---

## 6. Provisioning Sequence

Provisioning is triggered in two scenarios (DEC-017 §3):
- **Trigger A:** `POST /auth/register` — user creates their own company
- **Trigger B:** `POST /companies/with-owner` — platform admin creates a company

The sequence is identical in both cases:

```
  Company is created (via registration or platform admin)
            │
            ▼
  ┌─────────────────────────────────────┐
  │  1. Create Company record           │
  └──────────────────┬──────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────┐
  │  2. Create Default Theme            │
  │     isDefault: true                 │
  │     isActive:  true                 │
  └──────────────────┬──────────────────┘
                     │  themeId → required by layouts
                     ▼
  ┌─────────────────────────────────────┐
  │  3. Create Default Email Layout     │
  │     key:       default_email_layout │
  │     templateType: email             │
  │     isDefault: true                 │
  │     isActive:  true                 │
  └──────────────────┬──────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────┐
  │  4. Create Default PDF Layout       │
  │     key:       default_pdf_layout   │
  │     templateType: pdf               │
  │     isDefault: true                 │
  │     isActive:  true                 │
  └──────────────────┬──────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────┐
  │  5. Create security Domain          │
  │     domainKey:      security        │
  │     domainCategory: system_noti...  │
  │     isSystem:       true            │  ← required — see §3.4
  │     isActive:       true            │
  │     channelsToUse:  []              │
  └──────────────────┬──────────────────┘
                     │  domainId → required by events
                     ▼
  ┌─────────────────────────────────────┐
  │  6. Create Default Events           │
  │     company_verify_email            │  ← auth gate for public registration
  │     company_user_invitation         │  ← all invitation flows
  │     company_password_changed        │
  │     company_forgot_password         │
  │     company_welcome_message         │  ← optional business event
  │     channelContent.email.enabled: true  │
  └──────────────────┬──────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────┐
  │  7. Mark System Assets              │
  │     All domains created here:       │
  │       isSystem: true                │
  └──────────────────┬──────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────┐
  │  8. Emit ProvisioningReport         │
  │     created: { theme, emailLayout,  │
  │       pdfLayout, securityDomain,    │
  │       events[] }                    │
  │     skipped: { ... }                │
  │     errors:  []                     │
  └─────────────────────────────────────┘

  State: READY FOR CUSTOMISATION
  (see DEC-017 §17.1)
```

Each step follows the idempotency rule (DEC-017 §21.1): **create if missing, skip if present**.

If Step 2 (Theme) fails, provisioning halts. If Steps 3–4 (Layouts) fail, provisioning continues to Step 5. If Step 5 (Domain) fails, provisioning halts — events require a domain ID.

---

## 7. Change Management Procedure

When introducing a new **mandatory** communication asset (a domain, event, or layout that must exist for every company):

```
  1. Update this DEC (DEC-020)
     → Add the asset specification to the appropriate section
     → Add it to the provisioning sequence in §6
     → Reserve the key in §4 (for domains) or in the event table

  2. Update CompanyProvisioningService
     → Add an ensure* helper for the new asset
     → Call it in provisionCompany() in the correct sequence
     → Add the asset to ProvisioningReportDto.created / .skipped

  3. Write a backfill procedure (see §8)
     → Identify existing companies that are missing the asset
     → Run the backfill in a migration or admin operation
     → Verify the result per company

  4. Update the frontend
     → Any page that shows provisioned assets must reflect the new asset
     → EmptyState components must not show where the new asset is expected

  5. Update tests
     → Provisioning unit test: new asset created in happy path
     → Provisioning idempotency test: asset skipped on second run
     → Integration test: notification delivery via new asset
     → Frontend test or fixture: new asset visible after company creation

  6. Deploy in order
     → Schema migrations first
     → Backend provisioning changes next
     → Backfill migration next
     → Frontend last
```

**No new mandatory asset may reach production without all six steps complete.**

---

## 8. Backfill Procedure

When a new mandatory default asset is added, existing companies will not have it. The following procedure must be followed.

### 8.1 Trigger

Backfill is triggered when:
- A new default domain is added to provisioning
- A new default event is added to an existing provisioned domain
- A new default layout type is added
- The `isSystem` flag is retrofitted (as in §3.4)

### 8.2 Execution Model

The backfill calls `CompanyProvisioningService.provisionCompany(companyId)` for each existing company. The idempotency rule (DEC-017 §21.1) ensures existing assets are never overwritten.

```
for each existingCompany:
  result = provisionCompany(existingCompany.companyId)
  log(companyId, result.created, result.skipped, result.errors)
```

This is safe to run multiple times. Existing customised assets are not touched.

### 8.3 What Backfill Handles

| Missing Asset | Backfill Action |
|---|---|
| Default Theme | Creates from platform defaults |
| Default Email Layout | Creates from platform defaults, linked to existing theme |
| Default PDF Layout | Creates from platform defaults, linked to existing theme |
| `security` domain | Creates with `isSystem: true` |
| `security` domain `isSystem: false` → should be `true` | Update existing records (one-off migration only) |
| Missing default event under `security` | Creates from `DEFAULT_COMPANY_EVENTS` |
| `notifications` domain (once introduced) | Creates with `isSystem: true` |
| Missing `channelsToUse` entries | ❌ Never backfilled — user action only |
| Missing provider credentials | ❌ Never backfilled — user action only |

### 8.4 Backfill vs User Customisations

The backfill must **never** overwrite:
- A theme the user has already edited
- A layout template the user has modified
- An event subject or content the user has changed
- Any `channelsToUse` entries the user has added

The idempotency rule (create if missing, skip if present) guarantees this without special logic.

---

## 9. Protected Asset Fields — Consolidated Reference

| Asset | Schema Field | Value When System-Managed | Protected (Cannot Modify) | Mutable |
|---|---|---|---|---|
| Domain | `isSystem` | `true` | `domainKey`, `displayName`, `domainCategory`, `companyId` | `isActive`, `channelsToUse` |
| Layout Template | `isDefault` | `true` | — (planned: prevent deleting sole default) | All content fields |
| Theme | `isDefault` | `true` | — (planned: prevent deleting sole default) | All token fields |
| Event | (planned) `isSystem` | `true` (planned) | `eventKey`, `domainCatalogueId` (planned) | `displayName`, `subject`, `content`, `variables` |

**Enforcement location:** Service layer (not database). Field-level protection is checked on every `update()` and `remove()` call.

---

## 10. Provisioning Report Schema

Every provisioning run returns a `ProvisioningReport`. The report is the observable record of what was created vs skipped vs failed.

```typescript
// Current implementation — ProvisioningReportDto

interface ProvisioningReportDto {
  companyId: string;
  created: {
    theme:          boolean;
    emailLayout:    boolean;
    pdfLayout:      boolean;
    securityDomain: boolean;
    events:         string[];   // eventKey[] that were created
  };
  skipped: {
    theme:          boolean;
    emailLayout:    boolean;
    pdfLayout:      boolean;
    securityDomain: boolean;
    events:         string[];   // eventKey[] that already existed
  };
  errors: Array<{
    asset:   string;
    message: string;
  }>;
}
```

The report must be extended when new mandatory assets are added to provisioning (see §7, step 2).

---

## 11. Relations

| Decision | Relationship |
|---|---|
| **DEC-017** | Primary source for provisioning lifecycle, default asset content, composition model, rendering flow, validation rules, idempotency. This DEC extends it. |
| **DEC-018** | Primary source for ownership, bounded context, canonical event key, execution log. This DEC adds the `isSystem` governance layer. |
| **DEC-019** | Trigger flow — companyId resolution, external application integration, single entry point rule. |
| **DEC-021** | Communication Asset Lifecycle — master map of the Communication module. References this DEC for change management and backfill. |
| **DEC-016** | Business App sidebar order. System domains appear in the Domains section. |
| **ADR-004** | Platform vs. tenant company model — determines which events belong to the platform company and which are provisioned for every tenant. |
