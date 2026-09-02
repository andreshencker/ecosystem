---
date: 2026-06-22
status: accepted
tags: [adr, architecture, frontend, navigation, ux]
---

# ADR-003: Top Navigation Simplification

## Status

Accepted — 2026-06-22

## Context

The original top navbar layout (left → right) was:

```
[☰ mobile] [Company name]  [Business App | Platform Admin tabs]  ──spacer──  [DEVELOPMENT] [Platform Admin] [Avatar ▾]
```

Three problems were identified:

1. **Environment badge clutter.** The `DEVELOPMENT` chip (driven by `NEXT_PUBLIC_APP_ENV`) conveyed no actionable information during development. In production it becomes `PRODUCTION`, which is also not actionable. No user task depends on knowing the environment from the navbar; developers use DevTools and URL bars for that.

2. **Role badge redundancy.** The `Platform Admin` chip repeated identity information that is already implicit from the sidebar structure and the tab switcher. It added visual weight without adding clarity.

3. **Tab placement broke visual hierarchy.** The Business App / Platform Admin tab switcher was left-aligned, immediately after the company name, which placed a right-side navigation control (mode switcher) on the left side of the bar. The flex spacer pushed everything else right, but the tabs themselves acted as a left-anchored element — inconsistent with how mode-switchers typically behave in product UIs (right-aligned, near the user context).

The `NavbarConfig` interface had `showRoleBadge` and `showEnvironmentBadge` fields that drove this rendering from `role-config.ts`. `platform_admin` had both set to `true`.

## Decision

### Changes Applied

1. **Remove the DEVELOPMENT / environment badge.** The `showEnvironmentBadge` rendering block is deleted from `Topbar.tsx`. The `getEnvLabel()` helper function is deleted. The `Chip` import is removed. The `showEnvironmentBadge` field remains in `NavbarConfig` for potential future use but is no longer read by `Topbar`.

2. **Remove the role badge.** The `showRoleBadge` rendering block is deleted from `Topbar.tsx`. The `showRoleBadge` field remains in `NavbarConfig` but is no longer read by `Topbar`.

3. **Move tabs to the right side.** The `<Tabs>` block is relocated to after `<Box flex={1} />`, placing it flush-right directly before the user profile area. `flexShrink: 0` is added to prevent compression on narrower viewports.

### Resulting Layout

```
[☰ mobile only]  [Company name — company roles only]  ──flex spacer──  [Business App | Platform Admin]  [● Name / email]
```

### File Changed

`components/layout/Topbar.tsx` only. No changes to `role-config.ts`, `AppShell.tsx`, sidebar, or any page component.

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| Desktop (md+, ≥900px) | Spacer fills remaining space; tabs and full profile (avatar + name + email) visible |
| Tablet (sm, 600–899px) | Spacer pushes tabs right; profile shows avatar + name + email (`sm` shows text) |
| Mobile (xs, <600px) | Hamburger icon left; tabs right with `flexShrink: 0`; avatar only (name/email hidden via `display: { xs: 'none', sm: 'block' }`) |

Tabs remain visible and functional on mobile so `platform_admin` can switch sidebar modes on any device. The tabs do not wrap or collapse because two short labels ("Business App" + "Platform Admin") fit at all realistic mobile widths alongside an icon-only profile.

### NavbarConfig Fields — Disposition

| Field | Role config value | Topbar renders it? |
|---|---|---|
| `showCompanyName` | Varies by role | Yes — still rendered |
| `showRoleBadge` | `true` for all roles | No — field retained, rendering removed |
| `showEnvironmentBadge` | `true` for `platform_admin` | No — field retained, rendering removed |
| `showCompanySwitcher` | `false` for all roles | Was already not rendered |
| `roleBadgeLabel` | Varies | Unused — retained for schema completeness |

## Consequences

### Positive

- Navbar is visually lighter — two fewer chips on every page load.
- Tab switcher is semantically in the correct position (right side, with navigation controls).
- Mobile layout is unaffected: tabs remain usable, no horizontal overflow added.
- No downstream component changes required — `Topbar` is the only file changed.

### Negative

- `UX.md` §2.2–2.8 (in `docs/Frontend/`) describes the old navbar layout with role and environment badges. That document is now stale and should be updated in a future documentation pass. The `NavbarConfig` interface definition in that document references `showRoleBadge` and `showEnvironmentBadge` as rendered features — note that these fields still exist in the type but are no longer rendered.
- `role-config.ts` still sets `showRoleBadge: true` for all roles and `showEnvironmentBadge: true` for `platform_admin`. These values are effectively dead config until a future decision re-activates them or removes the fields.

### Neutral

- The `Chip` import is removed from `Topbar.tsx` entirely, which marginally reduces the component's bundle contribution.
- `getEnvLabel()` is removed. If an environment indicator is ever needed again, it must be re-derived from `NEXT_PUBLIC_APP_ENV`.

## Related

- [[Decisions]] — full ADR index
- [[ADR-001 Dual Navigation Strategy]] — the tab switcher whose position this ADR changes
- [[ADR-002 Global Responsive Standard]] — responsive rules applied to this component
- [[DEC-003 Role Navigation and Route Protection]] — overall NavbarConfig contract
