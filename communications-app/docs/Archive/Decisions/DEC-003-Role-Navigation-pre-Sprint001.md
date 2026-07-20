---
tags: [archived, decision]
archived: true
archived_on: 2026-06-23
---

> **Archived Document**
>
> **Superseded by:** [DEC-007 — Role Navigation and Route Protection](../../Decisions/DEC-007-Role-Navigation-and-Route-Protection.md)
> **Archived on:** 2026-06-23
> **Reason:** Pre-Sprint-001 audit draft. Uses 4-role model (missing `company_owner`). The audit findings in §1 informed the final decision but the decisions themselves are superseded.

---

<!--
ORIGINAL FRONTMATTER:
tags: [decision, communication, frontend, rbac, routing]
id: DEC-003
area: Full-stack (Frontend + Backend)
status: Open — pending backend implementation
created: 2026-06-14
agent: communication-frontend-agent
audit-source: Manual code audit 2026-06-14
---

# DEC-003 — Role Navigation and Route Protection

## Status

**Open — Pending Backend Implementation**

This decision defines the full RBAC and route protection strategy. It cannot be finalized until the backend gaps listed in Section 5 are resolved. The frontend architecture and role-config design are locked. The backend contract changes are required before the frontend role system can function correctly.

---

## 1. Audit Findings

### 1.1 Backend RBAC Audit

#### User Schema — No Role, No companyId

```typescript
// communications-backend/src/modules/users/schemas/user.schema.ts
class User {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  emailVerificationToken: string | null;
  passwordResetToken: string | null;
  // ← NO role field
  // ← NO companyId field
  // ← NO organizationId field
}
```

**Finding:** The User document has no role, no company association, and no organizational scoping. Roles (`platform_admin`, `company_admin`, `company_user`, `viewer`) do not exist anywhere in the backend codebase.

#### JWT Payload — Minimal

```typescript
// Issued by AuthService.issueTokens()
await this.jwt.signAsync({
  sub: userId,
  type: 'access',
  // ← NO role
  // ← NO companyId
  // ← NO organizationId
});
```

**Finding:** The JWT carries only `sub` (userId) and `type`. There is no role or company scope in the token.

#### Auth Response — Incomplete User Object

```typescript
// UserResponseDto.from()
dto.id = user._id;
dto.email = user.email;
dto.firstName = user.firstName;
dto.lastName = user.lastName;
dto.isEmailVerified = user.isEmailVerified;
dto.createdAt = user.createdAt;
// ← NO role
// ← NO companyId
```

**Finding:** `POST /auth/login`, `POST /auth/refresh`, and `GET /users/me` all return `UserResponseDto`, which contains no role or company association.

#### `/auth/me` — Returns AuthContext, Not User

```typescript
// AuthController.me()
return { actorType: ctx.actorType, userId: ctx.userId };
```

**Finding:** `GET /auth/me` returns only `{ actorType, userId }` — not a full user profile. It is not suitable as a role resolution endpoint.

#### Communication Layer — API Key Only

All communication endpoints (`/companies`, `/channels`, `/providers`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`, `/notifications`, `/files`) use **inline API key validation**, not JWT:

```typescript
// Example: CompanyController
@Get()
async list(@Headers('x-api-key') apiKey: string, ...) {
  this.assertApiKey(apiKey); // ← validates COMMUNICATION_API_KEY env var
  ...
}

private assertApiKey(apiKey: string) {
  const expected = this.config.get('COMMUNICATION_API_KEY');
  if (!apiKey || !expected || apiKey !== expected) {
    throw new UnauthorizedException('Invalid API key');
  }
}
```

**Finding (Critical):** The frontend sends `Authorization: Bearer <token>` via Axios. The GlobalAuthGuard validates the JWT and passes the request. But then the controller's own `assertApiKey()` reads `x-api-key` (which is absent in frontend requests) and throws 401. **The frontend cannot call any communication endpoint with JWT.** The current Companies page will fail at runtime with 401 on every API call.

#### Guards and Decorators — No RBAC Layer

| Guard/Decorator | Exists | Does |
|---|---|---|
| `GlobalAuthGuard` | ✅ | Validates JWT or API key — authentication only, no authorization |
| `@Public()` | ✅ | Marks routes as unauthenticated |
| `@CurrentUser()` | ✅ | Extracts `AuthContext { actorType, userId }` |
| `@CurrentOrg()` | ✅ | Extracts `organizationId` — always `undefined` (not implemented) |
| `RolesGuard` | ❌ | Does not exist |
| `@Roles()` | ❌ | Does not exist |
| Company scoping middleware | ❌ | Does not exist |

#### Summary: Backend RBAC Status

| Feature | Status |
|---|---|
| Roles (platform_admin, company_admin, etc.) | ❌ Not implemented |
| Role field on User schema | ❌ Missing |
| companyId field on User schema | ❌ Missing |
| Role in JWT payload | ❌ Missing |
| Role in auth response | ❌ Missing |
| `/users/me` returns full profile with role | ❌ Returns `id, email, firstName, lastName, isEmailVerified` only |
| `/auth/me` returns full profile | ❌ Returns `{ actorType, userId }` only |
| JWT auth on communication endpoints | ❌ All use API key only |
| Role-based endpoint guards | ❌ Not implemented |
| Company scoping for non-admin users | ❌ Not implemented |

---

### 1.2 Frontend RBAC Audit

#### auth.store — No Role Stored

```typescript
// stores/auth.store.ts
interface AuthState {
  user: User | null;      // User type has role?: UserRole (optional)
  accessToken: string | null;
  isAuthenticated: boolean;
  // ← role is not a separate field; comes from user.role (optional)
}
```

**Finding:** The store is correctly structured to hold the role (via `user.role`), but since the backend never returns `role`, `user.role` is always `undefined`.

#### usePermissions — Silent Dev Default

```typescript
// hooks/usePermissions.ts
const role = useAuthStore((s) => s.user?.role);
const effectiveRole = role ?? 'platform_admin'; // ← SILENT DEFAULT
return derivePermissions(effectiveRole);
```

**Finding:** When `role` is undefined (current production state), the hook silently defaults to `platform_admin`, granting full permissions to every user. This is a security risk. The default is not labeled or surfaced to the user.

#### PermissionGuard — Correct Implementation

```typescript
// components/shared/PermissionGuard.tsx
export function PermissionGuard({ allowed, children, fallback = null }) {
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
```

**Finding:** The component is correctly implemented. It is passive — it cannot protect pages from direct URL navigation.

#### Sidebar — Navigation Hiding Only

The Sidebar currently shows/hides nav items but does not enforce access at the page level. A user who manually navigates to `/companies` bypasses any sidebar-based protection.

#### Route Protection — Client-Side Guard Only

The portal layout auth guard (`app/(portal)/layout.tsx`) checks that the user has a valid session (access token or refresh token) but does **not** check role or permissions. Any authenticated user can visit any portal URL.

**Finding:** Authentication is checked. Authorization (role/permissions) is not checked at the route level.

#### Summary: Frontend RBAC Status

| Feature | Status |
|---|---|
| `UserRole` and `UserPermissions` types | ✅ Implemented |
| `derivePermissions()` function | ✅ Implemented |
| `usePermissions()` hook | ⚠️ Implemented but has silent `platform_admin` default |
| `PermissionGuard` component | ✅ Implemented |
| Role stored in auth store | ⚠️ Structured correctly; always `undefined` (backend gap) |
| Page-level permission check | ❌ Not implemented |
| Unauthorized page | ❌ Does not exist |
| `role-config.ts` central config | ❌ Does not exist |
| Route protection beyond auth | ❌ Not implemented |

---

## 2. Decision: Role Source

### Rule

The user's role **must come from the backend**. The frontend must not invent, assume, or silently default the role in production.

### Proposed Backend Contract

`POST /auth/login` and `POST /auth/refresh` must return:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "isEmailVerified": true,
    "role": "platform_admin",
    "companyId": null,
    "companyKey": null,
    "createdAt": "..."
  }
}
```

For non-modules users:
```json
{
  "user": {
    "role": "company_admin",
    "companyId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "companyKey": "acme-corp"
  }
}
```

`GET /users/me` must return the same full user object.

### Frontend Dev Fallback Rule

During development, if the backend does not yet return `role`, the frontend may use a fallback **only if it is explicitly labeled**:

```typescript
// hooks/usePermissions.ts
const DEV_ROLE_FALLBACK: UserRole = 'platform_admin';

export function usePermissions(): UserPermissions {
  const role = useAuthStore((s) => s.user?.role);

  if (!role) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RBAC] No role from backend — using DEV_ROLE_FALLBACK: platform_admin');
      return derivePermissions(DEV_ROLE_FALLBACK);
    }
    // In production: treat as lowest-privilege role
    return derivePermissions('viewer');
  }

  return derivePermissions(role);
}
```

**In production:** missing role → `viewer` (safest default). The backend MUST provide the role before shipping to production.

---

## 3. Decision: role-config.ts

A single central file defines the relationship between roles, navigation, permissions, and routing.

**File:** `lib/role-config.ts`

```typescript
import type { UserRole } from '@/types/permissions';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: string;                     // icon name string, resolved at render time
  activePattern?: string;           // regex or startsWith prefix
}

export interface SidebarNavSection {
  label: string;
  items: SidebarNavItem[];
}

export interface RoleConfig {
  role: UserRole;
  landingPage: string;              // where to redirect after login
  sidebar: SidebarNavSection[];     // nav sections visible to this role
  allowedRoutes: string[];          // route prefixes this role may access
                                    // (used by page-level guard)
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  platform_admin: {
    role: 'platform_admin',
    landingPage: '/companies',
    sidebar: [
      { label: 'Overview', items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'Dashboard' },
      ]},
      { label: 'Companies', items: [
        { href: '/companies', label: 'Companies', icon: 'Business' },
      ]},
      { label: 'Configuration', items: [
        { href: '/channels', label: 'Channels', icon: 'Hub' },
        { href: '/providers', label: 'Providers', icon: 'Extension' },
        { href: '/company-channel-providers', label: 'Assignments', icon: 'Link' },
        { href: '/provider-credentials', label: 'Credentials', icon: 'Key' },
      ]},
      { label: 'Notifications', items: [
        { href: '/domain-catalogue', label: 'Domains', icon: 'AccountTree' },
        { href: '/event-catalogue', label: 'Events', icon: 'Notifications' },
        { href: '/notifications/test', label: 'Test', icon: 'Send' },
      ]},
      { label: 'Templates', items: [
        { href: '/layout-templates', label: 'Templates', icon: 'Description' },
      ]},
      { label: 'Files', items: [
        { href: '/files/media', label: 'Media', icon: 'Image' },
        { href: '/files/storage', label: 'Storage', icon: 'FolderOpen' },
        { href: '/files/reports', label: 'Reports', icon: 'Assessment' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'Person' },
      ]},
    ],
    allowedRoutes: ['*'],
  },

  company_admin: {
    role: 'company_admin',
    landingPage: '/companies',     // redirected to own company on mount
    sidebar: [
      { label: 'Company', items: [
        { href: '/companies', label: 'My Company', icon: 'Business' },
      ]},
      { label: 'Configuration', items: [
        { href: '/company-channel-providers', label: 'Assignments', icon: 'Link' },
        { href: '/provider-credentials', label: 'Credentials', icon: 'Key' },
      ]},
      { label: 'Notifications', items: [
        { href: '/domain-catalogue', label: 'Domains', icon: 'AccountTree' },
        { href: '/event-catalogue', label: 'Events', icon: 'Notifications' },
        { href: '/notifications/test', label: 'Test', icon: 'Send' },
      ]},
      { label: 'Templates', items: [
        { href: '/layout-templates', label: 'Templates', icon: 'Description' },
      ]},
      { label: 'Files', items: [
        { href: '/files/media', label: 'Media', icon: 'Image' },
        { href: '/files/storage', label: 'Storage', icon: 'FolderOpen' },
        { href: '/files/reports', label: 'Reports', icon: 'Assessment' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'Person' },
      ]},
    ],
    allowedRoutes: [
      '/companies', '/company-channel-providers', '/provider-credentials',
      '/domain-catalogue', '/event-catalogue', '/notifications/test',
      '/layout-templates', '/files', '/settings',
    ],
  },

  company_user: {
    role: 'company_user',
    landingPage: '/companies',
    sidebar: [
      { label: 'Company', items: [
        { href: '/companies', label: 'My Company', icon: 'Business' },
      ]},
      { label: 'Notifications', items: [
        { href: '/notifications/test', label: 'Test', icon: 'Send' },
      ]},
      { label: 'Files', items: [
        { href: '/files/media', label: 'Media', icon: 'Image' },
        { href: '/files/reports', label: 'Reports', icon: 'Assessment' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'Person' },
      ]},
    ],
    allowedRoutes: [
      '/companies', '/notifications/test', '/files/media', '/files/reports', '/settings',
    ],
  },

  viewer: {
    role: 'viewer',
    landingPage: '/companies',
    sidebar: [
      { label: 'Company', items: [
        { href: '/companies', label: 'My Company', icon: 'Business' },
      ]},
      { label: 'Files', items: [
        { href: '/files/reports', label: 'Reports', icon: 'Assessment' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'Person' },
      ]},
    ],
    allowedRoutes: ['/companies', '/files/reports', '/settings'],
  },
};

export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIGS[role];
}

export function isRouteAllowed(role: UserRole, pathname: string): boolean {
  const config = ROLE_CONFIGS[role];
  if (config.allowedRoutes.includes('*')) return true;
  return config.allowedRoutes.some((prefix) => pathname.startsWith(prefix));
}
```

---

## 4. Decision: Route Protection

### Principle

Sidebar hiding is not a security boundary. Every protected page must independently verify that the current user has permission to be there. If not, the page renders an `<UnauthorizedPage>` or redirects to the landing page.

### Three-Layer Route Protection

```
Layer 1: Session guard (app/(portal)/layout.tsx)
  → checks isAuthenticated (access token or refresh token)
  → if no session: redirect to /auth/login
  → if session: proceed

Layer 2: Page-level permission check (in each page component)
  → reads usePermissions() and checks the relevant flag
  → OR reads role and calls isRouteAllowed(role, pathname)
  → if not allowed: render <UnauthorizedPage /> (do not redirect)
  → this prevents flash of content on redirect

Layer 3: Action-level guard (in each button/form/drawer)
  → PermissionGuard wrapping every action
  → action simply does not render if not permitted
```

### UnauthorizedPage Component

A shared component rendered inline when the current user lacks permission for the page:

```typescript
// components/shared/UnauthorizedPage.tsx
interface UnauthorizedPageProps {
  requiredRole?: string;
  action?: React.ReactNode;  // e.g. "Go to Dashboard" link
}
```

### Page Guard Hook

```typescript
// hooks/usePageGuard.ts
function usePageGuard(requiredPermission: keyof UserPermissions): boolean {
  const permissions = usePermissions();
  return permissions[requiredPermission];
}
```

Usage in page:
```tsx
export default function ChannelsPage() {
  const allowed = usePageGuard('canViewChannels');
  if (!allowed) return <UnauthorizedPage />;
  return <ChannelsContent />;
}
```

### Route Guard by Role Config

```tsx
// hooks/useRouteGuard.ts
function useRouteGuard(): boolean {
  const role = useAuthStore((s) => s.user?.role) ?? 'viewer';
  const pathname = usePathname();
  return isRouteAllowed(role, pathname);
}
```

Usage in portal layout or page:
```tsx
const isAllowed = useRouteGuard();
if (!isAllowed) return <UnauthorizedPage />;
```

---

## 5. Backend Gaps — Required Changes

The following changes are required in the backend before the frontend RBAC system can function correctly.

### GAP-1: User Schema — Add role and companyId (CRITICAL)

```typescript
// REQUIRED addition to User schema
@Prop({
  type: String,
  enum: ['platform_admin', 'company_admin', 'company_user', 'viewer'],
  default: 'company_admin',
  index: true,
})
role!: 'platform_admin' | 'company_admin' | 'company_user' | 'viewer';

@Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
companyId!: Types.ObjectId | null;

// Denormalised for quick lookup (avoids JOIN to companies collection)
@Prop({ type: String, default: null })
companyKey!: string | null;
```

### GAP-2: UserResponseDto — Add role, companyId, companyKey (CRITICAL)

```typescript
// REQUIRED addition to UserResponseDto
role!: 'platform_admin' | 'company_admin' | 'company_user' | 'viewer';
companyId!: string | null;
companyKey!: string | null;

static from(user: any): UserResponseDto {
  // ... existing fields ...
  dto.role = user.role ?? 'company_admin';
  dto.companyId = user.companyId ? String(user.companyId) : null;
  dto.companyKey = user.companyKey ?? null;
  return dto;
}
```

### GAP-3: JWT Payload — Add role (RECOMMENDED)

Including role in the JWT payload avoids a database roundtrip to resolve permissions on every request. Role changes (rare) require re-login or token refresh.

```typescript
// RECOMMENDED addition to issueTokens()
await this.jwt.signAsync({
  sub: userId,
  type: 'access',
  role: user.role,        // avoids DB lookup per request
  companyId: user.companyId ? String(user.companyId) : null,
});
```

If role is in the JWT, AuthContext should surface it:
```typescript
// Updated AuthContext
export interface AuthContext {
  actorType: 'user' | 'apikey';
  userId?: string;
  role?: string;
  companyId?: string | null;
  organizationId?: string;
  keyId?: string;
}
```

### GAP-4: Communication Endpoints — Accept JWT (CRITICAL)

**Current:** All communication controllers (`/companies`, `/channels`, `/providers`, etc.) call `this.assertApiKey(apiKey)` inline, which requires the `x-api-key` header. Frontend JWT requests get 401.

**Required:** Remove `assertApiKey()` from all communication controllers. Rely on `GlobalAuthGuard` for authentication (already handles JWT). Add role-based authorization where needed.

```typescript
// REMOVE from every communication controller:
// @Headers('x-api-key') apiKey: string
// this.assertApiKey(apiKey);

// KEEP: GlobalAuthGuard handles auth
// ADD per-endpoint: role checks via @CurrentUser() and manual guard
```

Migration path:
1. Remove inline `assertApiKey()` and `@Headers('x-api-key')` from all communication controllers
2. Add `@CurrentUser() ctx: AuthContext` where the user identity is needed
3. Add company scoping: non-admin users can only access resources for their `companyId`
4. Remove `CommunicationApiKeyGuard` — replaced by `GlobalAuthGuard`

### GAP-5: GET /auth/me — Return Full User Profile (IMPROVEMENT)

Current returns `{ actorType, userId }`. Should return the same `UserResponseDto` as `GET /users/me`:

```typescript
// REPLACE:
return { actorType: ctx.actorType, userId: ctx.userId };

// WITH:
const user = await this.users.findByIdOrThrow(ctx.userId!);
return UserResponseDto.from(user);  // includes role, companyId
```

### GAP-6: Register — Default Role Assignment

New users created via `POST /auth/register` should have a default role assigned:

- Default: `company_admin` (they are creating an account to manage their own company)
- Or: `viewer` (if a modules admin creates accounts for users)

This must be decided and implemented.

---

## 6. Implementation Priority

| Priority | Item | Who | Blocks |
|---|---|---|---|
| P0 | GAP-4: Remove API key guard from communication controllers | Backend | All frontend business features |
| P0 | GAP-1: Add role + companyId to User schema | Backend | All RBAC features |
| P0 | GAP-2: Add role + companyId to UserResponseDto | Backend | Frontend permission system |
| P1 | GAP-5: GET /auth/me returns full user | Backend | Token refresh → role resolution |
| P1 | GAP-3: Add role to JWT payload | Backend | Server-side role checks |
| P1 | `lib/role-config.ts` implementation | Frontend | Role-aware sidebar, page guards |
| P1 | `hooks/usePageGuard.ts` | Frontend | Page-level protection |
| P1 | `components/shared/UnauthorizedPage.tsx` | Frontend | Access denied UX |
| P1 | Fix `usePermissions()` production fallback | Frontend | Security — silent admin default is risky |
| P2 | Sidebar driven by `role-config.ts` | Frontend | Role-aware navigation |
| P2 | GAP-6: Default role on register | Backend | Multi-user scenarios |

---

## 7. What Does NOT Change

- Route URLs do not change — the single-page CRUD pattern stands
- `PermissionGuard` component contract is unchanged — still wraps actions
- `UserPermissions` flags are unchanged — still the action-level check
- `derivePermissions()` logic is unchanged — still correct
- `FormDrawer`, `DataTable`, `CompanyForm` are unchanged

---

## Related Documents

- [[../Authentication]]
- [[../Architecture]]
- [[../Routes]]
- [[../State-Management]]
- [[../../../Modules/Communication/Backend/Security]]
- [[../../../Modules/Communication/Backend/API.md]]
- [[../../../Project/Governance/Agents/communication-backend-agent]]
