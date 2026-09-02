# Frontend Route Architecture

| Field | Value |
|---|---|
| Last Updated | 2026-06-23 |
| Governs | `communications-front` |
| Decision baseline | [DEC-007](../Decisions/DEC-007-Role-Navigation-and-Route-Protection.md), [DEC-008](../Decisions/DEC-008-User-Company-Role-Lifecycle.md) |

---

## 1. Route Namespace

> **Gap (G-009):** Current routes are flat (e.g. `/companies`, `/dashboard`). DEC-004 A1 references a `/portal/` prefix. Until this is standardised, `allowedRoutes` in `role-config.ts` must use the **actual** flat paths currently in use. All documentation in this file uses the actual paths.

---

## 2. Route Groups

### 2.1 Auth Routes (unauthenticated)

| Path | Page | Behaviour for authenticated users |
|---|---|---|
| `/auth/login` | Login | Redirect to `getLandingPage(role)` |
| `/auth/register` | Register | Redirect to `getLandingPage(role)` |
| `/auth/verify-email` | Email verification | Redirect to `getLandingPage(role)` |
| `/auth/forgot-password` | Forgot password | Redirect to `getLandingPage(role)` |
| `/auth/reset-password` | Reset password | Redirect to `getLandingPage(role)` |

### 2.2 Portal Routes (authenticated) — by Role

> **CONT-001 resolved:** `/companies` is `platform_admin` only. `company_owner` accesses `/companies/:id` (own company). The previous table listing `company_owner` for `/companies` was incorrect.

| Path | Module | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|---|
| `/dashboard` | Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/companies` | Companies list | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/companies/:id` | Company detail | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| `/users` | Users / Team | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/channels` | Channels | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/providers` | Providers | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/provider-credentials` | Channel Credentials | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/domain-catalogue` | Domain Catalogue | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/event-catalogue` | Event Catalogue | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/layout-templates` | Layout Templates | ✓ | ✓ | ✓ | ✗ | ✓ (read) |
| `/notifications/test` | Notification Testing | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/files/media` | Media | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/files/reports` | Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/files/storage` | Storage | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/api-keys` | API Keys | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/audit-logs` | Audit Logs | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/settings/profile` | Profile | ✓ | ✓ | ✓ | ✓ | ✓ |

### 2.3 Forbidden Routes by Role (must redirect to landing page)

| Role | Forbidden routes |
|---|---|
| `platform_admin` | None |
| `company_owner` | `/companies`, `/channels`, `/providers` |
| `company_admin` | `/companies`, `/companies/:id`, `/channels`, `/providers`, `/api-keys`, `/audit-logs`, `/files/storage` |
| `operator` | `/companies`, `/companies/:id`, `/channels`, `/providers`, `/users`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`, `/api-keys`, `/audit-logs`, `/files/storage` |
| `viewer` | `/companies`, `/companies/:id`, `/channels`, `/providers`, `/users`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/notifications/test`, `/files/media`, `/api-keys`, `/audit-logs`, `/files/storage` |

---

## 3. Three-Layer Authorization Model

Authorization operates at three independent layers. Each layer is separately enforced. A lower layer never compensates for a missing higher layer.

```
Layer 1 — Session Authentication
  Where: Next.js middleware (runs before every request)
  Checks: isAuthenticated (valid access token or refresh token)
  On failure: redirect to /auth/login

Layer 2 — Route Authorization
  Where: Next.js middleware
  Checks: isRouteAllowed(role, pathname)           ← role-config.ts
  On failure: redirect to getLandingPage(role)     ← role-config.ts

Layer 3 — Action Authorization
  Where: Component level
  Checks: getPermissions(role) via usePermissions() or <PermissionGuard>
  On failure: hide/disable UI element (never redirect)
```

**Core principle:** Sidebar visibility does **not** constitute authorization. A hidden link must also be blocked at Layer 2.

---

## 4. Middleware Contract

```ts
// middleware.ts — runs on every request matching the portal route pattern
export function middleware(request: NextRequest): NextResponse {
  const session = getSessionFromRequest(request);

  // Layer 1 — unauthenticated
  if (!session.isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    const landingPage = getLandingPage(session.role);
    return NextResponse.redirect(new URL(landingPage, request.url));
  }

  // Layer 2 — unauthorized route
  if (!isRouteAllowed(session.role, request.nextUrl.pathname)) {
    const landingPage = getLandingPage(session.role);
    return NextResponse.redirect(new URL(landingPage, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|public|favicon.ico).*)'],
};
```

---

## 5. `isRouteAllowed` Contract

```ts
function isRouteAllowed(role: UserRole, pathname: string): boolean {
  const config = getRoleConfig(role);
  return config.allowedRoutes.some(
    (pattern) => pathname === pattern || pathname.startsWith(pattern + '/')
  );
}
```

Pattern matching is prefix-based. `/companies` in `allowedRoutes` matches `/companies/cmp_abc123`.

**Safety rule:** If `role` is null or unknown, `isRouteAllowed` must return `false` for all routes. The middleware then redirects to `/auth/login`.

---

## 6. `PermissionGuard` Contract

```tsx
// Hides children if the current user lacks the specified permission.
<PermissionGuard permission="canCreateCompany">
  <Button>Create Company</Button>
</PermissionGuard>
```

`PermissionGuard` reads from `getRoleConfig(useAuthStore().role).permissions`. Renders `null` when false. Does not redirect.

---

## 7. `usePermissions` Hook Contract

```ts
function usePermissions(): UserPermissions {
  const role = useAuthStore((s) => s.role);
  if (!role) return emptyPermissions;   // all false — not platform_admin
  return getPermissions(role);          // delegates to role-config.ts
}
```

Returns all-false permissions when unauthenticated. Never returns a privileged default.

---

## 8. `allowedRoutes` Entries per Role

The following lists are the authoritative input to `role-config.ts`. All patterns are prefix-matched.

### `platform_admin`
```ts
[
  '/dashboard',
  '/companies',
  '/users',
  '/channels',
  '/providers',
  '/provider-credentials',
  '/domain-catalogue',
  '/event-catalogue',
  '/layout-templates',
  '/notifications/test',
  '/files/media',
  '/files/reports',
  '/files/storage',
  '/api-keys',
  '/audit-logs',
  '/settings/profile',
]
```

### `company_owner`
```ts
[
  '/dashboard',
  '/companies',    // prefix-match covers /companies/:id — owner accesses own company detail only
  '/users',
  '/provider-credentials',
  '/domain-catalogue',
  '/event-catalogue',
  '/layout-templates',
  '/notifications/test',
  '/files/media',
  '/files/reports',
  '/files/storage',
  '/api-keys',
  '/audit-logs',
  '/settings/profile',
]
```

> The backend enforces that `company_owner` can only read/write their own `companyId`. The route `/companies` prefix grants navigation to `/companies/:id`; the list view at `/companies` must redirect to the owner's own company detail. This is enforced at the page level, not the middleware level.

### `company_admin`
```ts
[
  '/dashboard',
  '/users',
  '/provider-credentials',
  '/domain-catalogue',
  '/event-catalogue',
  '/layout-templates',
  '/notifications/test',
  '/files/media',
  '/files/reports',
  '/settings/profile',
]
```

### `operator`
```ts
[
  '/dashboard',
  '/notifications/test',
  '/files/media',
  '/files/reports',
  '/settings/profile',
]
```

### `viewer`
```ts
[
  '/dashboard',
  '/layout-templates',
  '/files/reports',
  '/settings/profile',
]
```

---

## 9. Required Test Scenarios — Route Protection

### Direct URL Access Tests

| # | Test | Role | URL | Expected |
|---|---|---|---|---|
| R-01 | Unauthenticated → protected route | none | `/dashboard` | Redirect to `/auth/login` |
| R-02 | Authenticated → auth page | any | `/auth/login` | Redirect to `getLandingPage(role)` |
| R-03 | company_owner → companies list | company_owner | `/companies` | Redirect to `/dashboard` (or own company detail) |
| R-04 | company_owner → channels | company_owner | `/channels` | Redirect to `/dashboard` |
| R-05 | company_owner → providers | company_owner | `/providers` | Redirect to `/dashboard` |
| R-06 | company_admin → companies detail | company_admin | `/companies/any-id` | Redirect to `/dashboard` |
| R-07 | company_admin → api-keys | company_admin | `/api-keys` | Redirect to `/dashboard` |
| R-08 | company_admin → audit-logs | company_admin | `/audit-logs` | Redirect to `/dashboard` |
| R-09 | operator → users | operator | `/users` | Redirect to `/dashboard` |
| R-10 | operator → credentials | operator | `/provider-credentials` | Redirect to `/dashboard` |
| R-11 | operator → templates | operator | `/layout-templates` | Redirect to `/dashboard` |
| R-12 | viewer → users | viewer | `/users` | Redirect to `/dashboard` |
| R-13 | viewer → notifications/test | viewer | `/notifications/test` | Redirect to `/dashboard` |
| R-14 | viewer → provider-credentials | viewer | `/provider-credentials` | Redirect to `/dashboard` |
| R-15 | viewer → media | viewer | `/files/media` | Redirect to `/dashboard` |

### Unauthorized Access Attempts (direct URL bypass)

| # | Test | Role | URL | Expected |
|---|---|---|---|---|
| R-16 | viewer guesses /companies URL | viewer | `/companies/some-id` | Redirect to `/dashboard` |
| R-17 | operator guesses /users URL | operator | `/users` | Redirect to `/dashboard` |
| R-18 | company_admin guesses /api-keys URL | company_admin | `/api-keys` | Redirect to `/dashboard` |
| R-19 | company_owner guesses /channels URL | company_owner | `/channels` | Redirect to `/dashboard` |
| R-20 | company_owner tries other company's detail | company_owner | `/companies/other-company-id` | Backend returns 403; page shows error state |

### Redirects After Logout

| # | Test | Expected |
|---|---|---|
| R-21 | Any role clicks Sign Out | Redirect to `/auth/login` |
| R-22 | After logout, back button to `/dashboard` | Redirect to `/auth/login` (session cleared) |

---

## 10. Route Protection Gaps

| # | Gap |
|---|---|
| G-009 | Route namespace not yet `/portal/`-prefixed. `allowedRoutes` must use flat paths until resolved. |
| ROUTE-001 | Middleware cannot read the Zustand store (memory-only). Session claim strategy for middleware (cookie vs. JWT parse) must be decided. |
| ROUTE-002 | Dynamic segments (`:id`) use prefix matching. May need refinement for deeply nested routes. |
| ROUTE-003 | No 403/access-denied feedback exists. Silent redirect may confuse users navigating via URL. Consider a brief toast before redirect. |
| CONT-003 | Registration page does not redirect to `/auth/login?registered=true` after submit. |
