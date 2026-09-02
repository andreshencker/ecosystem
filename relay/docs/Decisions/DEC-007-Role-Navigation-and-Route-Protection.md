# DEC-007 — Role Navigation and Route Protection

| Field | Value |
|---|---|
| ID | DEC-007 |
| Status | **Approved (2026-06-15)** |
| Authors | Architecture |
| Last Updated | 2026-06-15 |
| Depends on | DEC-004 Amendment A1/A2 |

---

## 1. Context

The Communication Portal has five distinct roles with fundamentally different access profiles. Early implementation used ad-hoc `if (role === …)` checks scattered across components, login redirects, and no server-side route enforcement. This document replaces that approach with a formal, layered protection model driven by a single configuration file.

---

## 2. Decision

### 2.1 Single Source of Truth

All role-based navigation and permission logic in the frontend is defined in one file:

```
src/config/rbac/role-config.ts
```

No other file may contain role-conditional navigation logic. Every component, hook, middleware, and layout that needs to vary behaviour by role must call one of these four functions:

```ts
getRoleConfig(role)                      // full config object
getLandingPage(role)                     // post-login redirect target
isRouteAllowed(role, pathname)           // Layer 2 route check
getPermissions(role)                     // Layer 3 permission object
```

### 2.2 Three-Layer Protection Model

Protection is not a single check. It operates at three independent, sequentially-applied layers:

```
Layer 1 — Session Authentication
  Where: Next.js middleware
  Checks: isAuthenticated (valid token or refreshable session)
  On failure: redirect to /auth/login
  Note: this layer does not know or care about role

Layer 2 — Route Authorization
  Where: Next.js middleware (same pass, after Layer 1)
  Checks: isRouteAllowed(session.role, request.nextUrl.pathname)
  On failure: redirect to getLandingPage(session.role)
  Note: sidebar visibility does NOT substitute for this layer

Layer 3 — Action Authorization
  Where: component level, via <PermissionGuard> or usePermissions()
  Checks: getPermissions(role).<specific permission>
  On failure: element is not rendered
  Note: Layer 3 never redirects — it only hides or shows UI
```

### 2.3 Sidebar Visibility is Not Authorization

Hiding a sidebar link is convenience. It is not a security control. A user who knows a URL can navigate directly. Layer 2 must block them regardless of whether the link is visible.

Every route blocked from a role via sidebar must also be absent from that role's `allowedRoutes` in `role-config.ts`.

---

## 3. `role-config.ts` Structure

### 3.1 Config Entry per Role

```ts
interface RoleConfig {
  role: UserRole;
  scope: Scope;
  landingPage: string;
  navbar: NavbarConfig;
  sidebar: SidebarSection[];
  allowedRoutes: string[];
  permissions: UserPermissions;
}
```

### 3.2 `NavbarConfig`

```ts
interface NavbarConfig {
  showCompanyName: boolean;
  showRoleBadge: boolean;
  roleBadgeLabel: string;       // human-readable label e.g. "Owner", "Platform Admin"
  showEnvironmentBadge: boolean;
  showCompanySwitcher: boolean;
}
```

### 3.3 `SidebarSection`

```ts
interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

interface SidebarItem {
  href: string;
  label: string;
  icon: string;        // MUI icon name key, e.g. 'DashboardOutlined'
}
```

### 3.4 Accessor Functions

```ts
// Returns the full config for a role. Throws for unknown roles — no fallback.
function getRoleConfig(role: UserRole): RoleConfig

// Returns the post-login landing page for a role.
function getLandingPage(role: UserRole): string

// Returns true if the given pathname is in the role's allowedRoutes (prefix match).
function isRouteAllowed(role: UserRole, pathname: string): boolean

// Returns the permissions object for a role. All permissions are booleans.
function getPermissions(role: UserRole): UserPermissions
```

### 3.5 Safety Contract

- `getRoleConfig` must throw for any unknown or null role.
- No function may return a privileged default for an unknown role.
- `emptyPermissions` (all false) is the safe fallback when `role` is null (unauthenticated).

---

## 4. Route Protection Matrix

### 4.1 `allowedRoutes` per Role

Routes use prefix matching: `/companies` in `allowedRoutes` also permits `/companies/any-id`.

| Route | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| `/dashboard` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/companies` | ✓ | ✓* | ✗ | ✗ | ✗ |
| `/users` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/channels` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/providers` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/provider-credentials` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/domain-catalogue` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/event-catalogue` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/layout-templates` | ✓ | ✓ | ✓ | ✗ | ✓ |
| `/notifications/test` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/files/media` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/files/reports` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/files/storage` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/api-keys` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/audit-logs` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/settings/profile` | ✓ | ✓ | ✓ | ✓ | ✓ |

*`company_owner` is in `allowedRoutes` for `/companies` to enable navigation to `/companies/:id` (own company). The companies list view at `/companies` (without `:id`) must handle this at the page level by redirecting to `/companies/<authStore.companyId>`. Middleware allows the prefix; the page enforces the scope.

### 4.2 Redirect Targets on Forbidden Route

All forbidden routes redirect to `getLandingPage(role)`:

| Role | Landing Page (forbidden route redirect target) |
|---|---|
| `platform_admin` | `/dashboard` |
| `company_owner` | `/dashboard` |
| `company_admin` | `/dashboard` |
| `operator` | `/dashboard` |
| `viewer` | `/dashboard` |

---

## 5. Post-Login Navigation

### 5.1 Rule

The login page calls `getLandingPage(user.role)` and redirects. It contains no role logic of its own.

### 5.2 Anti-Pattern

```ts
// INCORRECT — forbidden in any component or page
if (role === 'platform_admin') router.push('/dashboard');
if (role === 'company_owner')  router.push('/dashboard');
```

### 5.3 Correct Pattern

```ts
// CORRECT — the only permitted pattern
router.push(getLandingPage(user.role));
```

### 5.4 Registration → Login Redirect

After successful registration:

```
POST /auth/register → 201
  └── router.push('/auth/login?registered=true')
```

The login page shows a banner when `?registered=true` is present. The user must verify their email before they can log in.

---

## 6. Permission (Action) Authorization

### 6.1 `<PermissionGuard>` Pattern

```tsx
<PermissionGuard permission="canInviteUsers">
  <Button onClick={openInviteDialog}>Invite User</Button>
</PermissionGuard>
```

Renders `null` when the current user's role does not have the permission. Does not throw, redirect, or log.

### 6.2 `usePermissions()` Pattern

```ts
const { canManageTemplates, canViewTemplates } = usePermissions();

if (canManageTemplates) {
  // show edit button
}
```

### 6.3 Invite Dialog Permission Filtering

The invite dialog must filter the available roles based on `usePermissions()`:

| Acting role | Roles visible in invite dialog |
|---|---|
| `platform_admin` | `company_owner`, `company_admin`, `operator`, `viewer` |
| `company_owner` | `company_admin`, `operator`, `viewer` |
| `company_admin` | `operator`, `viewer` |
| `operator` | (dialog not rendered — `canInviteUsers` is false) |
| `viewer` | (dialog not rendered — `canInviteUsers` is false) |

The dialog role list is derived from the permissions object, not from inline role checks.

---

## 7. Sidebar and Navbar Architecture

### 7.1 Sidebar

`Sidebar.tsx` accepts `sections: SidebarSection[]` as a prop. It renders purely from this prop. No role-conditional logic inside.

```
AppShell
  └── sections = getRoleConfig(authStore.role).sidebar
  └── <Sidebar sections={sections} />
        └── sections.map(section => <SidebarSection ... />)
              └── section.items.map(item => <SidebarItem ... />)
```

### 7.2 Navbar

`Topbar.tsx` accepts `navbarConfig: NavbarConfig` as a prop. It renders purely from this prop.

```
AppShell
  └── navbarConfig = getRoleConfig(authStore.role).navbar
  └── <Topbar config={navbarConfig} />
```

### 7.3 Adding a New Role

Adding a new role requires only:

1. Backend: add to role enum and validation rules.
2. `role-config.ts`: add one `RoleConfig` entry.

| File | Change required |
|---|---|
| `role-config.ts` | Add entry |
| `Topbar.tsx` | None |
| `Sidebar.tsx` | None |
| Middleware | None |
| Login page | None |
| `PermissionGuard` | None |

---

## 8. Invariants (must always hold)

| # | Invariant |
|---|---|
| INV-001 | `getRoleConfig(role)` throws for any role not in the known five. No silent fallback. |
| INV-002 | `allowedRoutes` for a role and sidebar items for that role must be consistent: every sidebar item's `href` must appear in `allowedRoutes`. |
| INV-003 | Every route NOT in a role's `allowedRoutes` must NOT appear in that role's sidebar. |
| INV-004 | `usePermissions()` returns `emptyPermissions` (all false) when `role` is null. |
| INV-005 | The login page contains zero role-conditional redirect logic. |
| INV-006 | No component contains `if (role === '...')` or `switch (role)` logic. |
| INV-007 | Layer 2 route protection is always active regardless of sidebar state. |
| INV-008 | `platform_admin` permissions are never assigned as a default for missing roles. |

---

## 9. Identified Contradictions Resolved by This Document

| ID | Issue | Resolution |
|---|---|---|
| CONT-001 | `/companies` listed as accessible to `company_owner` in Routes.md and Architecture.md | Resolved: `/companies` list is `platform_admin` only. `company_owner` accesses `/companies/:id`. Page-level redirect handles the prefix match. |
| CONT-003 | Registration does not redirect to `/auth/login?registered=true` | Resolved: Submit handler must call `router.push('/auth/login?registered=true')` on 201 response. |
| CONT-006 | Notification Testing missing from `company_owner` sidebar in UX.md | Resolved: Added to company_owner and company_admin sidebars under "Operations" section. |
| CONT-008 | `derivePermissions` in `types/permissions.ts` references removed `company_user` role | Resolved: `derivePermissions` deleted. All permission lookups use `getPermissions(role)` from `role-config.ts`. |

---

## 10. Open Gaps

| # | Gap |
|---|---|
| ROUTE-001 | Middleware cannot read the Zustand store (memory-only). Session claim strategy (short-lived cookie vs. JWT cookie) must be decided before middleware can enforce Layer 2. |
| ROUTE-002 | Dynamic segments (`:id`) use prefix matching. Complex nested routes may need refinement. |
| ROUTE-003 | No 403/access-denied feedback. Silent redirect may confuse users. Consider a toast before redirect. |
| G-009 | Route namespace is flat, not `/portal/`-prefixed. `allowedRoutes` uses flat paths until resolved. |
