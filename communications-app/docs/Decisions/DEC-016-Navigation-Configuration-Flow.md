---
id: DEC-016
title: Navigation Configuration Flow
status: Accepted
created: 2026-06-25
tags: [frontend, navigation, sidebar, ux, architecture]
---

# DEC-016 — Navigation Configuration Flow

## Decision

The Communication Platform sidebar is **not a directory**. It is a **guided configuration workflow**. The order of items in the sidebar must reflect the sequence in which a user configures the platform — top to bottom, with each item building on the one above it.

This decision defines the canonical sidebar structure for both the **Business App** and **Platform Admin** surfaces and is **mandatory** for every current and future frontend implementation. It supersedes previous sidebar ordering where conflicts exist.

---

## Philosophy

### What the sidebar must NOT follow

- Database table names or entity relationships
- Backend module names or service boundaries
- Alphabetical order
- Chronological feature addition

### What the sidebar MUST follow

**The order in which a customer configures the communication platform.**

The navigation is a guided workflow. A user should be able to move top to bottom through the sidebar and, at the end of that journey, have a fully configured, working communication platform.

If a sidebar item appears before the item it depends on, the order is wrong.

---

## Business App Navigation

The Business App is **company-scoped**. Its purpose is to configure a single company's communication platform end to end.

### Canonical Sidebar Structure

```
OVERVIEW
  ▪ Dashboard

COMMUNICATION SETUP
  1. My Company
  2. Theme
  3. Enabled Providers
  4. Credentials
  5. Domains
  6. Templates
  7. Events

OPERATIONS
  8. Test Notifications

USERS
  ▪ Team

SETTINGS
  ▪ Profile
```

### Why This Order

The numbered items in **Communication Setup** represent a strict dependency chain:

```
My Company          — establish company identity and basic settings
     ↓
Theme               — apply branding before anything is visible to end users
     ↓
Enabled Providers   — choose which global providers the company will use
     ↓
Credentials         — configure authentication secrets for those providers
     ↓
Domains             — register sending domains and bind credentials to them
     ↓
Templates           — create reusable layout templates for notifications
     ↓
Events              — define notification events and attach channel content
     ↓
Test Notifications  — validate that the full chain delivers correctly
```

A user who follows the sidebar top to bottom will complete the configuration in the correct dependency order without needing external documentation.

### Removed Modules

The following modules are **not part of the communication configuration workflow** and must not appear in the Business App sidebar:

| Module | Reason for removal |
|---|---|
| Reports | Implementation detail / future feature — does not advance configuration |
| Media | Implementation detail / future feature — does not advance configuration |
| Storage | Implementation detail / future feature — does not advance configuration |

If these modules are re-introduced in a future sprint, a new decision record must be approved before they can be added to the sidebar.

---

## Platform Admin Navigation

Platform Admin manages the **platform itself**, not a single company. Its sidebar is organized by administrative responsibility domain.

### Canonical Sidebar Structure

```
OVERVIEW
  ▪ Dashboard

PLATFORM
  ▪ Companies
  ▪ Platform Admins

COMMUNICATION CATALOG
  ▪ Channels
  ▪ Providers
  ▪ Provider Schemas
  ▪ Global Templates

OPERATIONS
  ▪ Provider Testing
  ▪ Failed Notifications
  ▪ Company Activity
  ▪ API Usage

SECURITY
  ▪ Global Users
  ▪ Audit Logs
  ▪ Error Logs

SETTINGS
  ▪ Profile
```

### Section Rationale

| Section | Purpose |
|---|---|
| **Platform** | Manage the entities that exist at platform level (companies, platform admin accounts) |
| **Communication Catalog** | Define the building blocks companies can use (channels, providers, schemas, templates) |
| **Operations** | Monitor and diagnose the platform's runtime behavior |
| **Security** | Audit and control access across all users and companies |
| **Settings** | Personal account settings for the current platform admin |

---

## Naming Rules

Sidebar labels must use **business terminology** that describes what the user is doing. They must never expose database entity names, backend module names, or implementation details.

### Examples

| Bad (technical / database-centric) | Good (business-centric) |
|---|---|
| Channel Providers | Enabled Providers |
| Provider Credentials | Credentials |
| Domain Catalogues | Domains |
| Event Catalogues | Events |
| Layout Templates | Templates |
| User Management | Team |

**Rule:** If the label would make sense as a database table name, it is the wrong label.

---

## Future Module Gate

Every new module proposed for the sidebar must answer all three questions before it can be added:

**1. Which stage of the configuration workflow does it belong to?**
Identify the dependency: what must the user have configured before this module is useful?

**2. Which sidebar section should contain it?**
Map it to an existing section or justify a new section with a decision record.

**3. Does it belong to Business App, Platform Admin, or both?**
A module that serves company-level configuration belongs in Business App. A module that serves platform-level administration belongs in Platform Admin. A module serving both must have a distinct entry in each surface with appropriate scope.

**If these three questions cannot be answered clearly, the module must not be added to the sidebar until a new Architecture Decision is approved.**

---

## UX Principle

The sidebar is not just navigation. It is a guided setup process.

- The **order must minimize onboarding confusion**. A new company owner should be able to configure the platform without reading documentation by following the sidebar top to bottom.
- The **labels must communicate intent**, not structure. The user should understand what they are doing, not what table they are editing.
- **Steps that produce output consumed by later steps must appear earlier.** Providers before Credentials. Domains before Events. Events before Test Notifications.
- **No orphaned actions.** Items the user cannot yet perform (due to missing prior configuration) should either be absent or clearly indicate the prerequisite — never silently broken.

---

## Implementation Rule

From the date this decision is accepted:

1. **Sidebar configuration** (`lib/config/role-config.ts` or equivalent) must reflect the canonical structures defined above.
2. **Route guard configuration** must be updated to match any renamed or reorganised routes.
3. **Role configurations** for `company_owner`, `company_admin`, `operator`, `viewer`, and `platform_admin` must be audited against the new sidebar structure.
4. **Future pages** must respect this navigation hierarchy. No developer may add a new sidebar item without identifying its position in the configuration workflow as defined by this document.
5. **No exceptions without a decision record.** Any deviation from this structure requires a superseding DEC to be written and approved first.

---

## Consequences

### Positive

- Users can self-onboard by following the sidebar without external documentation.
- New developers understand the platform's configuration model from the sidebar alone.
- Scope reviews ("does this belong in Business App or Platform Admin?") have a clear framework.
- Naming changes reduce support questions caused by technical label confusion.

### Negative

- Existing sidebar implementations must be refactored to match the new order and labels.
- Route paths tied to old module names may need updating.
- Teams must consult this document before adding any new navigation item, adding process overhead.

---

## Supersedes

This decision supersedes previous sidebar ordering defined in:

- `docs/Frontend/UX.md` §4 (Sidebar Design) — where conflicts exist with this document, DEC-016 takes precedence.
- `docs/Decisions/DEC-007-Role-Navigation-and-Route-Protection.md` — sidebar section order only; route protection rules in DEC-007 remain in effect.

## References

- `docs/Frontend/UX.md` — Sidebar and navbar architecture
- `docs/Decisions/DEC-007-Role-Navigation-and-Route-Protection.md` — Route protection rules
- `docs/Decisions/ADR-001-Dual-Navigation-Strategy.md` — Business App / Platform Admin tab switching
