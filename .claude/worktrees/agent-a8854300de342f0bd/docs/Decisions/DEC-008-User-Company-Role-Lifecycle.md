# DEC-008 — User Company Role Lifecycle

| Field | Value |
|---|---|
| ID | DEC-008 |
| Status | **Approved — Amendment A3 (2026-06-23)** |
| Amendment | A3 corrects the platform_admin company association model. A3 supersedes BR-004 and §3 of the role/scope mapping. A1 and A2 content not listed as superseded remains valid. |
| Authors | Architecture |
| Last Updated | 2026-06-23 |

---

## Amendment A3 — Summary of Changes (2026-06-23)

Amendment A3 corrects the `platform_admin` company association model. The old rule (BR-004) stated that `platform_admin` must have `companyId = null`. This is replaced by the requirement that `platform_admin` must belong to the **Grapifly platform operator company**.

**Sections superseded by A3:**
- §3 (Role/Scope Mapping table) — platform_admin row updated
- §3.1 (Invalid Combinations) — updated to reflect that `companyId: null` is now invalid for platform_admin
- §5.1 (Backend Validation Rules) — platform_admin validation condition updated
- A2.1 BR-004 — replaced
- A2.2 platform_admin `companyId` / `companyKey` fields — updated
- A2.3 Role Definition Matrix — platform_admin row updated

All other A1 and A2 content remains valid.

---

## Amendment A2 — Summary of Changes

This amendment adds the **formal role model specification** as the canonical reference for all RBAC implementation across frontend and backend. It introduces:

- Per-role full definitions (purpose, scope, creation, permissions, pages, sidebar, navbar, API, data visibility, user journey)
- Role definition matrix
- Use case matrix
- Permission matrix
- Sidebar / Navbar matrix
- API access matrix
- User creation lifecycle matrix
- Required test scenarios per role
- Contradictions and gaps found in the current implementation

Amendment A1 content is unchanged and remains authoritative.

---

## Amendment A1 — Summary of Changes

This amendment replaces the previous informal role model (`platform_admin`, `company_admin`, `company_user`, `viewer`) with a formal five-role model, introduces an explicit scope system, mandates a single-source-of-truth frontend config file, and defines strict backend validation rules for role/scope combinations.

**Superseded assumptions:**
- The `company_user` role is removed and replaced by `operator`.
- The absence of explicit scope was previously implied by role. Scope is now a first-class field on every user and in every JWT.
- The previous `AuthContext` used `organizationId`; it is replaced by `companyId`, `companyKey`, `scope`, and `role`.

---

## 1. Approved Role Model

### 1.1 Roles

| Role | Description |
|---|---|
| `platform_admin` | Full platform access; creates companies; invites company owners |
| `company_owner` | Primary owner of a single company; manages all company users |
| `company_admin` | Administrative access within a company; cannot transfer ownership |
| `operator` | Operational access within a company |
| `viewer` | Read-only access within a company |

### 1.2 TypeScript Type

```ts
type UserRole =
  | 'platform_admin'
  | 'company_owner'
  | 'company_admin'
  | 'operator'
  | 'viewer';
```

---

## 2. Scope Model

Every user **must** have a scope. Scope is not derived from role at runtime — it is stored on the user record and included in every JWT.

### 2.1 Valid Scopes

| Scope | Description |
|---|---|
| `global` | Actor operates across all companies |
| `company` | Actor is bound to a single company |

### 2.2 TypeScript Type

```ts
type Scope = 'global' | 'company';
```

---

## 3. Approved Role / Scope Mapping

> ⚠️ **Amended by A3 (2026-06-23).** The platform_admin row is updated. See Amendment A3 section below.

| Role | Scope | companyId | companyKey |
|---|---|---|---|
| `platform_admin` | `global` | `<grapifly._id>` (required) | `'grapifly'` (required) |
| `company_owner` | `company` | required | required |
| `company_admin` | `company` | required | required |
| `operator` | `company` | required | required |
| `viewer` | `company` | required | required |

**Important:** `platform_admin` has `scope: 'global'`, which means cross-company access. The `companyId` field identifies the Grapifly operator company but is **not** used as a data access filter. Access control is governed by `scope`, not by checking `companyId`.

### 3.1 Invalid Combinations (backend must reject these with HTTP 400)

> ⚠️ **Amended by A3 (2026-06-23).** The first example below replaces the old invalid combination for platform_admin.

```json
{ "role": "platform_admin", "companyId": null }            // INVALID — platform_admin must belong to Grapifly
{ "role": "platform_admin", "companyId": "<non-grapifly>" } // INVALID — must be Grapifly company ID only
{ "role": "company_admin", "companyId": null }              // INVALID — company_admin must have companyId
{ "role": "viewer", "companyKey": null }                    // INVALID — viewer must have companyKey
```

---

## 4. Updated Authentication Contracts

### 4.1 Login Response

```ts
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    scope: Scope;
    companyId: string | null;
    companyKey: string | null;
  };
}
```

### 4.2 JWT Payload Contract

```ts
interface JwtPayload {
  sub: string;        // User ObjectId
  role: UserRole;
  scope: Scope;
  companyId: string | null;
  companyKey: string | null;
  type: 'access';
}
```

---

## 5. Backend Validation Rules

### 5.1 User Creation / Update

> ⚠️ **Amended by A3 (2026-06-23).** The platform_admin validation rule is updated.

```
IF role === 'platform_admin':
  companyId   MUST be <grapifly._id>  — null is INVALID
  companyKey  MUST be 'grapifly'      — null is INVALID
  scope       MUST be 'global'

IF role IN ('company_owner', 'company_admin', 'operator', 'viewer'):
  companyId   MUST be non-null and reference an existing company (not Grapifly)
  companyKey  MUST be non-null and match the company's key
  scope       MUST be 'company'
```

**Access control rule:** Backend modules must use `authContext.scope` to determine data access level, not `authContext.companyId === null`. The correct pattern is:

```typescript
// CORRECT
const isGlobal = authContext.scope === 'global';

// WRONG — companyId is no longer null for platform_admin
const isGlobal = authContext.companyId === null;
```

Validation failure returns **HTTP 400**.

### 5.2 User Schema Fields

| Field | Type | Constraint |
|---|---|---|
| `role` | `UserRole` | required, indexed |
| `scope` | `Scope` | required |
| `companyId` | `ObjectId \| null` | null for global users |
| `companyKey` | `string \| null` | null for global users |

### 5.3 AuthContext

```ts
interface AuthContext {
  actorType: 'user' | 'apikey';
  userId?: string;
  role?: UserRole;
  scope?: Scope;
  companyId?: string | null;
  companyKey?: string | null;
  keyId?: string;
}
```

---

## 6. Invitation Lifecycle

### 6.1 Who Can Create Whom

> **Revised 2026-06-29 per DEC-009 Rev-2.** `company_owner` is NEVER created via `POST /users/invite`. See DEC-009 §4.1.

```
platform_admin
├── POST /companies/with-owner  → creates company + company_owner (atomically)
└── POST /users/invite          → platform_admin only
    (platform_admin itself can also be created at bootstrap by PLATFORM_ADMIN_BOOTSTRAP_EMAIL)

company_owner
├── POST /users/invite          → company_admin
├── POST /users/invite          → operator
└── POST /users/invite          → viewer

company_admin
├── POST /users/invite          → operator
└── POST /users/invite          → viewer
    (cannot create company_owner, another company_admin, or platform_admin)

operator     → no creation capability
viewer       → no creation capability
```

### 6.2 Invitation Rules

- Invitations carry: `{ email, role, companyId, companyKey }`.
- Backend validates that the inviting user has authority to assign the target role.
- `company_admin` cannot create `company_owner`, another `company_admin`, or `platform_admin`.
- `platform_admin` cannot be created via invitation flow; must be seeded or promoted by another `platform_admin` via direct DB operation.

---

## 7. Frontend Single Source of Truth — `role-config.ts`

### 7.1 Mandate

`role-config.ts` is the **sole** source of truth for:

1. Post-login redirect
2. Navbar rendering
3. Sidebar rendering
4. Route authorization
5. Permission authorization

### 7.2 Type Contracts

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

### 7.3 Accessor Functions

```ts
function getRoleConfig(role: UserRole): RoleConfig      // throws if role is unknown
function getLandingPage(role: UserRole): string
function isRouteAllowed(role: UserRole, pathname: string): boolean
function getPermissions(role: UserRole): UserPermissions
```

These four functions are the **only** public interface to RBAC logic in the frontend.

---

## 8. Navbar Architecture

### 8.1 Constraint

`Topbar` must not contain any `if (role === …)` or `switch (role)` logic.

### 8.2 Platform Admin Navbar

| Element | Shown |
|---|---|
| Company name | No |
| Role badge | Yes — "Platform Admin" |
| Environment badge | Yes |
| Company switcher | No |

### 8.3 Company-Scoped Roles Navbar

| Element | Shown |
|---|---|
| Company name | Yes |
| Role badge | Yes — human-readable label |
| Environment badge | No |
| Company switcher | No |

---

## 9. Sidebar Architecture

`Sidebar.tsx` must not contain any `if (role === …)` or `switch (role)` logic. It receives `SidebarSection[]` from `getRoleConfig(role).sidebar` and renders them.

---

## 10. Route Protection Architecture

### 10.1 Three-Layer Authorization Model

```
Layer 1 — Session Authentication
  Failure: redirect to /auth/login

Layer 2 — Route Authorization
  Checks: isRouteAllowed(role, pathname)
  Failure: redirect to getRoleConfig(role).landingPage

Layer 3 — Action Authorization
  Checks: permissions object
  Implementation: <PermissionGuard> / usePermissions()
```

### 10.2 Core Principle

Sidebar visibility does **not** constitute authorization. A hidden link must also be blocked at Layer 2.

---

## 11. Navigation Flow

### 11.1 Post-Login Navigation Contract

**Prohibited pattern:**
```ts
if (role === 'platform_admin') router.push('/dashboard');  // NEVER
```

**Required pattern:**
```ts
const config = getRoleConfig(user.role);
router.push(config.landingPage);
```

### 11.2 Role Compatibility Matrix

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

---

## 12. Remaining Architectural Gaps (A1)

| # | Gap | Priority |
|---|---|---|
| G-001 | User invitation flow API contract not yet designed | High |
| G-002 | `company_owner` transfer of ownership flow undefined | High |
| G-003 | Platform Admin user management UI route undefined | High |
| G-004 | API Keys module does not exist yet | Medium |
| G-005 | Audit Logs module does not exist yet | Medium |
| G-006 | Users module frontend route and UI not yet built | High |
| G-007 | Token refresh response does not return updated user context | Medium |
| G-008 | `platform_admin` acting-as a company not yet defined | Low |
| G-009 | Route namespace `/portal/` not yet enforced | High |
| G-010 | `SidebarSection` icon type should reference a shared IconKey enum | Low |

---

## Appendix A — Migration Delta from Previous Assumptions

| Aspect | Before | After (A1) |
|---|---|---|
| Roles | `platform_admin`, `company_admin`, `company_user`, `viewer` | five-role model |
| Scope field | Absent | Required on user record and JWT |
| JWT payload | `{ sub, type }` | `{ sub, role, scope, companyId, companyKey, type }` |
| RBAC source of truth | `types/permissions.ts` | `role-config.ts` |
| Route protection | None | Three-layer model |
| Backend AuthContext | `{ actorType, userId, organizationId, keyId }` | `{ actorType, userId, role, scope, companyId, companyKey, keyId }` |

---

---

# Amendment A2 — Formal Role Model Specification (2026-06-15)

This amendment is **additive**. All Amendment A1 content remains valid.

---

## A2.1 Ten Business Rules

The following rules are absolute and must be enforced at every layer (backend validation, frontend guard, API contract):

| # | Rule |
|---|---|
| BR-001 | Public registration must always create `company_owner` — never any other role |
| BR-002 | Public registration must create a company atomically with the user — the two are inseparable |
| BR-003 | Public registration must never create `platform_admin` under any code path |
| BR-004 | ~~`platform_admin` must never have `companyId` or `companyKey` — any non-null value is invalid~~ **Superseded by Amendment A3.** `platform_admin` must have `companyId = <grapifly._id>` and `companyKey = 'grapifly'`. Null is now invalid. |
| BR-005 | All company-scoped roles must always have both `companyId` and `companyKey` — null values are invalid |
| BR-006 | No frontend fallback may convert a missing, null, or unrecognised role into `platform_admin` — missing role must fail safely |
| BR-007 | Missing or invalid role must result in a safe failure: 400 (backend) or redirect to /auth/login (frontend) |
| BR-008 | Sidebar visibility is not authorization — a hidden link must also be blocked at Layer 2 (route guard) |
| BR-009 | Backend must enforce all role permissions independently — frontend enforcement is convenience only |
| BR-010 | `role-config.ts` is the single source of truth for frontend navigation and permissions — no inline role logic in components |

---

## A2.2 Per-Role Full Definition

### Role: `platform_admin`

> ⚠️ **companyId and companyKey fields amended by A3 (2026-06-23).**

| Field | Value |
|---|---|
| Purpose | Global platform operator. Manages all companies, channels, and providers. Performs system-level administration. |
| Scope | `global` |
| companyId | `<grapifly._id>` (required — Grapifly platform company) |
| companyKey | `'grapifly'` (required) |
| Who can create it | Bootstrap/seed script or another `platform_admin` via direct DB operation. Never via `/auth/register` or `/users/invite`. |
| Who it can create | `company_owner`, `company_admin`, `operator`, `viewer` via invite; cannot create another `platform_admin` via API |

**Main use cases:**
1. Creating and managing companies on the platform
2. Managing global channel catalogue
3. Managing global provider catalogue
4. Viewing all users across all companies
5. Assigning company owners to new companies
6. Deactivating or deleting companies

**Allowed pages:**
`/dashboard`, `/companies`, `/companies/:id`, `/users`, `/channels`, `/providers`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`, `/notifications/test`, `/files/media`, `/files/reports`, `/files/storage`, `/api-keys`, `/audit-logs`, `/settings/profile`

**Forbidden pages:** None (global scope — all routes accessible)

**Allowed actions:**
- All CRUD on companies, channels, providers
- View and manage all users across all companies
- Invite any company-scoped role to any company
- Access audit logs for any company
- Manage API keys for any company
- Test notifications for any company

**Forbidden actions:**
- Transfer company ownership (only company_owner can do this for their own company)
- Create another `platform_admin` via invite flow

**Sidebar sections:**
```
Overview
  ▪ Dashboard

Platform
  ▪ Companies
  ▪ Channels
  ▪ Providers

Admin
  ▪ Users
  ▪ API Keys
  ▪ Audit Logs

Settings
  ▪ Profile
```

**Navbar behavior:**
- Company name: hidden
- Role badge: "Platform Admin"
- Environment badge: shown (staging/production)
- Company switcher: hidden

**Backend permissions:** All routes authorized. Company isolation check bypassed (global scope).

**Frontend permissions:** All permissions `true`. `role-config.ts` grants full access.

**API access:** Unrestricted. No `companyId` filter applied on any query.

**Company data visibility:** All companies and all their data.

**Example user journey:**
> Maria logs in as `platform_admin`. She sees the platform sidebar (Companies, Channels, Providers). She navigates to Global Users → Create Company, fills in "Acme Corp" and `alice@acme.com` as the initial owner. The system calls `POST /companies/with-owner`, creates Acme Corp, provisions default assets, creates Alice's account with `role=company_owner, mustChangePassword=true`, and sends `security.company_user_invitation`. Alice receives the email with her temp password, logs in, changes her password, and lands on the dashboard.

---

### Role: `company_owner`

| Field | Value |
|---|---|
| Purpose | Primary owner of a single company. Responsible for company setup, configuration, billing, and user governance. |
| Scope | `company` |
| companyId | required |
| companyKey | required |
| Who can create it | Public registration (`POST /auth/register`, creates company simultaneously) OR `platform_admin` via `POST /companies/with-owner` — **never via `POST /users/invite`** |
| Who it can create | `company_admin`, `operator`, `viewer` via `POST /users/invite` |

**Main use cases:**
1. Setting up company channel credentials
2. Managing domain and event catalogue
3. Creating and managing layout templates
4. Inviting and managing team members
5. Accessing reports and media
6. Managing API keys for integrations
7. Viewing audit logs

**Allowed pages:**
`/dashboard`, `/companies/:id` (own), `/users`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`, `/notifications/test`, `/files/media`, `/files/reports`, `/files/storage`, `/api-keys`, `/audit-logs`, `/settings/profile`

**Forbidden pages:**
`/companies` (list — platform_admin only), `/channels`, `/providers`

**Allowed actions:**
- View and manage own company settings
- Full CRUD on provider credentials, domain catalogue, event catalogue, layout templates
- Invite `company_admin`, `operator`, `viewer`
- Manage API keys
- View audit logs
- Upload media, view reports, manage storage

**Forbidden actions:**
- Access company list (sees only own company)
- Access global channels or providers catalogue
- Invite `company_owner` (to avoid co-ownership conflicts) or `platform_admin`
- Delete the company (platform_admin only)
- Access other companies' data

**Sidebar sections:**
```
Overview
  ▪ Dashboard

My Company
  ▪ Credentials
  ▪ Templates
  ▪ Domain Catalogue
  ▪ Event Catalogue

Users
  ▪ Team

Reports & Files
  ▪ Reports
  ▪ Media
  ▪ Storage

Settings
  ▪ Profile
```

**Navbar behavior:**
- Company name: shown
- Role badge: "Owner"
- Environment badge: hidden
- Company switcher: hidden

**Backend permissions:** Authorized for own company's resources only. `resource.companyId === authContext.companyId` enforced on all queries.

**API access rules:**
- `GET /companies` → 403 (platform_admin only)
- `GET /companies/:id` → 200 if own company; 403 if other
- `GET /users` → own company users only
- `POST /users/invite` → operator, viewer, company_admin only; 403 for company_owner or platform_admin

**Company data visibility:** Own company only.

**Example user journey:**
> Alice registers at `/auth/register` with companyName="Acme Corp". The backend creates her account (`role=company_owner`) and a new company (`Acme Corp`), links them, and sends a verification email. After verifying, she logs in and lands on `/dashboard`. She navigates to Team, invites `bob@acme.com` as `company_admin`. She configures credentials in My Company → Credentials.

---

### Role: `company_admin`

| Field | Value |
|---|---|
| Purpose | Administrative manager within a single company. Handles operational configuration and limited user management. Cannot transfer ownership. |
| Scope | `company` |
| companyId | required |
| companyKey | required |
| Who can create it | `company_owner` via `POST /users/invite` |
| Who it can create | `operator`, `viewer` via `POST /users/invite` |

**Main use cases:**
1. Configuring channel credentials
2. Managing domain catalogue and event catalogue
3. Creating and editing layout templates
4. Inviting operators and viewers
5. Testing notifications
6. Managing media and viewing reports

**Allowed pages:**
`/dashboard`, `/users`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`, `/notifications/test`, `/files/media`, `/files/reports`, `/settings/profile`

**Forbidden pages:**
`/companies` (list or detail), `/channels`, `/providers`, `/files/storage`, `/api-keys`, `/audit-logs`

**Allowed actions:**
- CRUD on provider credentials, domain catalogue, event catalogue, layout templates
- Invite `operator`, `viewer`
- Test notifications
- Upload and view media
- View reports

**Forbidden actions:**
- Invite `company_owner`, another `company_admin`, or `platform_admin`
- Transfer company ownership
- Access or modify company settings
- Access platform-level resources (channels, providers)
- Manage API keys or audit logs
- Delete users (only company_owner and platform_admin)

**Sidebar sections:**
```
Overview
  ▪ Dashboard

My Company
  ▪ Credentials
  ▪ Templates
  ▪ Domain Catalogue
  ▪ Event Catalogue

Users
  ▪ Team

Reports & Files
  ▪ Reports
  ▪ Media

Settings
  ▪ Profile
```

**Navbar behavior:**
- Company name: shown
- Role badge: "Company Admin"
- Environment badge: hidden
- Company switcher: hidden

**Backend permissions:** Authorized for own company's resources only. Cannot access company settings endpoint, API keys, audit logs, or storage.

**API access rules:**
- `GET /users` → own company users only
- `POST /users/invite` → operator, viewer only; 403 for company_owner, company_admin, platform_admin
- `GET /companies/:id` → 403
- `GET /api-keys` → 403
- `GET /audit-logs` → 403

**Company data visibility:** Own company's operational data only.

**Example user journey:**
> Bob is `company_admin` at Acme Corp. He logs in and sees the company sidebar. He navigates to Team and invites `carol@acme.com` as `operator`. He creates a layout template for email notifications. He tests a notification via Notification Testing. He cannot access API Keys or Audit Logs — those links don't appear in the sidebar, and direct URL navigation redirects him to `/dashboard`.

---

### Role: `operator`

| Field | Value |
|---|---|
| Purpose | Day-to-day operational tasks. Executes notification tests, manages media uploads, and views reports. No management or configuration capability. |
| Scope | `company` |
| companyId | required |
| companyKey | required |
| Who can create it | `company_owner` or `company_admin` via `POST /users/invite` |
| Who it can create | Nobody |

**Main use cases:**
1. Sending test notifications
2. Uploading and managing media assets
3. Viewing operational reports

**Allowed pages:**
`/dashboard`, `/notifications/test`, `/files/media`, `/files/reports`, `/settings/profile`

**Forbidden pages:**
`/companies`, `/channels`, `/providers`, `/users`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`, `/files/storage`, `/api-keys`, `/audit-logs`

**Allowed actions:**
- Send test notifications
- Upload, view, and manage media
- View reports

**Forbidden actions:**
- Manage users (no invite, no deactivate, no role change)
- View or modify credentials, domain catalogue, event catalogue, templates
- Access company settings or platform resources
- Any destructive action (delete, deactivate)

**Sidebar sections:**
```
Overview
  ▪ Dashboard

Operations
  ▪ Notification Testing
  ▪ Reports
  ▪ Media

Settings
  ▪ Profile
```

**Navbar behavior:**
- Company name: shown
- Role badge: "Operator"
- Environment badge: hidden
- Company switcher: hidden

**Backend permissions:** Authorized only for operational endpoints. All management endpoints return 403.

**API access rules:**
- `GET /users` → 403
- `POST /users/invite` → 403
- `GET /provider-credentials` → 403
- `POST /notifications/test` → 200
- `GET /files/media` → 200
- `GET /files/reports` → 200

**Company data visibility:** Own company's operational data only (no configuration or administrative data).

**Example user journey:**
> Carol is `operator` at Acme Corp. She logs in and sees the operations sidebar. She runs a test notification through the Notification Testing page. She uploads a media file for use in templates. She cannot access Team, Credentials, or any admin section — direct URL attempts redirect her to `/dashboard`.

---

### Role: `viewer`

| Field | Value |
|---|---|
| Purpose | Read-only access to company content. Cannot create, update, delete, invite, or perform any write action. |
| Scope | `company` |
| companyId | required |
| companyKey | required |
| Who can create it | `company_owner` or `company_admin` via `POST /users/invite` |
| Who it can create | Nobody |

**Main use cases:**
1. Reviewing layout templates
2. Downloading or viewing reports

**Allowed pages:**
`/dashboard`, `/layout-templates` (read-only), `/files/reports`, `/settings/profile`

**Forbidden pages:**
`/companies`, `/channels`, `/providers`, `/users`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/notifications/test`, `/files/media`, `/files/storage`, `/api-keys`, `/audit-logs`

**Allowed actions:**
- View layout templates (read-only)
- View and download reports
- Edit own profile

**Forbidden actions:**
- Create, update, or delete any resource
- Send test notifications
- Upload media
- Invite or manage users
- Access any configuration or management section

**Sidebar sections:**
```
Overview
  ▪ Dashboard

Content
  ▪ Templates
  ▪ Reports

Settings
  ▪ Profile
```

**Navbar behavior:**
- Company name: shown
- Role badge: "Viewer"
- Environment badge: hidden
- Company switcher: hidden

**Backend permissions:** Authorized only for read-only operational endpoints. All write endpoints return 403.

**API access rules:**
- `GET /layout-templates` → 200 (read-only)
- `POST /layout-templates` → 403
- `PATCH /layout-templates/:id` → 403
- `GET /files/reports` → 200
- `GET /users` → 403
- `POST /notifications/test` → 403
- `GET /files/media` → 403

**Company data visibility:** Own company's content only, in read-only mode.

**Example user journey:**
> Dave is `viewer` at Acme Corp. He logs in and sees a minimal sidebar (Dashboard, Templates, Reports). He browses layout templates but cannot edit or create them. He downloads a report PDF. He cannot navigate to any team, credentials, or admin page — direct URL attempts redirect him to `/dashboard`.

---

## A2.3 Role Definition Matrix

> ⚠️ **platform_admin companyId/companyKey fields amended by A3 (2026-06-23).**

| Attribute | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| Scope | global | company | company | company | company |
| companyId | `<grapifly._id>` (required) | required | required | required | required |
| companyKey | `'grapifly'` (required) | required | required | required | required |
| Created by | seed / platform_admin | public reg / platform_admin | company_owner / platform_admin | company_owner / company_admin | company_owner / company_admin |
| Can invite | owner / admin / op / viewer | admin / operator / viewer | operator / viewer | nobody | nobody |
| Can manage company settings | ✓ (all) | ✓ (own) | ✗ | ✗ | ✗ |
| Can manage users | ✓ (all) | ✓ (own) | ✓ (own, op/viewer only) | ✗ | ✗ |
| Transfer ownership | ✗ | ✓ | ✗ | ✗ | ✗ |
| Platform catalogue access | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## A2.4 Use Case Matrix

| Use Case | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| Create a new company | ✓ | ✗ | ✗ | ✗ | ✗ |
| Deactivate a company | ✓ | ✗ | ✗ | ✗ | ✗ |
| Invite company_owner | ✓ | ✗ | ✗ | ✗ | ✗ |
| Invite company_admin | ✓ | ✓ | ✗ | ✗ | ✗ |
| Invite operator | ✓ | ✓ | ✓ | ✗ | ✗ |
| Invite viewer | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit company settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| Configure credentials | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage domain catalogue | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage event catalogue | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create layout templates | ✓ | ✓ | ✓ | ✗ | ✗ |
| View layout templates | ✓ | ✓ | ✓ | ✗ | ✓ |
| Send test notifications | ✓ | ✓ | ✓ | ✓ | ✗ |
| Upload media | ✓ | ✓ | ✓ | ✓ | ✗ |
| View reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage storage | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage API keys | ✓ | ✓ | ✗ | ✗ | ✗ |
| View audit logs | ✓ | ✓ | ✗ | ✗ | ✗ |
| Transfer ownership | ✗ | ✓ | ✗ | ✗ | ✗ |
| View global channel catalogue | ✓ | ✗ | ✗ | ✗ | ✗ |
| View global provider catalogue | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## A2.5 Permission Matrix

| Permission Key | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| `canViewAllCompanies` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canViewOwnCompany` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `canCreateCompany` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canEditCompany` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `canDeleteCompany` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canDeactivateCompany` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canManageUsers` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canInviteUsers` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canDeactivateUsers` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `canDeleteUsers` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `canTransferOwnership` | ✗ | ✓ | ✗ | ✗ | ✗ |
| `canViewChannels` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canManageChannels` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canManageProviders` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canManageCredentials` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canViewCredentials` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canManageDomains` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canManageEvents` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canManageTemplates` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canViewTemplates` | ✓ | ✓ | ✓ | ✗ | ✓ |
| `canTestNotifications` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `canUploadMedia` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `canViewMedia` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `canManageStorage` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `canViewReports` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `canGenerateReports` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `canManageApiKeys` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `canViewAuditLogs` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `canAccessPlatformSettings` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `canEditProfile` | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## A2.6 Sidebar / Navbar Matrix

### Sidebar Items by Role

| Section | Item | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|---|
| Overview | Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Platform | Companies | ✓ | ✗ | ✗ | ✗ | ✗ |
| Platform | Channels | ✓ | ✗ | ✗ | ✗ | ✗ |
| Platform | Providers | ✓ | ✗ | ✗ | ✗ | ✗ |
| My Company | Credentials | ✗ | ✓ | ✓ | ✗ | ✗ |
| My Company | Templates | ✗ | ✓ | ✓ | ✗ | ✗ |
| My Company | Domain Catalogue | ✗ | ✓ | ✓ | ✗ | ✗ |
| My Company | Event Catalogue | ✗ | ✓ | ✓ | ✗ | ✗ |
| Users | Team | ✓ | ✓ | ✓ | ✗ | ✗ |
| Operations | Notification Testing | ✗ | ✗ | ✗ | ✓ | ✗ |
| Content | Templates (read) | ✗ | ✗ | ✗ | ✗ | ✓ |
| Reports & Files | Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports & Files | Media | ✓ | ✓ | ✓ | ✓ | ✗ |
| Reports & Files | Storage | ✓ | ✓ | ✓ | ✗ | ✗ |
| Admin | Users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Admin | API Keys | ✓ | ✗ | ✗ | ✗ | ✗ |
| Admin | Audit Logs | ✓ | ✗ | ✗ | ✗ | ✗ |
| Settings | Profile | ✓ | ✓ | ✓ | ✓ | ✓ |

**Note:** `company_owner` has Credentials, Templates, Domain Catalogue, Event Catalogue under "My Company" AND has access to /notifications/test (accessible via the testing module, even if not in sidebar — or can be added to sidebar). Based on allowed pages, company_owner CAN access /notifications/test, so it should appear in their sidebar.

**Corrected sidebar for company_owner:**
```
Overview → Dashboard
My Company → Credentials, Templates, Domain Catalogue, Event Catalogue
Operations → Notification Testing
Users → Team
Reports & Files → Reports, Media, Storage
Settings → Profile
```

### Navbar by Role

| Element | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| Company name | ✗ | ✓ | ✓ | ✓ | ✓ |
| Role badge | "Platform Admin" | "Owner" | "Company Admin" | "Operator" | "Viewer" |
| Environment badge | ✓ | ✗ | ✗ | ✗ | ✗ |
| Company switcher | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## A2.7 API Access Matrix

| Endpoint | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| `POST /auth/register` | public | public | public | public | public |
| `POST /auth/login` | public | public | public | public | public |
| `GET /users` | ✓ all | ✓ own co. | ✓ own co. | 403 | 403 |
| `POST /users/invite` | ✓ any | ✓ admin/op/viewer | ✓ op/viewer | 403 | 403 |
| `PATCH /users/:id` | ✓ | ✓ own co. | ✓ op/viewer in own co. | 403 | 403 |
| `DELETE /users/:id` | ✓ | ✓ own co. | 403 | 403 | 403 |
| `GET /companies` | ✓ all | 403 | 403 | 403 | 403 |
| `POST /companies` | ✓ | 403 | 403 | 403 | 403 |
| `GET /companies/:id` | ✓ any | ✓ own | 403 | 403 | 403 |
| `PATCH /companies/:id` | ✓ any | ✓ own | 403 | 403 | 403 |
| `DELETE /companies/:id` | ✓ | 403 | 403 | 403 | 403 |
| `GET /channels` | ✓ | 403 | 403 | 403 | 403 |
| `POST /channels` | ✓ | 403 | 403 | 403 | 403 |
| `GET /providers` | ✓ | 403 | 403 | 403 | 403 |
| `POST /providers` | ✓ | 403 | 403 | 403 | 403 |
| `GET /provider-credentials` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `POST /provider-credentials` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `GET /domain-catalogue` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `POST /domain-catalogue` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `GET /event-catalogue` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `POST /event-catalogue` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `GET /layout-templates` | ✓ | ✓ own co. | ✓ own co. | 403 | ✓ own co. (read) |
| `POST /layout-templates` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `PATCH /layout-templates/:id` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `POST /notifications/test` | ✓ | ✓ own co. | ✓ own co. | ✓ own co. | 403 |
| `GET /files/media` | ✓ | ✓ own co. | ✓ own co. | ✓ own co. | 403 |
| `POST /files/media` | ✓ | ✓ own co. | ✓ own co. | ✓ own co. | 403 |
| `GET /files/reports` | ✓ | ✓ own co. | ✓ own co. | ✓ own co. | ✓ own co. |
| `GET /files/storage` | ✓ | ✓ own co. | ✓ own co. | 403 | 403 |
| `GET /api-keys` | ✓ | ✓ own co. | 403 | 403 | 403 |
| `POST /api-keys` | ✓ | ✓ own co. | 403 | 403 | 403 |
| `GET /audit-logs` | ✓ | ✓ own co. | 403 | 403 | 403 |

---

## A2.8 User Creation Lifecycle Matrix

> **Revised 2026-06-28 per DEC-009 Rev-2, DEC-013 Rev-1, DEC-014 Rev-1.** `company_owner` is no longer creatable via `POST /users/invite`. All invitation emails now go through the Notification Engine (not PlatformMailService). Email verification gates login for public-registration users.

| Initiator | Method | Target role | Constraint | `isEmailVerified` | `mustChangePassword` |
|---|---|---|---|---|---|
| (public) | `POST /auth/register` | `company_owner` | Creates company + provisions assets atomically. No tokens returned. Triggers `security.company_verify_email`. | `false` — must verify before login | `false` |
| `platform_admin` | `POST /companies/with-owner` | `company_owner` | **Only permitted path for company_owner.** Creates company + provisions assets atomically. Triggers `security.company_user_invitation`. | `true` — admin-vouched | `true` |
| `platform_admin` | `POST /users/invite` | `platform_admin` | Inherits platform company. Triggers `security.company_user_invitation` via platform company. | `true` — admin-vouched | `true` |
| `platform_admin` | `POST /users/invite` | `company_owner` | **403 — use `POST /companies/with-owner` instead** | — | — |
| `platform_admin` | `POST /users/invite` | `company_admin` | **403 — forbidden (company autonomy)** | — | — |
| `platform_admin` | `POST /users/invite` | `operator` | **403 — forbidden (company autonomy)** | — | — |
| `platform_admin` | `POST /users/invite` | `viewer` | **403 — forbidden (company autonomy)** | — | — |
| `company_owner` | `POST /users/invite` | `company_admin` | Own `companyId` enforced. Triggers `security.company_user_invitation`. | `true` | `true` |
| `company_owner` | `POST /users/invite` | `operator` | Own `companyId` enforced. Triggers `security.company_user_invitation`. | `true` | `true` |
| `company_owner` | `POST /users/invite` | `viewer` | Own `companyId` enforced. Triggers `security.company_user_invitation`. | `true` | `true` |
| `company_owner` | `POST /users/invite` | `company_owner` | **403 — forbidden** | — | — |
| `company_owner` | `POST /users/invite` | `platform_admin` | **403 — forbidden** | — | — |
| `company_admin` | `POST /users/invite` | `operator` | Own `companyId` enforced. Triggers `security.company_user_invitation`. | `true` | `true` |
| `company_admin` | `POST /users/invite` | `viewer` | Own `companyId` enforced. Triggers `security.company_user_invitation`. | `true` | `true` |
| `company_admin` | `POST /users/invite` | `company_owner` | **403 — forbidden** | — | — |
| `company_admin` | `POST /users/invite` | `company_admin` | **403 — forbidden** | — | — |
| `company_admin` | `POST /users/invite` | `platform_admin` | **403 — forbidden** | — | — |
| `operator` | `POST /users/invite` | any | **403 — forbidden** | — | — |
| `viewer` | `POST /users/invite` | any | **403 — forbidden** | — | — |

---

## A2.9 Required Test Scenarios Per Role

### `platform_admin`

| # | Scenario | Expected |
|---|---|---|
| PA-01 | POST /auth/login with platform_admin credentials | 200, JWT.role=platform_admin, JWT.scope=global, JWT.companyId=null |
| PA-02 | GET /companies with platform_admin token | 200, returns all companies |
| PA-03 | POST /companies with platform_admin token | 201, company created |
| PA-04 | GET /users with platform_admin token | 200, returns users across all companies |
| PA-05 | Navigate to /companies | Accessible, shows company list |
| PA-06 | Navigate to /channels | Accessible |
| PA-07 | Navigate to /providers | Accessible |
| PA-08 | POST /auth/register with any data | Does NOT create platform_admin |
| PA-09 | POST /users/invite with role=platform_admin | 403 |
| PA-10 | Navbar shows "Platform Admin" badge | Verified visually |
| PA-11 | Navbar shows environment badge | Verified visually |
| PA-12 | Navbar does NOT show company name | Verified visually |
| PA-13 | Sidebar has Platform section (Companies, Channels, Providers) | Verified visually |

### `company_owner`

| # | Scenario | Expected |
|---|---|---|
| CO-01 | POST /auth/register with companyName | 201, user.role=company_owner, company created |
| CO-02 | POST /auth/login after verify | 200, JWT.scope=company, JWT.companyId≠null |
| CO-03 | GET /users | 200, only own company's users |
| CO-04 | POST /users/invite role=company_admin | 201 |
| CO-05 | POST /users/invite role=operator | 201 |
| CO-06 | POST /users/invite role=viewer | 201 |
| CO-07 | POST /users/invite role=company_owner | 403 |
| CO-08 | POST /users/invite role=platform_admin | 403 |
| CO-09 | GET /companies | 403 |
| CO-10 | GET /companies/:ownId | 200 |
| CO-11 | GET /companies/:otherId | 403 |
| CO-12 | Navigate to /companies | Redirected to /dashboard |
| CO-13 | Navigate to /channels | Redirected to /dashboard |
| CO-14 | Navigate to /providers | Redirected to /dashboard |
| CO-15 | Navbar shows company name and "Owner" badge | Verified visually |
| CO-16 | No env badge in navbar | Verified visually |

### `company_admin`

| # | Scenario | Expected |
|---|---|---|
| CA-01 | POST /auth/login | 200, JWT.role=company_admin, JWT.scope=company |
| CA-02 | GET /users | 200, own company only |
| CA-03 | POST /users/invite role=operator | 201 |
| CA-04 | POST /users/invite role=viewer | 201 |
| CA-05 | POST /users/invite role=company_owner | 403 |
| CA-06 | POST /users/invite role=company_admin | 403 |
| CA-07 | POST /users/invite role=platform_admin | 403 |
| CA-08 | GET /companies/:id | 403 |
| CA-09 | GET /api-keys | 403 |
| CA-10 | GET /audit-logs | 403 |
| CA-11 | Navigate to /companies | Redirected to /dashboard |
| CA-12 | Navigate to /api-keys | Redirected to /dashboard |
| CA-13 | Navigate to /audit-logs | Redirected to /dashboard |
| CA-14 | Navbar shows "Company Admin" badge | Verified visually |

### `operator`

| # | Scenario | Expected |
|---|---|---|
| OP-01 | POST /auth/login | 200, JWT.role=operator, JWT.scope=company |
| OP-02 | GET /users | 403 |
| OP-03 | POST /users/invite | 403 |
| OP-04 | POST /notifications/test | 200 |
| OP-05 | GET /files/reports | 200 |
| OP-06 | GET /files/media | 200 |
| OP-07 | GET /provider-credentials | 403 |
| OP-08 | Navigate to /users | Redirected to /dashboard |
| OP-09 | Navigate to /companies | Redirected to /dashboard |
| OP-10 | Navigate to /layout-templates | Redirected to /dashboard |
| OP-11 | Sidebar has no Team section | Verified visually |
| OP-12 | No Invite button visible anywhere | Verified visually |
| OP-13 | Navbar shows "Operator" badge | Verified visually |

### `viewer`

| # | Scenario | Expected |
|---|---|---|
| VI-01 | POST /auth/login | 200, JWT.role=viewer, JWT.scope=company |
| VI-02 | GET /users | 403 |
| VI-03 | POST /users/invite | 403 |
| VI-04 | POST /notifications/test | 403 |
| VI-05 | GET /layout-templates | 200 (read-only) |
| VI-06 | POST /layout-templates | 403 |
| VI-07 | PATCH /layout-templates/:id | 403 |
| VI-08 | GET /files/reports | 200 |
| VI-09 | GET /files/media | 403 |
| VI-10 | Navigate to /users | Redirected to /dashboard |
| VI-11 | Navigate to /notifications/test | Redirected to /dashboard |
| VI-12 | Navigate to /provider-credentials | Redirected to /dashboard |
| VI-13 | Sidebar shows only Dashboard, Templates, Reports, Profile | Verified visually |
| VI-14 | No create/edit/delete actions visible on Templates page | Verified visually |
| VI-15 | Navbar shows "Viewer" badge | Verified visually |

---

## A2.10 Contradictions and Gaps Found in Current Implementation

| ID | Type | Description | Location | Resolution |
|---|---|---|---|---|
| CONT-001 | Contradiction | `Routes.md` and `Architecture.md` list `/companies` as accessible to `company_owner`. The QA test and UX.md sidebar design (no Companies link for owner) contradict this. | `Routes.md §2.2`, `Architecture.md §7` | `/companies` (list) is `platform_admin` only. `company_owner` accesses `/companies/:id` for their own company only. Routes.md and Architecture.md must be corrected. |
| CONT-002 | Contradiction | `API.md §2` defines `/auth/register` body as `{ email, password, firstName, lastName }` — no `companyName`. But BR-001/BR-002 require registration to create both a `company_owner` and a company atomically. | `API.md §2` | Add `companyName` (required) and optionally `companyKey` to the register body. Update API.md. |
| CONT-003 | Gap | After registration, the frontend must redirect to `/auth/login?registered=true`. The QA run confirmed the URL stays at `/auth/register?companyName=...&...` (form data appended as query params). The submit handler is not triggering navigation. | `communications-front/app/(auth)/auth/register/page.tsx` | Registration submit handler must call `router.push('/auth/login?registered=true')` on API success. |
| CONT-004 | Gap | The QA script's `dbRun` shell helper breaks under Node.js v24 because `$set` is consumed by shell variable expansion inside `node -e "..."`. The `\\$set` escaping in the template produces `\$set` which the shell expands to `\` + `$set` (empty var) = `\:`. | `qa_rbac_test.mjs` | Not an application bug. Script bug. |
| CONT-005 | Gap | `company_admin` invite restrictions are enforced on the frontend (invite dialog), but must also be enforced server-side in the `POST /users/invite` handler. Current server-side validation status is unconfirmed. | `communications-backend/src/platform/users/users.service.ts` | Backend must validate that inviting user's role is authorised to assign the target role. |
| CONT-006 | Gap | `company_owner` sidebar in `UX.md §3.3` omits Notification Testing, but the route compatibility matrix grants `company_owner` access to `/notifications/test`. The sidebar is incomplete. | `UX.md §3.3` | Add Notification Testing to `company_owner` sidebar under an "Operations" section. |
| CONT-007 | Gap | `G-009`: Routes are currently flat (`/companies`, `/dashboard`) but DEC-004 A1 references them as `/portal/companies`, `/portal/dashboard`. The `allowedRoutes` in `role-config.ts` must reflect the actual paths in use until the namespace is standardised. | `Routes.md`, `Architecture.md` | Until G-009 is resolved, use flat paths in `allowedRoutes`. Document clearly that the `/portal/` prefix is aspirational. |
| CONT-008 | Gap | `SM-002`: `derivePermissions` in `types/permissions.ts` still references `company_user` (removed role) and must be replaced by `role-config.ts`. This is a latent runtime bug if any code path reaches `derivePermissions('company_user')`. | `communications-front/types/permissions.ts` | Remove `derivePermissions`. All permission lookups go through `getPermissions(role)` from `role-config.ts`. |
| CONT-009 | Gap | No `403` / access-denied feedback exists. Unauthorized route navigation silently redirects to the landing page with no user feedback. | `Routes.md`, `UX.md` | Implement a brief toast or inline message before redirect (ROUTE-003). |
| CONT-010 | Gap | `company_admin` invitation: DEC-004 A1 §6.2 says "company_admin cannot create a company_owner or another company_admin." The user spec confirms this. However the QA script only tests that company_admin cannot invite company_owner (checked) and platform_admin (checked) — it does NOT test that company_admin cannot invite another company_admin. This test scenario is missing. | `qa_rbac_test.mjs` | Add test CA-06 to verify that company_admin cannot invite another company_admin. |
| CONT-011 | Correction | A3 (2026-06-23): Any backend code that checks `if (authContext.companyId === null)` to detect global access is now incorrect. `platform_admin` has a non-null `companyId`. | Backend guards / services | Replace `companyId === null` checks with `scope === 'global'`. See Amendment A3. |
| CONT-012 | Correction | A3 (2026-06-23): DEC-010 §4.3 `MailResolverService` has condition `OR params.companyId is null` as part of the platform sender check. This branch is now dead code since platform_admin has non-null companyId. The `senderCredentialScope === 'platform'` condition remains the correct primary discriminator. | `communications-backend/src/infrastructure/platform-mail/mail-resolver.service.ts` | Remove `OR params.companyId is null` when next touching this service. |

---

---

# Amendment A3 — Platform Operator Company Model (2026-06-23)

This amendment **supersedes BR-004** and updates all sections that assumed `platform_admin.companyId === null`. All other A1 and A2 content remains valid.

---

## A3.1 Motivation

DEC-004 A2 BR-004 required that `platform_admin` have `companyId = null`. This was based on the assumption that platform admins are "above" all companies and need no company association.

That assumption fails when the platform needs to send outbound communication (invitation emails to new company owners, system notifications). These credentials need a company owner. DEC-010 §4 worked around this with `PLATFORM_SMTP_*` env vars — a parallel credential system that bypasses the `provider_credentials` collection used by all tenant companies. This inconsistency is corrected here.

**The fix:** Give the platform its own company record — Grapifly — and associate all `platform_admin` users with it.

---

## A3.2 Grapifly — The Platform Operator Company

A dedicated company is created once at database bootstrap, before any user accounts:

| Field | Value |
|---|---|
| `displayName` | `Grapifly` |
| `companyKey` | `grapifly` |
| `isPlatformCompany` | `true` (or equivalent discriminator field) |

This company is never created via `POST /auth/register` or `POST /companies`. It is a seeded, system-owned record.

---

## A3.3 Updated Role / Scope Mapping

| Role | Scope | companyId | companyKey | Access level |
|---|---|---|---|---|
| `platform_admin` | `global` | `<grapifly._id>` | `grapifly` | Cross-company — no companyId filter |
| `company_owner` | `company` | required | required | Own company only |
| `company_admin` | `company` | required | required | Own company only |
| `operator` | `company` | required | required | Own company only |
| `viewer` | `company` | required | required | Own company only |

---

## A3.4 Corrected Business Rules

> ⚠️ **BR-004 validation rule further refined by DEC-007 (2026-06-23).** The `companyKey === 'grapifly'` check is replaced by `isPlatformCompany === true` lookup. See DEC-007.

| Rule ID | Old text (A2) | A3 text | DEC-007 refinement |
|---|---|---|---|
| BR-004 | `platform_admin` must never have `companyId` or `companyKey` — any non-null value is invalid | `platform_admin` must have `companyId = <grapifly._id>` and `companyKey = 'grapifly'`. Null is **invalid**. | `platform_admin.companyId` must reference the company where `isPlatformCompany === true`. No hardcoded key string permitted. |

All other business rules (BR-001 through BR-003, BR-005 through BR-010) remain unchanged.

---

## A3.5 Access Control — Canonical Rule

Access level is determined by **`scope`**, not by `companyId`:

```
scope === 'global'  → cross-company access; JWT.companyId is present but NOT used as a data filter
scope === 'company' → own-company access only; JWT.companyId MUST be applied as a filter on all queries
```

**The following pattern is now incorrect and must be replaced everywhere in the backend:**

```typescript
// WRONG — companyId is no longer null for platform_admin
if (authContext.companyId === null) {
  // global access logic
}

// CORRECT — use scope
if (authContext.scope === 'global') {
  // global access logic
}
```

---

## A3.6 Updated Backend Validation Rule (replaces §5.1 for platform_admin)

> ⚠️ **Refined by DEC-007 (2026-06-23).** The `companyKey === 'grapifly'` check is replaced by an `isPlatformCompany === true` lookup.

```
IF role === 'platform_admin':
  companyId   MUST reference the company where isPlatformCompany === true — null is INVALID
  companyKey  MUST match that company's companyKey                        — null is INVALID
  scope       MUST be 'global'

IF role IN ('company_owner', 'company_admin', 'operator', 'viewer'):
  companyId   MUST be non-null and reference an existing tenant company (NOT Grapifly)
  companyKey  MUST be non-null and match that company's key
  scope       MUST be 'company'
```

---

## A3.7 Updated Seed Bootstrap Order

> **Refined by DEC-007 (2026-06-23).** Bootstrap now uses `isPlatformCompany: true` lookup. See DEC-011 §2.5 for the full bootstrap sequence.

```
1. findOne({ isPlatformCompany: true })
   IF not found: INSERT { displayName: 'Grapifly', companyKey: 'grapifly', isPlatformCompany: true, isActive: true }

2. Seed platform admin user:
   { email: process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL, role: 'platform_admin', scope: 'global',
     companyId: <platformCompany._id>, companyKey: <platformCompany.companyKey> }
```

`UsersBootstrapService` must ensure the platform company exists before creating or updating the seed admin.

---

## A3.8 Platform Credentials

Platform-level SMTP credentials (for invitations to company owners and system emails) are now stored in `provider_credentials` under `companyId = <grapifly._id>`, using the same structure as tenant credentials.

This supersedes the `PLATFORM_SMTP_*` env var approach from DEC-010 §4. The `PlatformMailService` must be updated to resolve Grapifly's credentials from the database rather than from environment variables.

Fallback behaviour (no configured Grapifly SMTP → env vars) may be retained during the transition period but should be documented as deprecated.

---

## A3.10 Implementation Status (2026-06-23)

| Item | Status | Notes |
|---|---|---|
| `UserRole` and `UserScope` types defined and exported from `user.schema.ts` | ✅ Done | Single definition; re-exported from `auth-context.types.ts` for security-layer consumers |
| `AuthContext` extended with `role?`, `scope?`, `companyId?`, `companyKey?` | ✅ Done | `organizationId` retained as `@deprecated` until `GlobalAuthGuard` / `JwtStrategy` are migrated to emit the new JWT payload |
| `User` schema includes `role`, `scope`, `companyId`, `companyKey`, `isActive` props | ✅ Done | Indexes added: `role` (sparse), `companyId` (sparse), `isActive` (sparse) |
| `Company` schema has `isPlatformCompany: Boolean (default: false)` with unique partial index | ✅ Done | `src/communication/company/company-info/schemas/company.schema.ts` — index enforces at most one platform company (DEC-007 / ADR-005) |
| `UsersBootstrapService` registered in `UsersModule` and runs at startup | ✅ Done | Added to `UsersModule.providers`; injects both `UserModel` and `CompanyModel` |
| `UsersBootstrapService` creates platform company then seeds platform_admin with correct companyId | ✅ Done | Phase 1: `findOne({ isPlatformCompany: true })` → create if missing. Phase 2: create or patch `admin@grapifly.com` with `companyId = <grapifly._id>`, `companyKey = 'grapifly'` |
| `PlatformMailService.sendInvitation()` implemented | ✅ Done | Delegates to existing `inviteUserHtml` / `inviteUserSubject` templates and the private `send()` method; `MailResolverService` call sites now type-check |
| `POST /auth/login` response `user` object includes `role`, `scope`, `companyId`, `companyKey`, `isActive`, `isEmailVerified` | ✅ Done | `UserResponseDto.from()` now maps all fields. Confirmed via live login test: `role: "platform_admin"`, `companyId: <grapifly._id>` |
| `npm run build` passes with 0 TypeScript errors | ✅ Done | Verified after bootstrap implementation and UserResponseDto fix |
| `GlobalAuthGuard` / `JwtStrategy` emit full JWT payload (`role + scope + companyId + companyKey`) | ⏳ Pending | Still emit `organizationId` from old payload shape; needs migration when `AuthService.login()` is updated. **Workaround in place:** `GET /users` and `GET /users/me` resolve company context from DB (actor lookup by `userId`) instead of JWT claims. This is removed once JWT migration lands. |
| `npm test` — controller/service stubs | ⏳ Pending | 67 pre-existing failures: `controller.X is not a function` — unimplemented stub methods, not related to type fixes |
| Role-based guards functionally enforce role at runtime | ⏳ Pending | `RolesGuard` will work once JWT carries `role`; types are in place |
| User invitation flow (`POST /users/invite`) fully implemented | ⏳ Pending | DEC-008 §6; invitation types and schema are correct; service + controller stubs remain |

---

## A3.9 Updated Test Scenarios for `platform_admin`

Replace or augment A2.9 PA-01, PA-10, PA-11 with:

| # | Scenario | Expected |
|---|---|---|
| PA-01 | POST /auth/login with platform_admin credentials | 200; `JWT.role=platform_admin`; `JWT.scope=global`; `JWT.companyId=<grapifly._id>`; `JWT.companyKey='grapifly'` |
| PA-14 | JWT.companyId for platform_admin | Equals Grapifly company ObjectId — never null |
| PA-15 | GET /companies with platform_admin token | 200, returns ALL companies including Grapifly |
| PA-16 | Platform_admin backend guard | Access granted by `scope === 'global'`; NOT by `companyId === null` |
| PA-17 | Create platform_admin with companyId null | Backend returns 400 |
| PA-18 | Create platform_admin with non-Grapifly companyId | Backend returns 400 |
