---
tags: [archived, decision]
archived: true
archived_on: 2026-06-23
---

> **Archived Document**
>
> **Superseded by:** [DEC-008 — User, Company and Role Lifecycle](../../Decisions/DEC-008-User-Company-Role-Lifecycle.md)
> **Archived on:** 2026-06-23
> **Reason:** Pre-Amendment version. Uses 4-role model (missing `company_owner`). States `platform_admin.companyId = null`, which was corrected in DEC-008 Amendment A3. Contains direct contradictions with the current canonical document.

---

<!--
ORIGINAL FRONTMATTER:
tags: [decision, communication, backend, frontend, rbac, lifecycle]
id: DEC-004
area: Full-stack — Platform Layer + Communication Engine + Frontend
status: Open — pending implementation
created: 2026-06-14
amended: 2026-06-14
agent: communication-backend-agent
audit-source: Modules/Communication/Frontend/Decisions/DEC-003 Role Navigation and Route Protection
---

# DEC-004 — User, Company, and Role Lifecycle

## Status

**Open — Pending Implementation**

This is the canonical source of truth for how Users, Companies, and Roles interact across the entire modules. All backend implementation and frontend RBAC work must align with this document. Previous decision DEC-003 documented the audit findings; this decision defines the final architecture.

---

## Amendment — 2026-06-14: Scope, company_owner Role, Navbar, and Route Protection

The following changes were approved after the initial draft:

| Change | Sections affected |
|---|---|
| New `company_owner` role added between `platform_admin` and `company_admin` | 1.2, 1.3, 2.1, 2.2, 3.1, 4.2, 8 |
| `scope` field added to User, auth response, JWT payload, and role-config | 1.2, 1.3, 7, 8 |
| Backend validation rules for role + companyId combinations | New Section 7.5 |
| Detailed Navbar behavior per role | New Section 8.5 |
| Route protection strategy: redirect to `landingPage` preferred over UnauthorizedPage | Section 9 updated |

**Approved role-scope binding:**

| Role | scope | companyId | companyKey |
|---|---|---|---|
| `platform_admin` | `global` | `null` | `null` |
| `company_owner` | `company` | required | required |
| `company_admin` | `company` | required | required |
| `operator` | `company` | required | required |
| `viewer` | `company` | required | required |

Invalid combinations **must** be rejected by the backend at creation and update time. See Section 7.5.

---

## 0. Context and Architecture Layers

The backend has two distinct layers. This distinction drives the ownership model.

```
┌──────────────────────────────────────────────┐
│  Platform Layer  (src/modules/)             │
│  Auth, Users, Invitations, Session           │
│  → Protected by GlobalAuthGuard (JWT)        │
│  → Scoped to authenticated users             │
├──────────────────────────────────────────────┤
│  Communication Engine  (src/communication/)  │
│  Companies, Channels, Providers, Templates,  │
│  Notifications, Files, Reports               │
│  → Currently: API key only (gap — see below) │
│  → Target: JWT + role-based guards           │
└──────────────────────────────────────────────┘
```

**The modules layer manages identity. The communication engine manages the business domain.**

A Company in the communication engine is a tenant — a client of the modules operator. A User in the modules layer belongs to that tenant. The link between them is `User.companyId → Company._id`.

---

## 1. Domain Model

### 1.1 Company

Represents a tenant (client organisation) using the communication modules.

**Core schema** (required for RBAC, matches sprint scope):

```typescript
interface Company {
  id: string;               // MongoDB ObjectId
  companyKey: string;       // Unique slug: 'acme-corp'. Immutable after creation.
  displayName: string;      // 'Acme Corporation'
  legalName: string;        // Optional legal entity name
  timezone: string;         // IANA timezone: 'Australia/Sydney'
  isActive: boolean;        // Platform Admin can deactivate
  createdAt: Date;
  updatedAt: Date;
}
```

**Note on existing schema:** The actual `company.schema.ts` contains additional fields beyond the core above: contact info (supportEmail, supportPhone), address, URLs (webBaseUrl, apiBaseUrl, helpCenterUrl, etc.), social links, legal text, logo URLs. These fields belong to the Company record and are already implemented. The core schema above is the minimum required for RBAC and user association. The full schema is not modified by this decision.

**Key invariants:**
- `companyKey` is lowercase, alphanumeric + hyphens only, globally unique. **Immutable after creation.**
- Deactivating a Company (`isActive: false`) does not delete users or data — it suspends access.
- `platform_admin` users are not assigned to any Company (`companyId: null`).

---

### 1.2 User

Represents an authenticated human actor on the modules.

**Final schema** (requires backend changes — see Section 7):

```typescript
interface User {
  id: string;               // MongoDB ObjectId
  email: string;            // Unique, lowercase, trimmed
  firstName: string;
  lastName: string;
  role: UserRole;           // 'platform_admin' | 'company_admin' | 'operator' | 'viewer'
  companyId: string | null; // null for platform_admin; ObjectId ref to Company for others
  companyKey: string | null; // Denormalised for fast lookups; null for platform_admin
  isEmailVerified: boolean;
  isActive: boolean;        // Can be deactivated without deletion
  createdAt: Date;
  updatedAt: Date;
  // Internal (never returned in API response):
  // passwordHash, emailVerificationToken, passwordResetToken, etc.
}
```

**Key invariants:**
- `role` is required. No user may exist without a role.
- `companyId` is `null` for `platform_admin`. Required for all other roles.
- `companyKey` is denormalised from the Company record — updated if the Company record changes (rare, since companyKey is immutable).
- `isActive: false` disables login. The user record is preserved. Refresh tokens are revoked on deactivation.
- Email is globally unique. A single email cannot have accounts in two different companies.

---

### 1.3 Role

An enum on the User document. Not a separate collection.

```typescript
type UserRole = 'platform_admin' | 'company_admin' | 'operator' | 'viewer';
```

Roles are not stored in a separate collection. There is no role hierarchy document. Permissions are derived from the role at runtime (in `derivePermissions(role)` — see Section 8).

---

### 1.4 Permission

A derived boolean flag computed from the role. Not stored in the database.

```typescript
interface UserPermissions {
  // Companies
  canViewAllCompanies: boolean;
  canCreateCompany: boolean;
  canEditCompany: boolean;
  canDeleteCompany: boolean;
  canDeactivateCompany: boolean;
  // Users
  canViewAllUsers: boolean;
  canInviteUser: boolean;
  canDeactivateUser: boolean;
  canDeleteUser: boolean;
  // Themes
  canManageThemes: boolean;
  // Channels (catalogue)
  canViewChannels: boolean;
  // Providers
  canManageProviders: boolean;
  // Credentials
  canManageCredentials: boolean;
  // Domain + Event catalogue
  canManageDomains: boolean;
  canManageEvents: boolean;
  // Notifications
  canTestNotifications: boolean;
  // Templates
  canManageTemplates: boolean;
  // Files
  canUploadMedia: boolean;
  canManageStorage: boolean;
  canGenerateReports: boolean;
  // API Keys
  canManageApiKeys: boolean;
  // Audit Logs
  canViewAuditLogs: boolean;
  // Platform settings
  canAccessPlatformSettings: boolean;
}
```

Permissions are computed by `derivePermissions(role)` on both backend (for guards) and frontend (for UI). The mapping lives in one place per layer.

---

## 2. Role Hierarchy

### 2.1 Role Definitions

#### `platform_admin`

| Attribute | Value |
|---|---|
| **Purpose** | Operates the modules itself. Manages tenants (companies) and their access. |
| **Scope** | Cross-company. Has access to all companies and all data. |
| **Company binding** | None — `companyId: null` |
| **Created by** | Bootstrap (seed script or first-user promotion) |

**Permissions:** All permissions true. No restrictions.

**Visible modules:** All.

**Ownership:** Owns the modules. Creates companies. Creates company_admin users (via invitation). Can deactivate/delete any user.

---

#### `company_admin`

| Attribute | Value |
|---|---|
| **Purpose** | Manages one company's configuration, team, and communication setup. |
| **Scope** | Single company — their own `companyId` only. |
| **Company binding** | Required — `companyId` must be set |
| **Created by** | Platform Admin (via invitation) |

**Permissions:**
- View and edit their own company (cannot create new companies or deactivate own company)
- Invite operators and viewers to their company
- Deactivate users within their company (not platform_admin)
- Full CRUD on their company's: themes, credentials, domains, events, templates, files
- Cannot access: modules settings, channels catalogue, provider master catalogue, other companies

**Visible modules:** My Company, Configuration (Assignments + Credentials), Notifications (Domains, Events, Test), Templates, Files, Settings (Profile + Company Settings).

---

#### `operator`

| Attribute | Value |
|---|---|
| **Purpose** | Day-to-day operational use — testing notifications, uploading media, generating reports. |
| **Scope** | Single company — their own `companyId` only. |
| **Company binding** | Required |
| **Created by** | Company Admin (via invitation) |

**Permissions:**
- View their own company (read-only)
- Test notifications
- Upload media files
- Generate and download reports
- Cannot manage: providers, credentials, domains, events, templates, API keys

**Visible modules:** My Company (read-only), Notifications (Test only), Files (Media + Reports), Settings (Profile only).

---

#### `viewer`

| Attribute | Value |
|---|---|
| **Purpose** | Read-only visibility into company status and reports. |
| **Scope** | Single company — their own `companyId` only. |
| **Company binding** | Required |
| **Created by** | Company Admin (via invitation) |

**Permissions:**
- View their own company (basic fields: displayName, timezone, isActive)
- Download reports
- No write access anywhere

**Visible modules:** My Company (read-only, basic), Files (Reports only), Settings (Profile only).

---

### 2.2 Permission Matrix

| Permission | platform_admin | company_admin | operator | viewer |
|---|---|---|---|---|
| View all companies | ✅ | ❌ | ❌ | ❌ |
| View own company | ✅ | ✅ | ✅ (basic) | ✅ (basic) |
| Create company | ✅ | ❌ | ❌ | ❌ |
| Edit company | ✅ | ✅ (own) | ❌ | ❌ |
| Deactivate company | ✅ | ❌ | ❌ | ❌ |
| Delete company | ✅ | ❌ | ❌ | ❌ |
| View all users | ✅ | ❌ | ❌ | ❌ |
| View company users | ✅ | ✅ (own) | ❌ | ❌ |
| Invite user | ✅ | ✅ (own company, operator/viewer only) | ❌ | ❌ |
| Deactivate user | ✅ | ✅ (own company, non-admin) | ❌ | ❌ |
| Delete user | ✅ | ❌ | ❌ | ❌ |
| Manage themes | ✅ | ✅ (own) | ❌ | ❌ |
| View channels catalogue | ✅ | ❌ | ❌ | ❌ |
| Manage providers | ✅ | ❌ | ❌ | ❌ |
| Manage credentials | ✅ | ✅ (own) | ❌ | ❌ |
| Manage domains | ✅ | ✅ (own) | ❌ | ❌ |
| Manage events | ✅ | ✅ (own) | ❌ | ❌ |
| Test notifications | ✅ | ✅ | ✅ | ❌ |
| Manage templates | ✅ | ✅ (own) | ❌ | ❌ |
| Upload media | ✅ | ✅ (own) | ✅ (own) | ❌ |
| Manage storage | ✅ | ✅ (own) | ❌ | ❌ |
| Generate reports | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| Manage API keys | ✅ | ✅ (own) | ❌ | ❌ |
| View audit logs | ✅ | ✅ (own) | ❌ | ❌ |
| Platform settings | ✅ | ❌ | ❌ | ❌ |
| Company settings | ✅ | ✅ (own) | ❌ | ❌ |
| Profile settings | ✅ | ✅ | ✅ | ✅ |

---

## 3. Ownership Model

### 3.1 Responsibility Matrix

| Action | platform_admin | company_admin | operator | viewer |
|---|---|---|---|---|
| Create a Company | ✅ | ❌ | ❌ | ❌ |
| Activate a Company | ✅ | ❌ | ❌ | ❌ |
| Deactivate a Company | ✅ | ❌ | ❌ | ❌ |
| Delete a Company | ✅ | ❌ | ❌ | ❌ |
| Edit any Company | ✅ | ❌ | ❌ | ❌ |
| Edit own Company | ✅ | ✅ | ❌ | ❌ |
| Create a platform_admin | ✅ | ❌ | ❌ | ❌ |
| Create a company_admin | ✅ (invite) | ❌ | ❌ | ❌ |
| Create an operator | ✅ | ✅ (own company) | ❌ | ❌ |
| Create a viewer | ✅ | ✅ (own company) | ❌ | ❌ |
| Deactivate any user | ✅ | ❌ | ❌ | ❌ |
| Deactivate own-company user | ✅ | ✅ (non-admin) | ❌ | ❌ |
| Delete a user | ✅ | ❌ | ❌ | ❌ |
| Reset any user's password | ✅ (admin reset) | ❌ | ❌ | ❌ |
| Reset own password | ✅ | ✅ | ✅ | ✅ |

### 3.2 Company Admin Scope Boundary

A `company_admin` operates within a strict boundary:
- May only read/write records where `companyId === their own companyId`
- May invite users with role `operator` or `viewer` only — cannot elevate to `company_admin` or above
- May deactivate `operator` and `viewer` users within their company — cannot deactivate other `company_admin` users
- Cannot see or interact with any other company's data

The backend must enforce this boundary at the service/guard level, not just at the controller level.

---

## 4. User Creation Lifecycle

### 4.1 Options Evaluated

| Option | Model | Pros | Cons |
|---|---|---|---|
| **A** | Platform Admin creates everything (users + companies) | Total control; no rogue tenants | Doesn't scale; slow onboarding; Platform Admin becomes a bottleneck |
| **B** | Public registration creates a Company Admin | Simple; standard SaaS | No control over who creates companies; risk of uncontrolled tenants |
| **C** | Platform Admin creates Company + invites Company Admin; Company Admin manages own users | Controlled onboarding; scalable from Company Admin's perspective | More complex flow; requires invitation system |

### 4.2 Recommendation: Option C — Invitation-Based Onboarding

**Chosen: Option C**

**Rationale:**

This is a B2B communication modules. Companies are clients, not self-service consumers. Uncontrolled company creation creates operational risk (unmanaged tenants, orphaned data, billing complications). The Platform Admin controls which organisations are onboarded.

Once a Company Admin is established, they manage their own team (operators, viewers) without Platform Admin involvement. This scales correctly: the Platform Admin's only recurring duty is onboarding new companies.

**Flow diagram:**

```
Platform Admin
  │
  ├── 1. Creates Company record (POST /companies)
  │
  └── 2. Invites Company Admin (POST /users/invite)
           { email, role: 'company_admin', companyId }
           → Email sent with invitation link
           → User record created with isActive: false, isEmailVerified: false
           │
           └── 3. Company Admin accepts invitation
                    GET /auth/accept-invitation?token=...
                    → Sets password, activates account
                    → isActive: true, isEmailVerified: true
                    │
                    └── 4. Company Admin logs in
                             → Lands on their company dashboard
                             │
                             └── 5. Company Admin invites Operators/Viewers
                                      POST /users/invite
                                      { email, role: 'operator'|'viewer', companyId: (own) }
```

### 4.3 Bootstrap Strategy (Current State → Target)

The current system has no roles. Existing users registered via `/auth/register` with no role or company assignment.

**Bootstrap migration:**
1. Add `role` and `companyId` fields to User schema (default: `role: 'platform_admin'`, `companyId: null`)
2. Run migration: set all existing users to `platform_admin` (there are no Company-scoped users yet)
3. Disable or restrict `/auth/register` to prevent uncontrolled registrations
4. Implement the invitation system for new company onboarding

**`/auth/register` post-migration:** Either:
- Restricted to initial bootstrap only (first user = platform_admin, subsequent blocked)
- OR converted to accept an invitation token (`POST /auth/register?invitationToken=...`)

**Recommendation:** Convert `/auth/register` to require an `invitationToken` for all post-bootstrap registrations. The invitation token determines the email, role, and company. This prevents self-registration.

---

## 5. Company Lifecycle

### 5.1 States

```
[draft] ──create──→ [active] ──deactivate──→ [inactive] ──reactivate──→ [active]
                                                    │
                                            ──archive──→ [archived]
```

| State | isActive | Description |
|---|---|---|
| `active` | `true` | Normal operational state. All users can log in. |
| `inactive` | `false` | Suspended by Platform Admin. Users cannot log in. Data preserved. |
| `archived` | n/a (soft delete flag) | Retained for compliance. Inaccessible. Not implemented in v1. |

### 5.2 Operations

| Operation | Actor | Trigger | Side Effects |
|---|---|---|---|
| **Create** | platform_admin | `POST /companies` | Company record created with isActive: true |
| **Activate** | platform_admin | `PATCH /companies/:key { isActive: true }` | None (default state) |
| **Deactivate** | platform_admin | `PATCH /companies/:key { isActive: false }` | All company users' sessions are revoked (refresh tokens invalidated) |
| **Edit** | platform_admin or company_admin (own) | `PATCH /companies/:key { ...fields }` | None |
| **Delete** | platform_admin | `DELETE /companies/:key` | Hard delete. All associated data deleted (cascade). Irreversible. Requires explicit confirmation. |
| **Archive** | Not in v1 | — | Planned for compliance; not implemented yet |

### 5.3 Cascade Rules on Company Deletion

On `DELETE /companies/:key`:
- All Users with `companyId === company._id` are deleted
- All CompanyThemes, CompanyChannelProviders, ProviderCredentials are deleted
- All DomainCatalogue, EventCatalogue, LayoutTemplates are deleted
- Notification delivery history retained (if notification log is implemented)
- Media files in S3 are orphaned (manual cleanup required — no automated cascade to S3 in v1)

---

## 6. User Lifecycle

### 6.1 States

```
[invited] ──accept──→ [pending_verification] ──verify──→ [active] ──deactivate──→ [inactive]
                                                              │
                                                       ──delete──→ [deleted]
```

| State | isActive | isEmailVerified | Description |
|---|---|---|---|
| `invited` | `false` | `false` | Invitation sent; user has not accepted yet |
| `active` | `true` | `true` | Normal operational state |
| `inactive` | `false` | `true` | Deactivated by admin. Cannot log in. Record preserved. |
| `deleted` | — | — | Hard deleted. Record removed. Not recoverable. |

### 6.2 Operations

| Operation | Actor | Endpoint | Side Effects |
|---|---|---|---|
| **Invite** | platform_admin (any role), company_admin (operator/viewer only) | `POST /users/invite` | Creates User with isActive: false; sends invitation email |
| **Accept Invitation** | Invited user | `GET /auth/accept-invitation?token=` | User sets password; isActive: true; isEmailVerified: true |
| **Login** | Active user | `POST /auth/login` | Issues access + refresh tokens |
| **Refresh Session** | Active user | `POST /auth/refresh` | Rotates refresh token; returns new tokens + user |
| **Logout** | Any user | `POST /auth/logout` | Revokes refresh token |
| **Reset Password** | User themselves | `POST /auth/forgot-password` → `POST /auth/reset-password` | Token via email; all sessions revoked on reset |
| **Admin Password Reset** | platform_admin | `POST /users/:id/reset-password` | Forces password reset link; all sessions revoked |
| **Deactivate** | platform_admin (any), company_admin (own company non-admin) | `PATCH /users/:id { isActive: false }` | All refresh tokens revoked immediately |
| **Reactivate** | platform_admin | `PATCH /users/:id { isActive: true }` | User can log in again |
| **Update Profile** | User themselves | `PATCH /users/me` | firstName, lastName only |
| **Delete** | platform_admin | `DELETE /users/:id` | Hard delete. Sessions revoked. Cannot be undone. |

### 6.3 Invitation System (to be implemented)

The invitation system is a new module: `src/modules/invitations/`.

```typescript
// Invitation record
interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  invitedByUserId: string;
  tokenHash: string;          // SHA-256 of the raw invitation token
  expiresAt: Date;            // 72 hours from creation
  isAccepted: boolean;
  acceptedAt: Date | null;
  createdAt: Date;
}
```

Endpoints:
- `POST /users/invite` — creates invitation, sends email
- `GET /auth/accept-invitation?token=` — validates invitation, creates/activates user
- `GET /users/invitations` — list pending invitations (platform_admin or company_admin for own company)
- `DELETE /users/invitations/:id` — cancel pending invitation

---

## 7. Authentication Contract

### 7.1 Login Response (`POST /auth/login`, `POST /auth/refresh`)

**Current (incomplete):**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900,
  "user": {
    "id": "...",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "isEmailVerified": true,
    "createdAt": "2026-06-14T00:00:00.000Z"
  }
}
```

**Required (post DEC-004 implementation):**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900,
  "user": {
    "id": "...",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "company_admin",
    "companyId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "companyKey": "acme-corp",
    "isEmailVerified": true,
    "isActive": true,
    "createdAt": "2026-06-14T00:00:00.000Z"
  }
}
```

For `platform_admin`:
```json
{
  "user": {
    "role": "platform_admin",
    "companyId": null,
    "companyKey": null
  }
}
```

### 7.2 `/auth/me` and `/users/me` Response

**Current `/auth/me`** returns `{ actorType, userId }` — inadequate.

**Required:** Both `/auth/me` and `/users/me` must return the same `UserResponseDto` as login/refresh:

```json
{
  "id": "...",
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "company_admin",
  "companyId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "companyKey": "acme-corp",
  "isEmailVerified": true,
  "isActive": true,
  "createdAt": "2026-06-14T00:00:00.000Z"
}
```

**Rationale for `/auth/me` alignment:** On page refresh, the frontend has the access token (or re-acquires it via refresh) but loses Zustand state. It must be able to restore `role` and `companyId` from an endpoint. `/users/me` serves this purpose.

**Implementation note:** The frontend calls `GET /users/me` on token refresh success to hydrate the role if the refresh endpoint itself doesn't return the user object. Recommended: include user in refresh response (already done for login) so no extra round-trip is needed.

### 7.3 JWT Payload

**Current:**
```json
{ "sub": "userId", "type": "access", "iat": 0, "exp": 0 }
```

**Required:**
```json
{
  "sub": "userId",
  "type": "access",
  "role": "company_admin",
  "companyId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "companyKey": "acme-corp",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Rationale for role in JWT:** Avoids a database lookup on every authenticated request. The backend can derive permissions and apply company scoping from the token without hitting the database.

**Tradeoff:** If a user's role is changed, the old token remains valid until expiry (up to 15 minutes). This is acceptable for this use case since role changes are rare administrative events. At role change, all existing sessions should be revoked (same as password change).

### 7.4 AuthContext Update

The `AuthContext` attached to each request must be updated:

```typescript
// Current
export interface AuthContext {
  actorType: 'user' | 'apikey';
  userId?: string;
  organizationId?: string;   // always undefined — never populated
  keyId?: string;
}

// Required
export interface AuthContext {
  actorType: 'user' | 'apikey';
  userId?: string;
  role?: UserRole;
  companyId?: string | null;
  companyKey?: string | null;
  keyId?: string;
}
```

`GlobalAuthGuard` must extract `role`, `companyId`, and `companyKey` from the JWT payload and attach them to `AuthContext`.

---

## 8. RBAC Navigation Contract (`role-config.ts`)

### 8.1 Structure

One file: `lib/role-config.ts`

All sidebar and navbar rendering must read from this config. No hardcoded role logic in `Sidebar.tsx`, `Topbar.tsx`, or any page component.

```typescript
import type { UserRole } from '@/types/permissions';
import type { UserPermissions } from '@/types/permissions';
import { derivePermissions } from '@/types/permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: string;            // MUI icon name — resolved at render time
  activePattern?: string;  // regex pattern or startsWith prefix
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface NavbarConfig {
  showAdminBadge: boolean;          // platform_admin: shows "Platform Admin" chip
  showCompanyName: boolean;         // company-scoped roles: shows company name
}

export interface RoleConfig {
  role: UserRole;
  landingPage: string;              // redirect target after successful login
  navbar: NavbarConfig;
  sidebar: NavSection[];            // sections in order; empty sections are hidden
  allowedRoutes: string[];          // route prefixes accessible to this role
                                    // '*' means all routes; otherwise startsWith match
  permissions: UserPermissions;     // derived — not manually set per-role
}
```

### 8.2 Per-Role Configuration

```typescript
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {

  platform_admin: {
    role: 'platform_admin',
    landingPage: '/companies',
    navbar: { showAdminBadge: true, showCompanyName: false },
    sidebar: [
      { label: 'Overview', items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'DashboardOutlined' },
      ]},
      { label: 'Companies', items: [
        { href: '/companies', label: 'Companies', icon: 'BusinessOutlined' },
      ]},
      { label: 'Configuration', items: [
        { href: '/channels', label: 'Channels', icon: 'HubOutlined' },
        { href: '/providers', label: 'Providers', icon: 'ExtensionOutlined' },
        { href: '/company-channel-providers', label: 'Assignments', icon: 'LinkOutlined' },
        { href: '/provider-credentials', label: 'Credentials', icon: 'KeyOutlined' },
      ]},
      { label: 'Notifications', items: [
        { href: '/domain-catalogue', label: 'Domains', icon: 'AccountTreeOutlined' },
        { href: '/event-catalogue', label: 'Events', icon: 'NotificationsOutlined' },
        { href: '/notifications/test', label: 'Test', icon: 'SendOutlined' },
      ]},
      { label: 'Templates', items: [
        { href: '/layout-templates', label: 'Templates', icon: 'DescriptionOutlined' },
      ]},
      { label: 'Files', items: [
        { href: '/files/media', label: 'Media', icon: 'ImageOutlined' },
        { href: '/files/storage', label: 'Storage', icon: 'FolderOpenOutlined' },
        { href: '/files/reports', label: 'Reports', icon: 'AssessmentOutlined' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'PersonOutlined' },
        { href: '/settings/modules', label: 'Platform Settings', icon: 'AdminPanelSettingsOutlined' },
      ]},
    ],
    allowedRoutes: ['*'],
    permissions: derivePermissions('platform_admin'),
  },

  company_admin: {
    role: 'company_admin',
    landingPage: '/companies',   // redirected to own company on mount
    navbar: { showAdminBadge: false, showCompanyName: true },
    sidebar: [
      { label: 'Company', items: [
        { href: '/companies', label: 'My Company', icon: 'BusinessOutlined' },
      ]},
      { label: 'Team', items: [
        { href: '/users', label: 'Team Members', icon: 'GroupOutlined' },
      ]},
      { label: 'Configuration', items: [
        { href: '/company-channel-providers', label: 'Assignments', icon: 'LinkOutlined' },
        { href: '/provider-credentials', label: 'Credentials', icon: 'KeyOutlined' },
      ]},
      { label: 'Notifications', items: [
        { href: '/domain-catalogue', label: 'Domains', icon: 'AccountTreeOutlined' },
        { href: '/event-catalogue', label: 'Events', icon: 'NotificationsOutlined' },
        { href: '/notifications/test', label: 'Test', icon: 'SendOutlined' },
      ]},
      { label: 'Templates', items: [
        { href: '/layout-templates', label: 'Templates', icon: 'DescriptionOutlined' },
      ]},
      { label: 'Files', items: [
        { href: '/files/media', label: 'Media', icon: 'ImageOutlined' },
        { href: '/files/storage', label: 'Storage', icon: 'FolderOpenOutlined' },
        { href: '/files/reports', label: 'Reports', icon: 'AssessmentOutlined' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'PersonOutlined' },
        { href: '/settings/company', label: 'Company Settings', icon: 'SettingsOutlined' },
      ]},
    ],
    allowedRoutes: [
      '/companies', '/users', '/company-channel-providers', '/provider-credentials',
      '/domain-catalogue', '/event-catalogue', '/notifications/test',
      '/layout-templates', '/files', '/settings',
    ],
    permissions: derivePermissions('company_admin'),
  },

  operator: {
    role: 'operator',
    landingPage: '/companies',
    navbar: { showAdminBadge: false, showCompanyName: true },
    sidebar: [
      { label: 'Company', items: [
        { href: '/companies', label: 'My Company', icon: 'BusinessOutlined' },
      ]},
      { label: 'Notifications', items: [
        { href: '/notifications/test', label: 'Test Notification', icon: 'SendOutlined' },
      ]},
      { label: 'Files', items: [
        { href: '/files/media', label: 'Media', icon: 'ImageOutlined' },
        { href: '/files/reports', label: 'Reports', icon: 'AssessmentOutlined' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'PersonOutlined' },
      ]},
    ],
    allowedRoutes: [
      '/companies', '/notifications/test', '/files/media', '/files/reports', '/settings/profile',
    ],
    permissions: derivePermissions('operator'),
  },

  viewer: {
    role: 'viewer',
    landingPage: '/companies',
    navbar: { showAdminBadge: false, showCompanyName: true },
    sidebar: [
      { label: 'Company', items: [
        { href: '/companies', label: 'My Company', icon: 'BusinessOutlined' },
      ]},
      { label: 'Files', items: [
        { href: '/files/reports', label: 'Reports', icon: 'AssessmentOutlined' },
      ]},
      { label: 'Settings', items: [
        { href: '/settings/profile', label: 'Profile', icon: 'PersonOutlined' },
      ]},
    ],
    allowedRoutes: ['/companies', '/files/reports', '/settings/profile'],
    permissions: derivePermissions('viewer'),
  },
};

export function getRoleConfig(role: UserRole | null | undefined): RoleConfig {
  return ROLE_CONFIGS[role ?? 'viewer'];
}

export function isRouteAllowed(role: UserRole | null, pathname: string): boolean {
  const config = getRoleConfig(role);
  if (config.allowedRoutes.includes('*')) return true;
  return config.allowedRoutes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}
```

### 8.3 Sidebar Rendering Rule

The `Sidebar` component must:
1. Call `useAuthStore(s => s.user?.role)` to get the role
2. Call `getRoleConfig(role).sidebar` to get the section list
3. Render sections and items from the config — no `if (role === 'platform_admin')` in JSX
4. Hide a section entirely if all its items are hidden by `isRouteAllowed`

```tsx
// Sidebar.tsx — correct pattern
function SidebarContent() {
  const role = useAuthStore(s => s.user?.role) ?? 'viewer';
  const config = getRoleConfig(role);
  const pathname = usePathname();

  return (
    <>
      {config.sidebar.map((section) => (
        <SidebarSection key={section.label} label={section.label}>
          {section.items.map((item) => (
            <SidebarItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
        </SidebarSection>
      ))}
    </>
  );
}
```

### 8.4 `derivePermissions` Update

The `derivePermissions` function must be updated to reflect the `operator` role (previously called `company_user`):

```typescript
function derivePermissions(role: UserRole | null | undefined): UserPermissions {
  const isAdmin = role === 'platform_admin';
  const isCompanyAdmin = role === 'company_admin';
  const isOperator = role === 'operator';

  return {
    canViewAllCompanies:       isAdmin,
    canCreateCompany:          isAdmin,
    canEditCompany:            isAdmin || isCompanyAdmin,
    canDeleteCompany:          isAdmin,
    canDeactivateCompany:      isAdmin,
    canViewAllUsers:           isAdmin,
    canInviteUser:             isAdmin || isCompanyAdmin,
    canDeactivateUser:         isAdmin || isCompanyAdmin,
    canDeleteUser:             isAdmin,
    canManageThemes:           isAdmin || isCompanyAdmin,
    canViewChannels:           isAdmin,
    canManageProviders:        isAdmin,
    canManageCredentials:      isAdmin || isCompanyAdmin,
    canManageDomains:          isAdmin || isCompanyAdmin,
    canManageEvents:           isAdmin || isCompanyAdmin,
    canTestNotifications:      isAdmin || isCompanyAdmin || isOperator,
    canManageTemplates:        isAdmin || isCompanyAdmin,
    canUploadMedia:            isAdmin || isCompanyAdmin || isOperator,
    canManageStorage:          isAdmin || isCompanyAdmin,
    canGenerateReports:        true,
    canManageApiKeys:          isAdmin || isCompanyAdmin,
    canViewAuditLogs:          isAdmin || isCompanyAdmin,
    canAccessPlatformSettings: isAdmin,
  };
}
```

**Note on `operator` vs `company_user`:** DEC-003 used `company_user`. This decision standardises on `operator` for clarity. All code, types, and documentation must use `operator`. Update `types/permissions.ts` and `hooks/usePermissions.ts` accordingly.

---

## 9. Route Protection

### 9.1 Three-Layer Security Model

```
Request hits /companies (portal page)
    │
    ├── Layer 1: Session Guard (app/(portal)/layout.tsx)
    │   ─────────────────────────────────────────────
    │   Is there a valid session?
    │     NO  → redirect to /auth/login?redirect=/companies
    │     YES → proceed to Layer 2
    │
    ├── Layer 2: Page Authorization Guard (page component)
    │   ─────────────────────────────────────────────────
    │   Does this role have access to this page?
    │     NO  → render <UnauthorizedPage role={role} />
    │     YES → render page content, proceed to Layer 3
    │
    └── Layer 3: Action Authorization (PermissionGuard + usePermissions)
        ───────────────────────────────────────────────────────────────
        Does this role have permission for this specific action?
          NO  → PermissionGuard renders nothing (or fallback)
          YES → action button/form rendered and functional
```

### 9.2 Layer 1 — Session Guard (Frontend)

**Owner:** `app/(portal)/layout.tsx`

**Responsibility:**
- Checks `auth.store.accessToken` on mount
- If absent: checks `localStorage.getItem('comm_portal_rt')` for refresh token
- If refresh token: calls `POST /auth/refresh` → on success restores accessToken + user (including role)
- If no session: redirects to `/auth/login?redirect=<current-path>`

**Does NOT check:** role or specific permissions.

### 9.3 Layer 2 — Page Authorization Guard (Frontend)

**Owner:** Each page component

**Implementation:**
```typescript
// hooks/useRouteGuard.ts
export function useRouteGuard(): { allowed: boolean; role: UserRole | null } {
  const role = useAuthStore(s => s.user?.role) ?? null;
  const pathname = usePathname();
  const allowed = isRouteAllowed(role, pathname);
  return { allowed, role };
}
```

Usage in every protected page:
```tsx
export default function ChannelsPage() {
  const { allowed } = useRouteGuard();
  if (!allowed) return <UnauthorizedPage />;
  return <ChannelsContent />;
}
```

`<UnauthorizedPage />` is a shared component that:
- Shows a lock icon and "Access Restricted" message
- Offers a "Go to Dashboard" link pointing to `getRoleConfig(role).landingPage`
- Does not redirect — renders inline (avoids flash)

### 9.4 Layer 3 — Action Authorization (Frontend)

**Owner:** Individual UI elements

**Implementation:** `PermissionGuard` wrapping every button, form, or destructive action:
```tsx
<PermissionGuard allowed={canCreateCompany}>
  <Button onClick={openCreateDrawer}>New Company</Button>
</PermissionGuard>
```

### 9.5 Backend Authorization (Server-Side)

The frontend guards are UX only. The backend must independently enforce authorization.

**Current state:** No backend authorization beyond authentication exists.

**Required backend implementation:**

```typescript
// Pattern for role-based endpoint guard
@Get()
async list(@CurrentUser() ctx: AuthContext) {
  if (ctx.role === 'platform_admin') {
    return this.companies.findAll(...);          // all companies
  }
  if (ctx.companyId) {
    return this.companies.findById(ctx.companyId); // own company only
  }
  throw new ForbiddenException();
}
```

A reusable `@Roles()` decorator and `RolesGuard` must be implemented:
```typescript
@UseGuards(RolesGuard)
@Roles('platform_admin')
@Delete(':key')
delete(@Param('key') key: string) { ... }
```

Company scoping middleware or a guard that reads `ctx.companyId` and validates resource ownership must be applied to all multi-tenant endpoints.

---

## 10. Future Modules Validation

### 10.1 Module × Role Matrix

This validates that the role model scales to all planned modules without redesign.

| Module | platform_admin | company_admin | operator | viewer | Route prefix |
|---|---|---|---|---|---|
| **Dashboard** | Platform-wide stats | Company stats | Company stats (limited) | Company stats (read) | `/dashboard` |
| **Companies** | Full CRUD all | View+Edit own | View own (basic) | View own (basic) | `/companies` |
| **Users** | Full CRUD all | Invite/manage own company | Profile only | Profile only | `/users` |
| **Channels** | Full CRUD catalogue | View only | No access | No access | `/channels` |
| **Providers** | Full CRUD master list | View only | No access | No access | `/providers` |
| **Assignments** | Full CRUD all | CRUD own company | No access | No access | `/company-channel-providers` |
| **Credentials** | Full CRUD all | CRUD own company | No access | No access | `/provider-credentials` |
| **Domains** | Full CRUD all | CRUD own company | No access | No access | `/domain-catalogue` |
| **Events** | Full CRUD all | CRUD own company | No access | No access | `/event-catalogue` |
| **Notifications Test** | Full | Full | Send only | No access | `/notifications/test` |
| **Templates** | Full CRUD all | CRUD own company | No access | No access | `/layout-templates` |
| **Files — Media** | All | Own company | Own company (upload) | No access | `/files/media` |
| **Files — Storage** | All | Own company | No access | No access | `/files/storage` |
| **Files — Reports** | All | Own company | Own company | Own company (download) | `/files/reports` |
| **API Keys** | Full CRUD all | CRUD own company | No access | No access | `/settings/api-keys` |
| **Audit Logs** | All | Own company | No access | No access | `/settings/audit` |
| **Platform Settings** | Full | No access | No access | No access | `/settings/modules` |
| **Company Settings** | Full | Own company | No access | No access | `/settings/company` |
| **Profile Settings** | Own | Own | Own | Own | `/settings/profile` |

### 10.2 Scalability Assessment

The role model handles all planned modules without modification:

- **Cross-company access** is entirely within `platform_admin` — no other role needs multi-tenant access
- **Company-scoped access** uses `companyId` from JWT — applies identically to all company-scoped resources
- **Read-only access** (operator, viewer) is a subset of company_admin — `derivePermissions()` handles this cleanly
- **New modules** added in the future follow the same pattern: add a permission flag, set true/false per role in `derivePermissions()`
- **No redesign required** to add new modules — only new permission flags

### 10.3 Single-Page CRUD Applicability

The single-page CRUD pattern established in Sprint-003 applies to all modules:
- A `platform_admin` sees the full list and all actions
- A `company_admin` either sees a filtered list or is redirected to their company's records
- An `operator` or `viewer` sees a read-only view or `<UnauthorizedPage />`

The `role-config.ts` `allowedRoutes` list determines which routes each role can visit. The page guard enforces this. The `PermissionGuard` wrapping each action enforces what the user can do on that page.

---

## 11. Backend Implementation Order

Based on priority for unblocking frontend integration:

| Priority | Task | Rationale |
|---|---|---|
| **P0.1** | Remove `assertApiKey()` from all communication controllers | Frontend cannot call any endpoint without this |
| **P0.2** | Add `role` and `companyId` fields to User schema | Foundation for everything else |
| **P0.3** | Update `UserResponseDto` to include `role`, `companyId`, `companyKey` | Frontend needs these in every auth response |
| **P0.4** | Update `AuthService.issueTokens()` to include role in JWT payload | Backend can enforce company scoping |
| **P0.5** | Update `GlobalAuthGuard` to extract role/companyId from JWT and populate AuthContext | Backend guards can use role |
| **P0.6** | Update `AuthController.me()` to return full `UserResponseDto` | Frontend can re-hydrate role on page refresh |
| **P1.1** | Implement `RolesGuard` and `@Roles()` decorator | Role-based endpoint protection |
| **P1.2** | Apply company scoping to communication endpoints (non-admin users see only own company data) | Multi-tenant correctness |
| **P1.3** | Bootstrap migration: existing users → `platform_admin` | Fix current data |
| **P1.4** | Restrict `POST /auth/register` to invitation-token flow | Close uncontrolled registration |
| **P2.1** | Implement `InvitationsModule` (invite, accept, list, cancel) | Option C onboarding flow |
| **P2.2** | Add `isActive` field to User schema and deactivation logic | User lifecycle |
| **P2.3** | Cascade: deactivate company → revoke all company user sessions | Company lifecycle correctness |
| **P2.4** | `POST /users/invite` endpoint | Invitation system entry point |

---

## 12. Risks and Tradeoffs

| Risk | Severity | Mitigation |
|---|---|---|
| Role in JWT cannot be instantly revoked on role change | Medium | Revoke all sessions on role change (same as password reset). 15-min access token TTL limits exposure window. |
| `company_admin` cannot invite another `company_admin` | Low | By design — only platform_admin promotes company_admin. Avoids privilege escalation. |
| `companyKey` denormalisation in User — becomes stale if Company is renamed | Low | `companyKey` is immutable by policy. Cannot be changed after creation. |
| Disabling public registration breaks existing dev workflow | Medium | Bootstrap script creates first platform_admin. Document the development setup procedure. |
| P0.1 (remove API key from controllers) may break existing integrations | High | `COMMUNICATION_API_KEY` still valid via GlobalAuthGuard step 3. Existing API key integrations continue to work; only the inline controller check is removed. |
| No audit log for user invitations/deactivations in v1 | Low | Accepted for v1. Audit log module planned for Phase B. |
| `operator` renamed from `company_user` — existing frontend code uses `company_user` | Medium | Update `types/permissions.ts`, `usePermissions.ts` together. Single-step rename — no data migration needed until backend ships role. |

---

## Related Documents

- [[DEC-005 Test Coverage Strategy]] — backend test gaps
- [[../../Frontend/Decisions/DEC-003 Role Navigation and Route Protection]] — frontend RBAC audit
- [[../../Frontend/Architecture]] — permission architecture section
- [[../../Frontend/Authentication]] — role in auth response
- [[../Security]] — backend RBAC gaps
- [[../API.md]] — endpoint auth contracts
- [[../Technical Debt/Open/]] — TD-001 (API key stub), TD-016 (refresh token in body)
