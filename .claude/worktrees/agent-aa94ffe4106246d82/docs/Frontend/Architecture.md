# Frontend Architecture

| Field | Value |
|---|---|
| Last Updated | 2026-06-23 |
| Governs | `communications-front` |
| Framework | Next.js 14 (App Router) |
| Decision baseline | [DEC-008](../Decisions/DEC-008-User-Company-Role-Lifecycle.md), [DEC-006](../Decisions/DEC-006-Frontend-Stack.md), [ADR-002](../Decisions/ADR-002-Global-Responsive-Standard.md) |

> **Migration note (2026-06-23):** Updated references from DEC-004 → DEC-008, DEC-002 Frontend Stack → DEC-006.

---

## 1. Directory Structure

```
communications-front/
├── app/
│   ├── (auth)/               # Unauthenticated routes
│   │   └── auth/
│   │       ├── login/
│   │       ├── register/
│   │       ├── verify-email/
│   │       ├── forgot-password/
│   │       └── reset-password/
│   └── (portal)/             # Authenticated routes
│       ├── layout.tsx         # AppShell — mounts Topbar + Sidebar
│       ├── dashboard/
│       ├── companies/
│       │   └── [id]/
│       ├── channels/
│       ├── providers/
│       ├── company-channel-providers/
│       ├── provider-credentials/
│       ├── domain-catalogue/
│       ├── event-catalogue/
│       ├── layout-templates/
│       ├── notifications/test/
│       ├── files/
│       │   ├── media/
│       │   ├── reports/
│       │   └── storage/
│       ├── users/
│       ├── api-keys/
│       ├── audit-logs/
│       └── settings/profile/
├── components/
│   ├── layout/                # AppShell, Topbar, Sidebar, SidebarSection, SidebarItem, PageHeader
│   ├── domain/                # Feature-specific components
│   └── shared/                # Reusable UI: DataTable, FormDrawer, PermissionGuard, etc.
├── hooks/
│   └── api/                   # React Query hooks per domain
├── lib/
│   ├── constants.ts
│   ├── queryClient.ts
│   ├── axios.ts
│   └── schemas/               # Zod validation schemas
├── providers/                 # React context providers (QueryClient, Theme, etc.)
├── src/
│   └── config/
│       └── rbac/
│           └── role-config.ts  # SOLE source of truth for RBAC (DEC-004 A1/A2)
├── stores/
│   ├── auth.store.ts
│   └── ui.store.ts
├── theme/
└── types/
    ├── api.ts                 # API response types (must align with DEC-004 A1/A2)
    └── permissions.ts         # UserPermissions type — consumed from role-config.ts only
```

> **Note:** `src/config/rbac/role-config.ts` does not yet exist. It is the primary deliverable of DEC-004 A1/A2 implementation.

---

## 2. RBAC Architecture

The entire role-based behaviour of the frontend flows from a single file:

```
src/config/rbac/role-config.ts
  └── getRoleConfig(role)              → RoleConfig
  └── getLandingPage(role)             → string
  └── isRouteAllowed(role, pathname)   → boolean
  └── getPermissions(role)             → UserPermissions
```

**No component may contain `if (role === …)` or `switch (role)` logic.**

### 2.1 Five Responsibilities of `role-config.ts`

| # | Responsibility | Consumed by |
|---|---|---|
| 1 | **Post-login redirect** — `getLandingPage(role)` | Login page, `AuthProvider` |
| 2 | **Navbar rendering** — `getRoleConfig(role).navbar` | `Topbar` component |
| 3 | **Sidebar rendering** — `getRoleConfig(role).sidebar` | `Sidebar` component |
| 4 | **Route authorization** — `isRouteAllowed(role, pathname)` | Next.js middleware |
| 5 | **Permission authorization** — `getPermissions(role)` | `usePermissions()`, `<PermissionGuard>` |

### 2.2 Role Addition Contract

Adding a new role to the application requires exactly two changes:

1. Backend: add role to enum + validation rules.
2. `role-config.ts`: add one `RoleConfig` entry.

No changes to: login page, `Topbar`, `Sidebar`, middleware, `PermissionGuard`.

### 2.3 Safety Rules

- `getRoleConfig(role)` must **throw** for unknown roles — never fall back to a default.
- No frontend code path may derive `platform_admin` from a missing or null role value.
- `usePermissions()` returns `emptyPermissions` (all false) when `role` is null (unauthenticated state), not a privileged default.

See [DEC-008 §7](../Decisions/DEC-008-User-Company-Role-Lifecycle.md#7-frontend-single-source-of-truth--role-configts) for full type contracts and accessor function signatures.

---

## 3. Rendering Model

### 3.1 Route Groups

| Group | Layout | Guard |
|---|---|---|
| `(auth)` | Plain — no Topbar/Sidebar | Redirect to landing if already authenticated |
| `(portal)` | AppShell — Topbar + Sidebar | Requires session; route authorization via middleware |

### 3.2 AppShell

`AppShell.tsx` composes:
- `Topbar` (receives `NavbarConfig` from `getRoleConfig(role).navbar`)
- `Sidebar` (receives `SidebarSection[]` from `getRoleConfig(role).sidebar`)
- Page content slot

AppShell reads the authenticated user from `useAuthStore()` and passes role-derived config down. It never contains role-specific conditionals.

---

## 4. Data Fetching

- **React Query** (`@tanstack/react-query`) for all server state.
- Query hooks live in `hooks/api/`.
- The Axios instance in `lib/axios.ts` attaches the access token from `useAuthStore` and handles 401 → token refresh → retry.
- Mutations invalidate relevant query keys on success.

---

## 5. State Management

See [State Management](./State-Management.md) for detail.

| Store | Contents |
|---|---|
| `auth.store.ts` | `user`, `accessToken`, `isAuthenticated`, `role`, `scope`, `companyId`, `companyKey` |
| `ui.store.ts` | Sidebar open/close, global snackbar state |

---

## 6. Type Alignment (DEC-004 A1/A2)

| File | Required state |
|---|---|
| `types/api.ts` → `UserRole` | `'platform_admin' \| 'company_owner' \| 'company_admin' \| 'operator' \| 'viewer'` — `company_user` removed |
| `types/api.ts` → `User` | `role: UserRole`, `scope: Scope`, `companyId: string \| null`, `companyKey: string \| null` — all required |
| `types/permissions.ts` | Must export `UserPermissions` type only. All logic removed. `derivePermissions` deleted. |
| `stores/auth.store.ts` | `role`, `scope`, `companyId`, `companyKey` as direct fields |

---

## 7. Module — Role Compatibility Matrix

| Module | Route | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|---|
| Dashboard | `/dashboard` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Companies (list) | `/companies` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Company (own) | `/companies/:id` | ✓ | ✓ | ✗ | ✗ | ✗ |
| Users | `/users` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Channels | `/channels` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Providers | `/providers` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Credentials | `/provider-credentials` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Domain Catalogue | `/domain-catalogue` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Event Catalogue | `/event-catalogue` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Templates | `/layout-templates` | ✓ | ✓ | ✓ | ✗ | ✓ (read) |
| Notification Testing | `/notifications/test` | ✓ | ✓ | ✓ | ✓ | ✗ |
| Media | `/files/media` | ✓ | ✓ | ✓ | ✓ | ✗ |
| Reports | `/files/reports` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Storage | `/files/storage` | ✓ | ✓ | ✓ | ✗ | ✗ |
| API Keys | `/api-keys` | ✓ | ✓ | ✗ | ✗ | ✗ |
| Audit Logs | `/audit-logs` | ✓ | ✓ | ✗ | ✗ | ✗ |
| Profile | `/settings/profile` | ✓ | ✓ | ✓ | ✓ | ✓ |

> **CONT-001 resolved:** `/companies` (list) is `platform_admin` only. `company_owner` accesses `/companies/:id` for their own company. Previous versions of this matrix incorrectly granted `company_owner` access to the list route.

---

## 8. `role-config.ts` — Permission Type Contract

```ts
interface UserPermissions {
  // Company management
  canViewAllCompanies: boolean;
  canViewOwnCompany: boolean;
  canCreateCompany: boolean;
  canEditCompany: boolean;
  canDeleteCompany: boolean;
  canDeactivateCompany: boolean;

  // User management
  canManageUsers: boolean;
  canInviteUsers: boolean;
  canDeactivateUsers: boolean;
  canDeleteUsers: boolean;
  canTransferOwnership: boolean;

  // Platform catalogue (platform_admin only)
  canViewChannels: boolean;
  canManageChannels: boolean;
  canManageProviders: boolean;

  // Company configuration
  canManageCredentials: boolean;
  canViewCredentials: boolean;
  canManageDomains: boolean;
  canManageEvents: boolean;

  // Templates
  canManageTemplates: boolean;
  canViewTemplates: boolean;

  // Operations
  canTestNotifications: boolean;
  canUploadMedia: boolean;
  canViewMedia: boolean;
  canManageStorage: boolean;
  canViewReports: boolean;
  canGenerateReports: boolean;

  // Administration
  canManageApiKeys: boolean;
  canViewAuditLogs: boolean;
  canAccessPlatformSettings: boolean;

  // Universal
  canEditProfile: boolean;
}
```

See [DEC-008 A2 §A2.5](../Decisions/DEC-008-User-Company-Role-Lifecycle.md#a25-permission-matrix) for the full permission matrix per role.

---

## 9. Architectural Gaps

| # | Gap |
|---|---|
| G-009 | Routes are currently flat (e.g. `/companies`). The `/portal/` prefix is aspirational — `allowedRoutes` should use actual paths until G-009 is resolved. |
| G-006 | Users module (route + UI) does not exist. |
| G-004 | API Keys module does not exist. |
| G-005 | Audit Logs module does not exist. |
| `role-config.ts` | File does not yet exist — primary implementation deliverable. |
| CONT-003 | Registration submit handler does not redirect to `/auth/login?registered=true` — stays on register page with form data as query params. |
| SM-002 | `derivePermissions` in `types/permissions.ts` references removed role `company_user` and must be deleted. |
