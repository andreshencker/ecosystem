---
date: 2026-06-22
status: accepted
tags: [adr, architecture, frontend, navigation]
---

# ADR-001: Dual Navigation Strategy

## Status

Accepted — 2026-06-22

## Context

The Communication Portal has two fundamentally different user populations:

1. **Company-scoped users** (`company_owner`, `company_admin`, `operator`, `viewer`) — operate within a single tenant. Their daily tasks are: managing their company's configuration, users, templates, channels, files, and notifications.

2. **Platform administrators** (`platform_admin`) — operate across all tenants. Their tasks span two distinct concerns:
   - **Business operations** — managing companies, global channels, providers, and templates as a product admin.
   - **Platform support / ops** — cross-company audit, monitoring failed notifications, reviewing API usage and error logs.

Early prototypes used a single sidebar for `platform_admin` that tried to mix both concerns. This produced a long, cluttered sidebar where business management items and support/monitoring items competed for attention, with no clear separation of intent.

The alternative — two completely separate roles — was rejected because `platform_admin` legitimately performs both types of work and switching accounts would create operational friction.

The [[dual-surface-module-model]] established that each module exposes two surfaces (business view and support/admin view). The navigation system must reflect that model.

## Decision

Implement **dual-mode navigation** exclusively for `platform_admin`. All other roles use single-mode navigation.

A tab switcher rendered in the top navigation bar allows `platform_admin` to toggle between two named modes:

| Mode label | Value | Purpose |
|---|---|---|
| Business App | `business` | Manage companies, channels, providers, templates, users, files |
| Platform Admin | `admin` | Cross-company audit, support, monitoring, platform-level management |

Each mode maps to a dedicated sidebar configuration defined in `role-config.ts`. The active mode is stored in the UI store (`NavMode`) and persists for the session.

### Business App Mode — Sidebar Structure

```
Overview
  ▪ Dashboard

Business
  ▪ Companies
  ▪ Team
  ▪ Channels
  ▪ Providers
  ▪ Templates

Files
  ▪ Reports
  ▪ Media
  ▪ Storage

Settings
  ▪ Profile
```

### Platform Admin Mode — Sidebar Structure

```
Overview
  ▪ Dashboard

Platform Management
  ▪ Companies
  ▪ Platform Admins
  ▪ Channels
  ▪ Providers
  ▪ Global Templates

Support / Operations
  ▪ Global Users
  ▪ Audit Logs
  ▪ Failed Notifications
  ▪ API Usage
  ▪ Company Activity
  ▪ Error Logs

Settings
  ▪ Profile
```

### Access Rules

- Only roles with `navbarMode: 'dual'` in `role-config.ts` get the tab switcher. Currently only `platform_admin`.
- All company-scoped roles have `navbarMode: 'single'` and never see the tab switcher.
- Route authorization (Layer 2, middleware) is unchanged by nav mode — `platform_admin` has a single flat `allowedRoutes` set covering both modes. Mode switching changes the sidebar only, not what routes are accessible.
- `AppShell` reads the active `navMode` from the UI store and passes the appropriate sidebar config (`sidebar` or `sidebarAdmin`) to `Sidebar.tsx`.

### Implementation Constraint

`AppShell`, `Topbar`, and `Sidebar` are config-driven. No component contains `if (role === 'platform_admin')` logic. The dual-nav behaviour emerges entirely from:

```
role-config.ts → navbarMode: 'dual' → AppShell renders tab switcher → sidebar swaps on mode change
```

## Consequences

### Positive

- `platform_admin` gets a clean, task-focused sidebar for each operational context.
- No role-conditional logic leaks into `Topbar.tsx` or `Sidebar.tsx`.
- Adding a third nav mode in the future requires only a config change.
- Company-scoped users are completely unaffected.

### Negative

- `platform_admin` must consciously switch modes. If a task spans both concerns, they may need to toggle.
- Both sidebar configs reference some overlapping routes (e.g. `/companies`, `/dashboard`), which must stay in sync.

### Neutral

- The `navbarMode` field in `RoleConfig` is currently unused for all non-`platform_admin` roles. It exists as a forward-compatibility anchor.

## Related

- [[Decisions]] — full ADR index
- [[ADR-003 Top Navigation Simplification]] — how the tab switcher is positioned in the topbar
- [[DEC-003 Role Navigation and Route Protection]] — three-layer protection model
- [[dual-surface-module-model]] — the two-surface principle that motivated this decision
