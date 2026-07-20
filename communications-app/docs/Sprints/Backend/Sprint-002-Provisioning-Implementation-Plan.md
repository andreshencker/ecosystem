# Sprint 002 — Provisioning & Notification Engine Implementation Plan

> Based on: DEC-017 (Company Provisioning, Default Events, Notification Composition) + DEC-018 (Communication Asset Ownership and Bounded Context Boundaries)
> Status: Pending approval — no code written yet.

---

## 1. Current Backend State (What Already Exists)

### Existing modules and schemas

| Module / Service | Location | Status |
|---|---|---|
| `CompanyThemeService` | `communication/company/company-theme/` | ✅ Exists, `create()` works |
| `LayoutTemplatesService` | `communication/notifications/template/layout-templates/` | ✅ Exists, `create()` works |
| `DomainCatalogueService` | `communication/notifications/events/domain-catalogue/` | ✅ Exists, `create()` works |
| `EventCatalogueService` | `communication/notifications/events/event-catalogue/` | ✅ Exists, `create()` + `bulkCreate()` work |
| `NotificationService` | `communication/notifications/` | ✅ Exists, renders + dispatches |
| `SourceOfTruthService` | `communication/common/source-of-truth/` | ✅ Exists, resolves layout/theme/company |
| `TemplateComposerService` | `communication/common/template-engine/` | ✅ Exists, renders Mustache templates |
| `PreviewService` | `communication/preview/` | ✅ Exists, preview by IDs |
| `PlatformMailService` | `infrastructure/platform-mail/` | ✅ Exists, hardcoded SMTP templates |
| `CompanyController` | `communication/company/company-info/` | ✅ Exists, `POST /companies` |
| `CompanyProvisioningService` | — | ❌ **Does not exist** |
| `ExecutionLogService` | — | ❌ **Does not exist** |
| `notification_execution_logs` collection | — | ❌ **Does not exist** |

### Existing Mongo collections and key indexes

| Collection | Unique Constraint | Notes |
|---|---|---|
| `company_themes` | `{ companyId, isDefault }` (partial: isDefault=true) | Prevents multiple defaults per company |
| `layout_templates` | `{ companyThemeId, templateType, key }` | Idempotency anchor for provisioning |
| `domain_catalogues` | `{ companyId, domainKey }` | Idempotency anchor for provisioning |
| `event_catalogue` | `{ domainCatalogueId, eventKey }` | Idempotency anchor for provisioning |

The unique indexes already in place are the idempotency guarantee for provisioning. **No new indexes needed for provisioning safety.**

### What the existing NotificationService already does

- Resolves event by bare `eventKey` (not canonical form)
- Uses `SourceOfTruthService` to resolve layout, theme, company
- Calls `TemplateComposerService` for rendering
- Dispatches via `ChannelsImplementationFactory`
- **Does NOT write execution logs** ← gap

### What the existing PreviewService already does

- `previewLayoutHtml()` — by `layoutTemplateId` ← works
- `previewNotificationEmailHtml()` — by `layoutTemplateId` + `eventCatalogueId` ← by IDs, not keys
- **Does NOT support canonical key preview** ← gap

---

## 2. Every Gap Against DEC-017 / DEC-018

| Requirement | Decision | Status | Gap |
|---|---|---|---|
| Provision default Theme on company creation | DEC-017 §3 | ❌ Missing | No provisioning service |
| Provision default Email Layout | DEC-017 §4 | ❌ Missing | No provisioning service |
| Provision default PDF Layout | DEC-017 §4 | ❌ Missing | No provisioning service |
| Provision `security` domain | DEC-017 §5 | ❌ Missing | No provisioning service |
| Provision default events (platform + company) | DEC-017 §6 | ❌ Missing | No provisioning service |
| `{{content}}` validation on layout templates | DEC-017 §4.3 | ❌ Missing | LayoutTemplatesService has no guard |
| Idempotent provisioning (repair semantics) | DEC-017 §21, DEC-018 §21 | ❌ Missing | No provisioning service |
| Repair endpoint `POST /companies/:id/provision` | DEC-018 §10.1 | ❌ Missing | No endpoint |
| Execution log per notification attempt | DEC-018 §8, §10.3 | ❌ Missing | No log collection or service |
| Canonical event key (`security.user_invitation`) | DEC-018 §6 | ❌ Missing | Notification service uses bare key |
| Preview by canonical event key | DEC-017 §10.4 | ❌ Partial | PreviewService uses IDs only |

---

## 3. Every Backend Module That Must Change

| Module | Change Type | Why |
|---|---|---|
| `LayoutTemplatesService` | **Extend** | Add `{{content}}` guard in `create()` + `update()` |
| `CompanyController` | **Extend** | Call `CompanyProvisioningService` after company creation |
| `CompanyModule` | **Extend** | Import `CompanyProvisioningModule` |
| `NotificationService` | **Extend** | Write `ExecutionLog` per channel attempt; support canonical key input |
| `NotificationModule` | **Extend** | Import `ExecutionLogModule` |
| `EventCatalogueService` | **Extend** | Add `findByCanonicalKey(companyId, canonicalKey)` method |
| `PreviewService` | **Extend** | Add `previewNotificationByEventKey()` |
| `PreviewController` | **Extend** | Add `POST /preview/event-by-key` |
| `app.module.ts` | **Extend** | Register `CompanyProvisioningModule`, `ExecutionLogModule` |

---

## 4. Every New Service to Create

| Service | Location | Purpose |
|---|---|---|
| `CompanyProvisioningService` | `communication/company/provisioning/` | Orchestrates idempotent creation of all default assets per company |
| `ExecutionLogService` | `communication/notifications/execution-log/` | Writes and reads notification execution records |

---

## 5. Existing Services Reused by Provisioning (No Change to Their Interface)

| Service | Used for |
|---|---|
| `CompanyThemeService` | Create default theme |
| `LayoutTemplatesService` | Create default email + pdf layout templates |
| `DomainCatalogueService` | Create `security` domain |
| `EventCatalogueService` | Create all default events (via `bulkCreate` or individual `create`) |

Provisioning calls these services programmatically, the same way a controller would. No service needs to know it is being called from provisioning.

---

## 6. New Repositories Required

| Repository (Mongoose Model) | Collection | Module |
|---|---|---|
| `NotificationExecutionLog` | `notification_execution_logs` | `ExecutionLogModule` |

---

## 7. New Interfaces Required

```typescript
// Provisioning report returned by CompanyProvisioningService
interface ProvisioningReport {
  companyId: string;
  created: {
    theme: boolean;
    emailLayout: boolean;
    pdfLayout: boolean;
    securityDomain: boolean;
    events: string[]; // list of eventKeys created
  };
  skipped: {
    theme: boolean;
    emailLayout: boolean;
    pdfLayout: boolean;
    securityDomain: boolean;
    events: string[];
  };
  errors: { asset: string; message: string }[];
}

// Rendering context passed to TemplateComposerService
// (already exists in source-of-truth.service.ts — no change needed)

// Canonical key resolver
interface CanonicalEventKey {
  domainKey: string;  // e.g. "security"
  eventKey: string;   // e.g. "user_invitation"
  canonical: string;  // e.g. "security.user_invitation"
}
```

---

## 8. New DTOs

| DTO | Module | Purpose |
|---|---|---|
| `ProvisioningReportDto` | `company/provisioning/` | Response from provision endpoint |
| `CreateExecutionLogDto` | `notifications/execution-log/` | Internal: write log entry |
| `ExecutionLogResponseDto` | `notifications/execution-log/` | External: query log entries |
| `PreviewByEventKeyDto` | `preview/` | `POST /preview/event-by-key` request |

---

## 9. New Mongo Collections

### `notification_execution_logs`

```typescript
@Schema({ collection: 'notification_execution_logs', timestamps: true })
class NotificationExecutionLog {
  companyId:              Types.ObjectId;   // ref: Company
  domainKey:              string;           // e.g. "security"
  eventKey:               string;           // e.g. "user_invitation"
  canonicalEventKey:      string;           // e.g. "security.user_invitation"
  channel:                'email' | 'sms';
  layoutTemplateId:       Types.ObjectId | null;  // ref: LayoutTemplate
  themeId:                Types.ObjectId | null;  // ref: CompanyTheme
  providerId:             Types.ObjectId | null;  // ref: Provider
  providerCredentialsId:  Types.ObjectId | null;  // ref: ProviderCredentials
  renderStatus:           'success' | 'failed';
  deliveryStatus:         'pending' | 'sent' | 'failed' | 'skipped';
  renderedAt:             Date;
  sentAt:                 Date | null;
  providerMessageId:      string | null;
  errorMessage:           string | null;
  // createdAt, updatedAt from timestamps: true
}

// Indexes:
// { companyId: 1, createdAt: -1 }   — list by company
// { companyId: 1, canonicalEventKey: 1, createdAt: -1 }  — filter by event
// { deliveryStatus: 1, createdAt: -1 }  — operations dashboard
```

---

## 10. Transaction Boundaries

MongoDB multi-document transactions require a replica set. Provisioning uses sequential writes instead, with **idempotency as the safety net** (unique indexes prevent duplicates on concurrent runs).

| Operation | Transaction | Strategy |
|---|---|---|
| Provisioning (Theme → Layout → Domain → Events) | ❌ No ACID transaction | Sequential writes; each step checks-before-create; unique indexes prevent duplicates on retry |
| Notification send + ExecutionLog write | ❌ No transaction needed | Log write is fire-and-after (notification result already captured in memory before log write) |
| Theme create | ❌ No transaction | Mongoose partial unique index handles concurrency |

**If provisioning fails mid-way** (e.g., domain created but events fail), the next provisioning run will skip what exists and create what's missing — this is the repair semantic from DEC-018 §21.2.

---

## 11. Idempotency Strategy

Each provisioning step uses a **check-before-create** pattern leveraging existing unique indexes:

```
1. Theme:         findOne({ companyId, isDefault: true }) → skip if exists
2. Email Layout:  findOne({ companyThemeId, templateType: 'email', key: 'default_email_layout' }) → skip if exists
3. PDF Layout:    findOne({ companyThemeId, templateType: 'pdf', key: 'default_pdf_layout' }) → skip if exists
4. Domain:        findOne({ companyId, domainKey: 'security' }) → skip if exists
5. Each Event:    findOne({ domainCatalogueId, eventKey }) → skip if exists
```

If a write races and hits a duplicate key error, the service catches the error and treats it as "already exists" — same as skipped.

**Never overwrite** (DEC-018 §21.3): provisioning never calls `update()`. Skip = preserve user customisation.

---

## 12. Provisioning Entry Point

**Trigger:** `CompanyController.createWithOwner()` (the primary company creation endpoint)

**Location in flow:**
```
POST /companies  (createWithOwner)
  → companies.create(dto)         ← company record created
  → provisioning.provisionCompany(company.id)  ← NEW CALL
  → users.createInvitedUser(...)  ← existing owner invite
```

**Module wiring:** `CompanyModule` imports `CompanyProvisioningModule`.

**Re-run / repair trigger:**
```
POST /companies/:id/provision    ← new endpoint
```
Returns `ProvisioningReportDto` listing what was created vs skipped.

---

## 13. Notification Engine Entry Point

**Existing (unchanged):**
```
POST /notifications
  body: { event: "user_invitation", companyId, email, variables, payload }
```

**Phase 4 addition (canonical key support):**
```
POST /notifications
  body: { event: "security.user_invitation", companyId, ... }
```

The service parses the `event` field: if it contains `.`, split into `domainKey + eventKey` and resolve accordingly. If no dot, treat as bare `eventKey` (backwards compatible).

---

## 14. Preview Endpoint

**Existing (unchanged):**
```
POST /preview/layout          → by layoutTemplateId
POST /preview/notification    → by layoutTemplateId + eventCatalogueId
POST /preview/report          → by layoutTemplateId
```

**New (Phase 5):**
```
POST /preview/event-by-key
  body: {
    companyId: string;
    canonicalEventKey: string;   // "security.welcome_message"
    data?: Record<string, any>;  // optional mock variables
  }
  → returns: { html: string; subject: string }
```

This allows the frontend to preview any event without knowing internal MongoDB IDs.

---

## 15. Repair Endpoint

```
POST /companies/:id/provision
  headers: x-api-key or JWT (platform_admin only)
  → runs CompanyProvisioningService.provisionCompany(id)
  → returns ProvisioningReportDto
```

Safe to call any number of times. Only creates missing assets. Never overwrites existing ones.

---

## 16. Dependency Graph Between Services

```
CompanyController
  └── CompanyProvisioningService         ← NEW
        ├── CompanyThemeService          ← existing, reused
        ├── LayoutTemplatesService       ← existing, reused (+ {{content}} guard added)
        ├── DomainCatalogueService       ← existing, reused
        └── EventCatalogueService        ← existing, reused

NotificationService
  ├── EventCatalogueService              ← existing (+ canonical key method added)
  ├── ChannelsRuntimeResolverService     ← existing, unchanged
  ├── ChannelsImplementationFactory      ← existing, unchanged
  ├── SourceOfTruthService               ← existing, unchanged
  ├── TemplateComposerService            ← existing, unchanged
  └── ExecutionLogService                ← NEW

ExecutionLogService
  └── NotificationExecutionLog model     ← NEW collection

PreviewService
  ├── SourceOfTruthService               ← existing, unchanged
  ├── EventCatalogueService              ← existing, adds findByCanonicalKey
  ├── TemplateComposerService            ← existing, unchanged
  └── GeneratorService                   ← existing, unchanged
```

---

## 17. Phased Implementation Roadmap

Each phase compiles, keeps existing tests passing, and is independently testable.

---

### Phase 1 — `{{content}}` Guard + Schema Validation

**Goal:** Enforce the layout template constraint from DEC-017 §4.3. No new modules.

**Files changed:**
- `layout-templates.service.ts` — add guard in `create()` + `update()`

**New logic:**
```
if (!html.includes('{{content}}')) {
  throw new BadRequestException('Layout template must contain {{content}} placeholder');
}
```

**Tests:**
- Create layout without `{{content}}` → 400
- Create layout with `{{content}}` → 201
- Update layout removing `{{content}}` → 400
- Existing layouts with `{{content}}` → unchanged

**Risk:** Low. Pure additive validation. Existing layouts already have `{{content}}` (confirmed in seed data).

---

### Phase 2 — Company Provisioning Module

**Goal:** Create `CompanyProvisioningService` and wire it into company creation. This is the core delivery of DEC-017 §3.

**New files:**
```
src/communication/company/provisioning/
  company-provisioning.module.ts
  company-provisioning.service.ts
  dto/provisioning-report.dto.ts
  constants/default-theme.constant.ts       ← hardcoded default token values
  constants/default-email-layout.constant.ts ← default HTML with {{content}}
  constants/default-pdf-layout.constant.ts
  constants/default-events.constant.ts       ← all 9 default event definitions
```

**Modified files:**
- `company.controller.ts` — inject `CompanyProvisioningService`, call after `companies.create()`
- `company.module.ts` — import `CompanyProvisioningModule`
- `app.module.ts` — no change needed (CompanyModule already registered)

**`CompanyProvisioningService` public interface:**
```typescript
provisionCompany(companyId: string): Promise<ProvisioningReport>
```

**Internal steps:**
1. `ensureDefaultTheme(companyId)` → CompanyThemeService.create() or skip
2. `ensureDefaultEmailLayout(themeId)` → LayoutTemplatesService.create() or skip
3. `ensureDefaultPdfLayout(themeId)` → LayoutTemplatesService.create() or skip
4. `ensureSecurityDomain(companyId)` → DomainCatalogueService.create() or skip
5. `ensureDefaultEvents(domainId)` → EventCatalogueService.create() per event, or skip

**New endpoint:**
```
POST /companies/:id/provision
```
Added to `CompanyController`. Returns `ProvisioningReportDto`.

**Tests:**
- Fresh company → all assets created, report shows all `created: true`
- Second call → all skipped, report shows all `skipped: true`
- Delete one event, re-provision → deleted event recreated, others skipped
- Provisioning failure mid-way → next run creates the missing ones

**Risk:** Medium. Many service interactions. Idempotency logic must be correct. No DB schema changes.

---

### Phase 3 — Execution Log Collection + Service

**Goal:** Satisfy DEC-018 §8, §10.3. Every notification attempt must be logged.

**New files:**
```
src/communication/notifications/execution-log/
  schemas/execution-log.schema.ts
  execution-log.service.ts
  execution-log.module.ts
  dto/create-execution-log.dto.ts
  dto/execution-log-response.dto.ts
  mappers/execution-log.mapper.ts
```

**Modified files:**
- `notification.service.ts` — write log entry per channel attempt
- `notification.module.ts` — import `ExecutionLogModule`
- `app.module.ts` — register `ExecutionLogModule`

**Log write pattern in NotificationService:**
```
// Before dispatch (renderStatus captured)
// After dispatch (deliveryStatus captured)
await this.executionLog.create({
  companyId, domainKey, eventKey, canonicalEventKey,
  channel, layoutTemplateId, themeId,
  providerId, providerCredentialsId,
  renderStatus, deliveryStatus,
  renderedAt, sentAt, providerMessageId, errorMessage,
});
```

**New endpoint (optional in this phase):**
```
GET /notifications/logs?companyId=&limit=&offset=
```

**Tests:**
- Successful email send → log entry with `renderStatus: success`, `deliveryStatus: sent`
- Missing layout → log with `renderStatus: failed`
- Missing provider → log with `renderStatus: success`, `deliveryStatus: skipped`
- Existing notification flow → unchanged behavior, extra log side-effect only

**Risk:** Low-medium. Non-breaking — log write is a side-effect after existing notification logic. Worst case: log write fails, notification still succeeds (catch and log error, don't throw).

---

### Phase 4 — Canonical Event Key Support

**Goal:** Satisfy DEC-018 §6. `event: "security.user_invitation"` resolves correctly.

**Modified files:**
- `event-catalogue.service.ts` — add `findByCompanyAndCanonicalKey(companyId, canonicalKey)` that splits on first `.` and delegates to `findByCompanyAndEventKey()` after resolving domain
- `notification.service.ts` — parse `event` field: if contains `.`, extract `domainKey` prefix and use domain-aware resolution
- `execution-log.service.ts` — already captures both `domainKey` and `eventKey` fields

**Backwards compatibility:** A bare `event: "user_invitation"` (no dot) still works via existing lookup path. Only the new path is added.

**Tests:**
- `POST /notifications` with `event: "security.user_invitation"` → resolves correctly
- `POST /notifications` with `event: "user_invitation"` → still resolves (backwards compat)
- Non-existent canonical key → 404
- Wrong domain prefix → 404

**Risk:** Low. Additive parsing logic. Existing path untouched.

---

### Phase 5 — Preview by Canonical Event Key

**Goal:** Frontend can preview any event without knowing MongoDB IDs.

**New files:**
- `dto/preview-by-event-key.dto.ts` — `{ companyId, canonicalEventKey, data? }`

**Modified files:**
- `preview.service.ts` — add `previewNotificationByEventKey(dto)` method
- `preview.controller.ts` — add `POST /preview/event-by-key` endpoint

**`previewNotificationByEventKey` logic:**
1. Resolve event via `EventCatalogueService.findByCompanyAndCanonicalKey()`
2. Get event's `domainCatalogueId` → fetch domain
3. Resolve default email layout via `SourceOfTruthService.resolveLayoutByCompanyId()`
4. Compose using `TemplateComposerService`
5. Return `{ html, subject }`

**Tests:**
- Valid `security.welcome_message` → returns HTML + subject with `{{data.*}}` placeholders
- With `data` payload → placeholders filled
- Invalid canonical key → 404
- Layout not found → 404

**Risk:** Low. Purely additive. Existing preview endpoints unchanged.

---

### Phase 6 — PlatformMailService Migration (Future — Not in Sprint 002)

**Goal:** Replace hardcoded SMTP templates in `PlatformMailService` with the Event Catalogue.

**Blocked by:** Phase 2 (provisioning must exist and be verified in production first).

**Scope:**
- `invite-user.template.ts` → migrate to `security.user_invitation` event
- `reset-password.template.ts` → migrate to `security.forgot_password` event
- `verify-email.template.ts` → migrate to `security.user_registered` event

This phase is a **separate sprint** and is not part of Sprint 002.

---

## 18. Phase Dependency Order

```
Phase 1 ({{content}} Guard)
    ↓
Phase 2 (Provisioning Module)
    ↓
Phase 3 (Execution Log)
    ↓
Phase 4 (Canonical Key)
    ↓
Phase 5 (Preview by Key)
    ↓
Phase 6 (PlatformMail Migration) ← separate sprint
```

Phases 3, 4, 5 can be done in any order after Phase 2. Phase 3 is the highest priority after Phase 2 (audit trail). Phases 4 and 5 are quality-of-life improvements.

---

## 19. Clarifications (Resolved 2026-06-25)

All open questions have been answered. Implementation may proceed.

| # | Question | Answer |
|---|---|---|
| 1 | Default layout HTML | **Production-quality HTML** — real editable templates, not placeholders. Use all `company.*` and `theme.*` variables. |
| 2 | Default event content | **Production-ready HTML bodies** for email, realistic subjects. Events are ready to customise, not to complete from scratch. |
| 3 | Provisioning for existing companies | **Never auto-provision on startup.** Provisioning runs only during company creation and via `POST /companies/:id/provision`. |
| 4 | ExecutionLog access control | **Platform Admin** → all companies. **Company Owner/Admin** → own company only. **Operator/Viewer** → no access. |
| 5 | Platform vs company event split | **Single canonical event catalogue.** All events belong to a domain and carry a `scope` field (`platform` or `company`). The notification engine resolves events identically regardless of scope. No separate prefix grouping. |

### Scope field (Q5 detail)

The `EventCatalogue` schema must gain a `scope` field:
```
scope: 'platform' | 'company'   default: 'company'
```

Examples:
- `security.register` → `scope: 'platform'`
- `security.user_invitation` → `scope: 'company'`

The scope is metadata only — it does not change how the engine resolves or renders events. Provisioning uses it to select which events to create for which company type.

---

## 20. File Count Summary

| Phase | New Files | Modified Files |
|---|---|---|
| Phase 1 | 0 | 1 (`layout-templates.service.ts`) |
| Phase 2 | 8 | 3 (`company.controller.ts`, `company.module.ts`, `app.module.ts`) |
| Phase 3 | 6 | 3 (`notification.service.ts`, `notification.module.ts`, `app.module.ts`) |
| Phase 4 | 0 | 2 (`event-catalogue.service.ts`, `notification.service.ts`) |
| Phase 5 | 1 | 2 (`preview.service.ts`, `preview.controller.ts`) |
| **Total** | **15** | **11** |
