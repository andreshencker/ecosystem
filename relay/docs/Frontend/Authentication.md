# Frontend Authentication

| Field | Value |
|---|---|
| Last Updated | 2026-06-28 |
| Governs | `communications-front` |
| Decision baseline | [DEC-009 Rev-2](../Decisions/DEC-009-Authentication-Registration-Lifecycle.md), [DEC-013 Rev-1](../Decisions/DEC-013-Invitation-Temporary-Password-Architecture.md), [DEC-014 Rev-1](../Decisions/DEC-014-Invitation-Credential-Lifecycle.md) |

---

## 1. Authentication Flow

```
User submits login form
  └── POST /auth/login
  └── Response: { accessToken, refreshToken, expiresIn, user: { id, email, firstName, lastName, role, scope, companyId, companyKey, isActive, isEmailVerified } }

Frontend
  └── auth.store: setAuth(user, accessToken)           — populates role, scope, companyId, companyKey
  └── localStorage: REFRESH_TOKEN_KEY ← refreshToken
  └── cookie: ACCESS_TOKEN_COOKIE ← accessToken        — enables Next.js middleware to detect session
  └── router.push(getLandingPage(user.role))            — role-based redirect via role-config.ts
```

### 1.1 Token Storage

| Token | Storage | Rationale |
|---|---|---|
| Access token | Zustand store (memory) + `comm_portal_at` cookie | Memory for API requests; cookie for middleware route guarding |
| Refresh token | `localStorage` (key: `comm_portal_rt`) | Survives page refresh; used to obtain new access tokens |

The `comm_portal_at` cookie is **not** HttpOnly — it is written by client JS (`lib/auth-cookie.ts`) so the browser can also clear it on logout. Full HttpOnly migration is tracked under AP-012. Until then, a strict CSP header is required on deployment.

Cookie is cleared on: `clearAuth()` (store), explicit logout (`useAuth.logout()`), and token refresh failure (`lib/axios.ts`).

### 1.2 Session Hydration on Page Load

On any page load where `accessToken` is absent from the store but a refresh token exists in `localStorage`:

```
App mounts
  └── accessToken missing from store
  └── refreshToken present in localStorage
  └── POST /auth/refresh
        success → setAuth(user, newAccessToken), store new refreshToken
        failure → clearAuth(), redirect to /auth/login
```

---

## 2. Token Refresh

The Axios instance in `lib/axios.ts` handles 401 responses:

```
Request fails with 401
  └── attempt POST /auth/refresh with stored refreshToken
        success → retry original request with new accessToken
        failure → clearAuth(), redirect to /auth/login
```

Only one refresh attempt is in-flight at a time (queued retry pattern).

---

## 3. Auth Store — Required Shape (DEC-004 A1)

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

`setAuth` must populate `role`, `scope`, `companyId`, and `companyKey` directly from the `user` argument.
`clearAuth` must reset all fields to `null` / `false`.

---

## 4. User Type — Required Shape (DEC-004 A1)

```ts
type UserRole = 'platform_admin' | 'company_owner' | 'company_admin' | 'operator' | 'viewer';
type Scope = 'global' | 'company';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  scope: Scope;
  companyId: string | null;
  companyKey: string | null;
  isEmailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 5. Post-Login Navigation Contract

### 5.1 Rule

`role-config.ts` is the sole authority for where a user lands after authentication. The login page must not contain any role-conditional redirect logic.

**Prohibited:**
```ts
if (role === 'platform_admin') router.push('/dashboard');  // NEVER
```

**Required:**
```ts
const config = getRoleConfig(user.role);
router.push(config.landingPage);
```

### 5.2 Current Landing Pages

| Role | Landing Page |
|---|---|
| `platform_admin` | `/dashboard` |
| `company_owner` | `/dashboard` |
| `company_admin` | `/dashboard` |
| `operator` | `/dashboard` |
| `viewer` | `/dashboard` |

---

## 6. Logout Flow

```
User clicks Sign out
  └── POST /auth/logout { refreshToken }  (fire-and-forget)
  └── clearAuth()
  └── localStorage.removeItem(REFRESH_TOKEN_KEY)
  └── router.push('/auth/login')
```

---

## 7. Email Verification

Email verification applies **only to public registration** (DEC-009 Flow A). Invited users are always `isEmailVerified = true` and never go through this flow.

**Verification flow:**

```
POST /auth/register
  → backend sends security.company_verify_email notification
  → frontend redirects to /auth/login?registered=true
  → login page shows banner:
       "Account created. Check your email to verify before logging in."

User clicks link in email
  → /auth/verify-email?token=<raw>
  → frontend calls GET /auth/verify-email?token=<raw>
  → on success: redirect to /auth/login, show "Email verified. You can now log in."
  → on error: show "Link is invalid or expired"

POST /auth/login (now permitted — isEmailVerified === true)
```

**Login page behavior when `isEmailVerified === false`:**
- Backend returns `403 { error: "EMAIL_NOT_VERIFIED" }`
- Frontend must display:
  > "Please verify your email address before logging in. Check your inbox for the verification email."
- Must not display the generic "Invalid credentials" message for this case.

---

## 8. Password Reset

```
/auth/forgot-password → POST /auth/forgot-password { email }
  └── always shows "check your email" (prevents enumeration)

/auth/reset-password?token=<raw>
  └── POST /auth/reset-password { token, newPassword }
  └── success → redirect to /auth/login
```

---

## 9. Auth Guards — Route Level

Authentication is enforced at two points:

1. **Next.js Middleware** — runs before every request; redirects unauthenticated users to `/auth/login` and unauthorized users to their landing page. See [Routes](./Routes.md).
2. **AppShell layout** — verifies `isAuthenticated` before rendering portal content; shows a loading state during session hydration.

---

## 10. Registration Business Rules (DEC-004 A2 BR-001/002/003)

The registration flow has three absolute constraints:

| Rule | Behaviour |
|---|---|
| BR-001 | Public registration always creates `company_owner` — the role is hard-coded server-side |
| BR-002 | Public registration always creates a company atomically — both records are created or neither is |
| BR-003 | Public registration never creates `platform_admin` — no form field, no URL parameter, no API call can produce this |

### 10.1 Registration Form Fields

The registration form must collect:

| Field | Required | Notes |
|---|---|---|
| `companyName` | Yes | Creates the company; min 2 chars |
| `firstName` | Yes | |
| `lastName` | Yes | |
| `email` | Yes | Must be unique |
| `password` | Yes | Min 8 chars, complexity enforced |
| `confirmPassword` | Yes | Must match `password` |

> **CONT-002 resolved:** `companyName` was missing from the previous API contract. It is required for registration.

### 10.2 Registration Submit Flow

```
User fills form → clicks "Create account"
  └── Frontend validates with Zod schema (client-side)
  └── POST /auth/register { companyName, firstName, lastName, email, password, confirmPassword }
        201 → { message: string }
              → DO NOT store tokens (none are returned)
              → router.push('/auth/login?registered=true')
        409 → show "Email already registered"
        400 → show field errors
```

The 201 response contains only a `{ message }`. There are no tokens. The client must redirect to the login page without attempting to authenticate.

> **CONT-003 (updated):** The current implementation auto-logs in and stays on `/auth/register`. Both behaviors are wrong. The submit handler must: (1) receive `{ message }`, (2) call `router.push('/auth/login?registered=true')`, (3) never call `setAuth()` from a register response.

### 10.3 Login Page — `?registered=true` Banner

When `/auth/login?registered=true` is present, the login page shows:

```
✅ Account created. Please check your email to verify your account before logging in.
```

### 10.4 Login Page — `EMAIL_NOT_VERIFIED` Error

When the backend returns `403 { error: "EMAIL_NOT_VERIFIED" }`, the login page must show a distinct, helpful message — not the generic credentials error:

```
⚠ Your email address has not been verified yet.
  Please check your inbox and click the verification link.
```

---

## 11. Invalid Role Safety Rules (DEC-004 A2 BR-006/007)

These rules prevent privilege escalation through missing or corrupted role data:

| Scenario | Required behaviour |
|---|---|
| `user.role` is `null` after login | `setAuth` must reject the user object. `clearAuth()` and redirect to `/auth/login`. |
| `user.role` is an unrecognised string | `getRoleConfig(role)` throws. Frontend catches and calls `clearAuth()` + redirect to `/auth/login`. |
| `user.role` is missing from JWT | JWT strategy must reject the token (401). |
| `usePermissions()` called when `role` is null | Returns `emptyPermissions` (all false). Never returns platform_admin permissions. |
| `getRoleConfig(undefined)` or `getRoleConfig(null)` | Throws immediately. No fallback, no default. |

### 11.1 `emptyPermissions` Constant

```ts
export const emptyPermissions: UserPermissions = {
  canViewAllCompanies: false,
  canViewOwnCompany: false,
  canCreateCompany: false,
  canEditCompany: false,
  canDeleteCompany: false,
  canDeactivateCompany: false,
  canManageUsers: false,
  canInviteUsers: false,
  canDeactivateUsers: false,
  canDeleteUsers: false,
  canTransferOwnership: false,
  canViewChannels: false,
  canManageChannels: false,
  canManageProviders: false,
  canManageCredentials: false,
  canViewCredentials: false,
  canManageDomains: false,
  canManageEvents: false,
  canManageTemplates: false,
  canViewTemplates: false,
  canTestNotifications: false,
  canUploadMedia: false,
  canViewMedia: false,
  canManageStorage: false,
  canViewReports: false,
  canGenerateReports: false,
  canManageApiKeys: false,
  canViewAuditLogs: false,
  canAccessPlatformSettings: false,
  canEditProfile: false,
};
```

---

## 12. Gaps

| # | Gap | Priority |
|---|---|---|
| G-007 | `/auth/refresh` response does not return an updated `user` object. Role changes mid-session are invisible until full re-login. | Medium |
| AUTH-001 | Session hydration race condition: if two requests fire simultaneously on load before the refresh completes, both may attempt a refresh. Queued retry pattern must be implemented in `lib/axios.ts`. | Medium |
| AUTH-002 | No "remember me" or session duration preference — refresh token TTL is fixed at 7 days. | Low |
| CONT-003 | Registration submit handler does not redirect to `/auth/login?registered=true`. Currently auto-logs in (incorrect — no tokens are returned by the new spec). Must be fixed. | **High** |
| CONT-004 | Registration response handling: frontend must accept `{ message }` only and not attempt `setAuth()`. | **High** |
| CONT-005 | Login page does not distinguish `EMAIL_NOT_VERIFIED` (403) from `ACCOUNT_INACTIVE` (403). Both must show different messages. | **High** |
| ROUTE-001 | ~~Middleware cannot read Zustand store~~ **Partially resolved.** `ACCESS_TOKEN_COOKIE = 'comm_portal_at'` is written on login, token refresh, and hydration. Layer 1 (unauthenticated redirect) and auth-route redirect now work. Layer 2 (RBAC route enforcement) remains client-side until JWT payload carries `role`. | Low |
