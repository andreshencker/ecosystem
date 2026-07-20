# Frontend State Management

| Field | Value |
|---|---|
| Last Updated | 2026-06-23 |
| Governs | `communications-front` |
| Decision baseline | [DEC-006](../Decisions/DEC-006-Frontend-Stack.md), [DEC-008](../Decisions/DEC-008-User-Company-Role-Lifecycle.md) |

---

## 1. State Categories

| Category | Tool | Location |
|---|---|---|
| Auth / session | Zustand | `stores/auth.store.ts` |
| UI / layout | Zustand | `stores/ui.store.ts` |
| Server data | React Query | `hooks/api/*.ts` |
| Form state | React Hook Form | Component-local |
| URL / navigation state | Next.js router | `useRouter`, `usePathname` |

---

## 2. Auth Store

### 2.1 Required Shape (DEC-004 A1)

```ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Promoted from user object for direct, typed access
  role: UserRole | null;
  scope: Scope | null;
  companyId: string | null;
  companyKey: string | null;

  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}
```

`setAuth` must populate `role`, `scope`, `companyId`, and `companyKey` directly from the `user` argument. This avoids scattered `user?.role ?? null` optional chaining throughout the application.

`clearAuth` must reset **all** fields to `null` / `false` — including `role`, `scope`, `companyId`, `companyKey`.

### 2.2 Why Direct Fields

`getRoleConfig(role)` and `isRouteAllowed(role, pathname)` are called in:
- Next.js middleware (no component context)
- `usePermissions()` hook
- `AppShell` layout
- Any component needing role-conditional behaviour

Direct fields on the store provide a single, non-nullable access path after authentication.

---

## 3. Auth Store — Role Safety Rules (DEC-004 A2 BR-006/007)

The `setAuth` function must validate the user object before hydrating the store:

```ts
function setAuth(user: User, accessToken: string): void {
  if (!user.role) {
    // BR-006/007: missing role must fail safely — never default to platform_admin
    clearAuth();
    router.push('/auth/login');
    return;
  }

  // Validate that role is a known value
  const knownRoles: UserRole[] = ['platform_admin', 'company_owner', 'company_admin', 'operator', 'viewer'];
  if (!knownRoles.includes(user.role)) {
    clearAuth();
    router.push('/auth/login');
    return;
  }

  // Validate role/scope consistency (BR-004/005 — DEC-008 A3)
  // platform_admin now has a non-null companyId (platform company). Validate scope instead.
  if (user.role === 'platform_admin' && user.scope !== 'global') {
    clearAuth();
    router.push('/auth/login');
    return;
  }
  if (user.role !== 'platform_admin' && (!user.companyId || !user.companyKey)) {
    clearAuth();
    router.push('/auth/login');
    return;
  }

  set({
    user,
    accessToken,
    isAuthenticated: true,
    role: user.role,
    scope: user.scope,
    companyId: user.companyId,
    companyKey: user.companyKey,
  });
}
```

**Critical:** No path in `setAuth` may assign `role: 'platform_admin'` as a fallback for missing or unknown roles.

---

## 4. UI Store

```ts
interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  snackbar: { message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null;
  showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
  hideSnackbar: () => void;
}
```

No role-specific state belongs in the UI store. Role-conditional layout is driven by `role-config.ts`, not store flags.

---

## 5. Server State (React Query)

### 5.1 Pattern

```ts
// hooks/api/useCompanies.ts
export function useCompanies(params: PaginationParams) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => api.get('/companies', { params }).then(r => r.data),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCompanyDto) => api.post('/companies', dto).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });
}
```

### 5.2 Query Key Convention

```
[resource]                          → list (all or filtered)
[resource, id]                      → single item
[resource, params]                  → paginated list
[resource, id, subresource]         → nested resource
```

### 5.3 Stale Time

Default stale time: `60_000` ms (1 minute). Catalogue data (channels, providers) that rarely changes may use a longer stale time.

---

## 6. Token Lifecycle in State

```
Login success
  └── setAuth(user, accessToken)
        store: { user, accessToken, role, scope, companyId, companyKey, isAuthenticated: true }
  └── localStorage: REFRESH_TOKEN_KEY = refreshToken
  └── role-config lookup: getRoleConfig(role).landingPage → router.push(landingPage)

Access token expires (401 response)
  └── lib/axios.ts interceptor
        POST /auth/refresh → { accessToken, refreshToken }
        setAccessToken(newAccessToken)
        localStorage: REFRESH_TOKEN_KEY = newRefreshToken
        retry original request

Page reload
  └── Zustand store resets (memory-only)
  └── AuthProvider reads REFRESH_TOKEN_KEY from localStorage
        POST /auth/refresh → success
        setAuth(user, accessToken)
        OR failure → clearAuth(), redirect /auth/login

Logout
  └── clearAuth()
        store: { user: null, accessToken: null, role: null, scope: null, companyId: null, companyKey: null, isAuthenticated: false }
  └── localStorage.removeItem(REFRESH_TOKEN_KEY)
```

---

## 7. Derived State — `role-config.ts` Consumers

Nothing role-dependent is stored in state beyond `role`, `scope`, `companyId`, and `companyKey`. Everything else is derived on-demand from `role-config.ts`.

| Derived value | Source | Consumed by |
|---|---|---|
| Post-login redirect | `getLandingPage(role)` | Login page, `AuthProvider` |
| Navbar config | `getRoleConfig(role).navbar` | `Topbar` |
| Sidebar sections | `getRoleConfig(role).sidebar` | `Sidebar` |
| Allowed routes | `isRouteAllowed(role, pathname)` | Middleware |
| Permissions | `getPermissions(role)` | `usePermissions()`, `<PermissionGuard>` |

### `usePermissions` pattern

```ts
// usePermissions.ts
export function usePermissions(): UserPermissions {
  const role = useAuthStore((s) => s.role);
  if (!role) return emptyPermissions;   // all false — not a privileged default
  return getPermissions(role);          // delegates to role-config.ts — no logic here
}
```

The existing `derivePermissions(role)` function in `types/permissions.ts` is **deleted** — it referenced the removed `company_user` role and is replaced entirely by `getPermissions(role)` from `role-config.ts`.

---

## 8. Role Visibility by Store Value

The table below shows what the application renders for each `role` value in the auth store. This makes the state → UI mapping explicit.

| Store `role` | `isAuthenticated` | `usePermissions()` | `getRoleConfig().sidebar` | Middleware |
|---|---|---|---|---|
| `'platform_admin'` | true | full admin permissions | Platform + Admin sections | all routes allowed |
| `'company_owner'` | true | company owner permissions | My Company + Users sections | company routes only |
| `'company_admin'` | true | company admin permissions | My Company + Users sections (no delete/settings) | company routes only |
| `'operator'` | true | operational permissions | Operations section | operational routes only |
| `'viewer'` | true | read-only permissions | Content section | read-only routes only |
| `null` | false | `emptyPermissions` (all false) | not rendered | redirect to `/auth/login` |
| unknown string | rejected by `setAuth` | `emptyPermissions` | not rendered | redirect to `/auth/login` |

---

## 9. State Management Gaps

| # | Gap |
|---|---|
| SM-001 | `auth.store.ts` does not yet include `role`, `scope`, `companyId`, `companyKey` fields. |
| SM-002 | `derivePermissions` in `types/permissions.ts` references removed role `company_user`. Must be deleted — replace with `getPermissions(role)` from `role-config.ts`. |
| SM-003 | No `AuthProvider` hydration component currently exists to rehydrate the store on page load from `localStorage`. Must be added. |
| G-007 | Refresh response returns only tokens, not an updated user. A role change on the server side is invisible to the client until full re-login. |
