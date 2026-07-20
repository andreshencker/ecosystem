---
id: ADR-019
title: Communication Catalog (Seed Catalog) — Architecture Decision
status: Accepted
date: 2026-07-07
tags: [communications, provisioning, seed-catalog, communication-catalog, multi-tenant, architecture]
---

# ADR-019 — Communication Catalog (Seed Catalog)

## Status

Accepted — 2026-07-07

Replaces the provisioning model described in DEC-017 §3 (steps P-05 to P-10) as it applies to **tenant Business companies**. DEC-017's model for the **platform company** (internal provisioning at deploy time) remains valid.

---

## Context

### The problem with the previous model

DEC-017 and `docs/business-model/08-business-provisioning.md` (P-05 to P-10) described a provisioning sequence where Communications domains, events, and layout templates were created for each Business **when the Business was created** (at company registration or at Platform Admin creation). 

This model has a fundamental flaw: at company creation time, the Business has no Communications integration token. Without a token, there is no authenticated way for Business App to provision assets in Communications on behalf of that specific company. The provisioning service in Business App was a stub that acknowledged this constraint ("requires admin configuration") but the documentation described a different reality.

Additionally, the old model required Business App to know which domains and events to create — scattering Communication knowledge across provisioning code that is conceptually unrelated to it.

### What triggers this decision

Sprint 2 (2026-07-07) architectural review established that:

1. Communications assets for a Business must be provisioned **when and only when** the Business configures its integration token.
2. The set of default domains/events/templates must be defined as a version-controlled catalog in Business App — the **Seed Catalog**.
3. Future modules that add new Communication Events must extend the Seed Catalog rather than modifying provisioning logic.
4. The synchronization path (new events added to existing Business connections) must be explicit and observable.

---

## Decision

### 1. The Communication Catalog

The **Communication Catalog** (implemented as `seed-catalog.ts`) is the single source of truth for all Business-type communicable events in the ERP.

```
business-app/backend/src/integrations/communications/catalog/communication-catalog.ts
```
_(Nota: el path target según ADR-020. Actualmente pendiente de implementación y migración desde `src/settings/communication-client/`.)_

**Properties:**
- Plain TypeScript constant — no database, no runtime loading
- Versioned with the repository (git history shows when each event was added)
- Maintained by the development team — never auto-generated
- **One catalog for the entire ERP** — never fragmented, never duplicated
- Contains ONLY Business-type events (Platform events live in Communications itself)
- Grows as new modules are added — each module extends this catalog, never creates another

**Uniqueness invariant:**

> There is exactly one Communication Catalog in the ERP.
> When a new module needs external communication, it extends `COMMUNICATION_CATALOG`.
> It does not create a new catalog file, a new constant, or a new service.
> Any duplication of catalog logic is non-compliant with this decision.

**Structure:**

```typescript
export const BUSINESS_SEED_CATALOG: SeedCatalogDomain[] = [
  {
    domainKey:   'billing',
    displayName: 'Billing',
    isSystem:    false,
    events: [
      {
        eventKey:          'invoice_sent',
        displayName:       'Invoice Sent',
        channel:           'email',
        subject:           'Invoice {{data.invoiceNumber}} from {{company.displayName}}',
        content:           '...',   // body only — no corporate wrapper
        requiredVariables: ['invoiceNumber', 'amount', 'dueDate', 'customerName'],
        optionalVariables: ['viewUrl'],
      },
      // ...
    ],
  },
];
```

### 2. Token save triggers seeding

When a Business saves its Communications integration token, Business App must:

1. Validate the token against Communications (`GET /company-integrations/me`)
2. Store the `CommunicationConnection` in Business App DB
3. Read the Seed Catalog
4. For each domain: `POST` to Communications if not already exists
5. For each event: `POST` to Communications if not already exists
6. For each layout template: `POST` to Communications if not already exists

This is idempotent: saving the same token again or re-triggering provisioning is always safe (create if missing, skip if present).

### 3. Sync for new catalog entries

When a new domain or event is added to the Seed Catalog:

- All Businesses **with an active `CommunicationConnection`** receive the new domain/event automatically via a sync operation.
- All Businesses **without a `CommunicationConnection`** receive the full catalog when they eventually configure their token.

The sync operation must:
- Never overwrite existing assets that the Business has customized
- Only create assets that don't exist yet (additive, never destructive)
- Be triggerable manually via `/communications/sync-catalog` (admin endpoint)
- Be triggerable automatically on each new token save

### 4. EventKey stability contract

EventKeys are an internal contract. Once a Business has the event configured in Communications, renaming or removing it breaks their configuration.

**Allowed:**
- Add a new domain
- Add a new event
- Add optional variables to an existing event
- Update default template content (compatible)

**Prohibited:**
- Rename an existing eventKey: `billing.invoice_sent` → `billing.sent_invoice` — NEVER
- Remove a key used by Businesses with active tokens
- Change required variables of an existing event

**For incompatible changes — create a new version:**
```
billing.invoice_sent     (v1 — keep, do not remove)
billing.invoice_sent_v2  (v2 — add, new payload)
```

**Deprecation process:**
1. Mark `deprecated: true` in the catalog
2. Document planned removal date (minimum 2 sprints notice)
3. Verify no active Business uses it
4. Remove from catalog + sync to Communications

### 5. Platform events are NOT in the Catalog

Events in the `security.*` domain (verify_email, forgot_password, etc.) exist directly in Communications from initial deployment. They do not need to be pushed by Business App. The Seed Catalog contains only Business-owned events.

---

## Consequences

### Positive

- Clean separation: Communication knowledge is centralized in the Seed Catalog file, not scattered across provisioning steps.
- No provisioning at company creation: the registration flow is simpler and does not depend on Communications being available.
- Zero-configuration readiness: once a Business saves its token, it immediately has all domains/events available.
- Forward-compatible: adding a new Communication Event requires updating the Seed Catalog and re-syncing — no changes to any business service.
- Versioned catalog: git history shows exactly when a domain or event was added and why.

### Negative

- Businesses that never configure a token have no Communication Events — this is the expected and correct state.
- The sync operation requires iterating over all active CommunicationConnections — must be paginated for large deployments.
- There is a window between a Seed Catalog update and the sync completing where some Businesses don't have the new event yet.

### Neutral

- The current `CommunicationConnectionService.save()` is the hook point for the seeding logic. Adding the seed call there requires a dependency on a new `SeedProvisioningService`.

---

## Implementation state

| Component | Status |
|---|---|
| `seed-catalog.ts` — file creation | ⏳ Pending implementation |
| `SeedProvisioningService` — push catalog to Communications | ⏳ Pending implementation |
| `CommunicationConnectionService.save()` — call seed on token save | ⏳ Pending implementation |
| `GET /communications/sync-catalog` — manual sync endpoint | ⏳ Pending implementation |
| `business-app/docs/architecture/communication-architecture.md` | ✅ Created 2026-07-07 |
| `08-business-provisioning.md` P-05 to P-10 — updated | ✅ Updated 2026-07-07 |
| `provisioning-default-templates.md` — updated | ✅ Updated 2026-07-07 |

---

## References

- `docs/integrations/communications/notifications.md` — canonical architecture reference (reemplaza communication-architecture.md)
- `docs/integrations/communications/README.md` — modelo de conexión y token resolution
- `docs/business-model/08-business-provisioning.md` — Business provisioning lifecycle
- `communications-app/docs/Decisions/DEC-017` — Notification composition model
- `communications-app/docs/Decisions/DEC-019` — Single notifyEvent() pipeline
- `communications-app/docs/Decisions/ADR-007` — Trust boundary rules
