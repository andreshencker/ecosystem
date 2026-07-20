# Backend Security Architecture

| Field | Value |
|---|---|
| Last Updated | 2026-06-23 |
| Governs | `communications-backend` |
| Decision baseline | [DEC-008 — User, Company and Role Lifecycle](../Decisions/DEC-008-User-Company-Role-Lifecycle.md) |

> **Migration note (2026-06-23):** Merged from project `docs/Backend/Security.md` (2026-06-15) and vault `Modules/Communication/Backend/Security.md` (2026-06-14). Vault's RBAC Gap Report, encryption detail, CORS, and decorator sections have been integrated. BR-004 updated per DEC-008 Amendment A3.

---

## 1. Authentication Methods

The service supports two authentication mechanisms. Each request is authenticated by one or the other.

### 1.1 JWT Bearer Token (human users)

The backend uses a **dual-token** authentication scheme:

| Token | Storage | TTL | Purpose |
|---|---|---|---|
| Access token (JWT) | Memory / Authorization header | 15 min | Authorizes API requests |
| Refresh token (opaque) | HttpOnly cookie or localStorage | 7 days | Obtains new access tokens |

Refresh tokens are stored in MongoDB as SHA-256 hashes. The raw token is never persisted.

```
Authorization: Bearer <access_token>
```

#### JWT Payload Contract (DEC-008 A1)

```ts
{
  sub:        string;           // User ObjectId
  role:       UserRole;         // 'platform_admin' | 'company_owner' | 'company_admin' | 'operator' | 'viewer'
  scope:      Scope;            // 'global' | 'company'
  companyId:  string | null;    // platform company _id for platform_admin; tenant _id for others
  companyKey: string | null;    // 'grapifly' for platform_admin; tenant key for others
  type:       'access';
}
```

All five identity fields are embedded in the token to avoid a database lookup on every request.

#### Refresh Token Rotation

Each use of a refresh token revokes the old token and issues a new pair. If a revoked token is presented, **all sessions for that user are immediately revoked** (reuse-attack response).

---

### 1.2 API Key (service-to-service)

Used for machine-to-machine calls from other backend services.

```
x-api-key: <COMMUNICATION_API_KEY>
```

- The key is a static secret set via the `COMMUNICATION_API_KEY` environment variable
- Validated by `ApiKeyAuthGuard` in `src/infrastructure/security/`
- Must be rotated by updating the env var and redeploying — no database record
- Full scoped API key guard deferred to a later phase (see [TD-001](../TechnicalDebt/Backend/Open/TD-001-Api-Key-Auth-Guard-Stub.md))

---

## 2. Authorization Model

### 2.1 Global Auth Guard

`GlobalAuthGuard` is applied to **all routes** by default via the NestJS `APP_GUARD` provider.

To allow unauthenticated access to a route, decorate it with `@Public()`:

```typescript
@Public()
@Post('login')
async login() { ... }
```

Public endpoints: `POST /auth/register`, `GET /auth/verify-email`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /health`.

### 2.2 AuthContext

Every authenticated request carries an `AuthContext` on `request.authContext`:

```ts
interface AuthContext {
  actorType:   'user' | 'apikey';
  userId?:     string;
  role?:       UserRole;
  scope?:      UserScope;
  companyId?:  string | null;
  companyKey?: string | null;
  keyId?:      string;
  /** @deprecated — retained for backward compatibility while GlobalAuthGuard and
   *  JwtStrategy are migrated to emit the full DEC-008 A1 JWT payload shape.
   *  Use companyId/companyKey instead. */
  organizationId?: string;
}
```

> **Implementation status (2026-06-23):** Types (`role`, `scope`, `companyId`, `companyKey`) are defined and exported. `GlobalAuthGuard` and `JwtStrategy` still populate `organizationId` from the legacy JWT payload; they will be updated when the auth service is migrated to issue the full DEC-008 A1 token shape (`role + scope + companyId + companyKey` in the JWT). Until then, `role`, `scope`, `companyId`, and `companyKey` are optional and may be `undefined` at runtime — guards that depend on them will function once the JWT issuance is updated.

### 2.3 Guard Stack

```
GlobalAuthGuard (always runs)
  └── validates access token or API key
  └── populates AuthContext

RolesGuard (applied per-controller or per-route)
  └── checks AuthContext.role against @Roles() decorator

ScopeGuard (applied where company isolation is needed)
  └── checks AuthContext.companyId matches resource owner
```

### 2.4 Request Decorators

| Decorator | Location | Purpose |
|---|---|---|
| `@Public()` | `src/infrastructure/security/decorators/` | Mark a route as unauthenticated |
| `@CurrentUser()` | `src/infrastructure/security/decorators/` | Inject the authenticated user from JWT |
| `@CurrentOrg()` | `src/infrastructure/security/decorators/` | Inject the current organisation context |

### 2.5 Company Isolation

For all company-scoped roles, the backend must verify that the requested resource belongs to the actor's `companyId`. A `company_admin` must not be able to read or modify another company's data even with a valid JWT.

Isolation rule: `resource.companyId === authContext.companyId`

`platform_admin` (scope `global`) bypasses this check — access is determined by `authContext.scope === 'global'`, **never** by `authContext.companyId === null` (which is no longer valid since platform_admin has a non-null companyId per DEC-008 A3).

---

## 3. Role / Scope Validation

When creating or updating a user, the service layer enforces:

```
platform_admin  → scope='global',  companyId = isPlatformCompany company _id, companyKey = that company's key
company roles   → scope='company', companyId ≠ null (tenant company), companyKey ≠ null
```

Failure returns **HTTP 400**. See [DEC-008 §5](../Decisions/DEC-008-User-Company-Role-Lifecycle.md#5-backend-validation-rules) for the full rule set.

---

## 4. Provider Credential Encryption

Third-party provider credentials (API keys, SMTP passwords, OAuth tokens, AWS access keys) are never stored in plaintext.

**Algorithm:** AES-256-GCM (authenticated encryption)
**Master key:** `CREDENTIALS_MASTER_KEY_BASE64` — must decode to exactly 32 bytes

Generate a new master key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Encryption envelope stored per credential set:**

| Field | Description |
|---|---|
| `alg` | Always `aes-256-gcm` |
| `ivBase64` | Initialisation vector (base64) |
| `tagBase64` | GCM authentication tag (base64) |
| `dataBase64` | Ciphertext (base64) |

Credentials are never returned in plaintext via any API response. `ALLOW_DEBUG_DECRYPTED` must be `false` in production.

---

## 5. Password Security

- Passwords are hashed with **bcryptjs** before storage. The raw password is never persisted or logged.
- Password reset and email verification tokens are SHA-256 hashed before storage.
- Raw tokens are only transmitted once (via email link) and never stored.
- A password change or reset revokes **all** active refresh token sessions for the user.

### 5.1 `mustChangePassword` Field

| Creation path | `mustChangePassword` at creation |
|---|---|
| Public registration (`POST /auth/register`) | `false` — user chose their password |
| Admin invitation (`POST /users/invite` or `POST /companies/with-owner`) | `true` — system generated temp password; forced change on first login |

### 5.2 Email Verification Gate

`POST /auth/login` enforces `isEmailVerified` as a hard gate:

| `isEmailVerified` | `mustChangePassword` | Login result |
|---|---|---|
| `false` | any | **403 EMAIL_NOT_VERIFIED** — applies only to public registration users |
| `true` | `false` | JWT issued → landing page |
| `true` | `true` | JWT issued → forced redirect to `/auth/change-password` |

Invited users always have `isEmailVerified = true` — the email verification gate never affects them.

---

## 6. Invitation Notification Delivery

All invitation notifications are delivered through the **Notification Engine** (`NotificationService.notifyEvent()`), never through PlatformMailService directly. See DEC-013 §4.2 and DEC-019 for the full delivery architecture.

The Notification Engine resolves credentials from the **company associated with the notification's `companyId`**:

| Invitation source | `companyId` used | Credentials |
|---|---|---|
| `POST /users/invite` — `platform_admin` invites `platform_admin` | Platform company ID | Platform company credentials |
| `POST /companies/with-owner` — creates `company_owner` | New company ID | New company credentials (provisioned at creation) |
| `POST /users/invite` — `company_owner` or `company_admin` invites | Actor's own `companyId` | That company's credentials |

There is no global credential fallback. Companies without configured credentials receive `emailDelivered: false` until credentials are configured.

---

## 7. CORS

Cross-origin requests are restricted to origins listed in the `ALLOWED_ORIGINS` environment variable (comma-separated).

```
ALLOWED_ORIGINS=https://dashboard.example.com,https://app.example.com
```

---

## 8. Rate Limiting & Hardening

- Auth endpoints (`/auth/login`, `/auth/register`, `/auth/forgot-password`) should be rate-limited.
- Login responses never reveal whether an email exists; both "wrong email" and "wrong password" return the same error (`Invalid credentials`).
- Logout is idempotent; no error is returned for already-revoked tokens.

---

## 9. Ten Business Rules (DEC-008 A2, updated by A3)

| # | Rule | Enforcement point |
|---|---|---|
| BR-001 | Public registration always creates `company_owner` | `/auth/register` handler |
| BR-002 | Public registration creates a company atomically with the user | `/auth/register` handler |
| BR-003 | Public registration never creates `platform_admin` | `/auth/register` handler (hard-coded role) |
| **BR-004** | **`platform_admin` must have `companyId` = platform company `_id` (where `isPlatformCompany === true`). Null is invalid.** | User creation validator (HTTP 400) |
| BR-005 | All company roles always have non-null `companyId` and `companyKey` | User creation validator (HTTP 400) |
| BR-006 | No fallback may convert a missing role into `platform_admin` | JWT strategy — reject token if role missing |
| BR-007 | Missing or invalid role fails safely | JWT strategy → 401; creation validator → 400 |
| BR-008 | Sidebar visibility is not authorization | Backend enforces all restrictions independently |
| BR-009 | Backend enforces all role permissions independently | Every route guarded by RolesGuard + ScopeGuard |
| BR-010 | `role-config.ts` is frontend-only; backend has its own enforcement | Backend never reads frontend config |

> **BR-004 updated by DEC-008 A3 (2026-06-23):** The original A2 rule stated `platform_admin must never have companyId`. This was superseded. `platform_admin` now has `companyId` pointing to the platform company (`isPlatformCompany === true`). Access level is still governed by `scope: 'global'`.

---

## 10. Backend Permission Enforcement by Role

### 10.1 User Management

| Operation | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| GET /users | All users | Own company | Own company | 403 | 403 |
| POST /users/invite (company_owner) | ✓ | 403 | 403 | 403 | 403 |
| POST /users/invite (company_admin) | ✓ | ✓ | 403 | 403 | 403 |
| POST /users/invite (operator) | ✓ | ✓ | ✓ | 403 | 403 |
| POST /users/invite (viewer) | ✓ | ✓ | ✓ | 403 | 403 |
| POST /users/invite (platform_admin) | 403 (via API; seed only) | 403 | 403 | 403 | 403 |
| PATCH /users/:id | ✓ | ✓ own co. | op/viewer own co. only | 403 | 403 |
| DELETE /users/:id | ✓ | ✓ own co. | 403 | 403 | 403 |

### 10.2 Company Management

| Operation | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| GET /companies | All | 403 | 403 | 403 | 403 |
| POST /companies | ✓ | 403 | 403 | 403 | 403 |
| GET /companies/:id | Any | Own only | 403 | 403 | 403 |
| PATCH /companies/:id | Any | Own only | 403 | 403 | 403 |
| DELETE /companies/:id | ✓ (not platform company) | 403 | 403 | 403 | 403 |

### 10.3 Company Data Visibility

| Role | Data filter applied |
|---|---|
| `platform_admin` | No filter — scope `global`; `authContext.scope === 'global'` check (never `companyId === null`) |
| `company_owner` | `companyId = authContext.companyId` on all queries |
| `company_admin` | `companyId = authContext.companyId` on all queries |
| `operator` | `companyId = authContext.companyId` on permitted endpoints only |
| `viewer` | `companyId = authContext.companyId` on permitted endpoints only |

---

## 11. RBAC Gap Report (from Audit 2026-06-14)

> Historical reference. Most gaps resolved in Sprint-001 and subsequent sprints. See [Backend Audit 2026-06-14](../Audits/Backend-Audit-2026-06-14.md) for full context.

| Gap ID | Feature | Priority | Status |
|---|---|---|---|
| GAP-1 | `role` + `companyId` / `companyKey` on User schema | P0 | Resolved |
| GAP-2 | `role` + `companyId` in auth response (login, refresh) | P0 | Resolved |
| GAP-3 | JWT payload contains role | P1 | Resolved |
| GAP-4 | Communication endpoints accept JWT Bearer tokens | **P0 — Critical** | Resolved |
| GAP-5 | `/auth/me` returns full user profile | P1 | Resolved |
| GAP-6 | Default role assigned on register | P2 | Resolved |
| — | `RolesGuard` / `@Roles()` decorator | P1 | Resolved |
| — | Company-scoped resource filtering for non-admin users | P1 | Resolved |

---

## 12. Security Gaps (open)

| # | Gap |
|---|---|
| SEC-001 | Rate limiting on auth endpoints not yet implemented |
| SEC-002 | JWT blocklist (logout before token expiry) not yet implemented |
| SEC-003 | API key rotation / expiry policy not yet defined |
| SEC-004 | Audit log of auth events not yet implemented |
| SEC-005 | `POST /users/invite` role authority validation server-side status unconfirmed (CONT-005 in DEC-008) |
| SEC-006 | Company isolation on `GET /companies/:id` for `company_owner` — implementation status unconfirmed |

---

## Related

- [Backend Architecture](./Architecture.md) — SecurityModule and GlobalAuthGuard wiring
- [Backend Environment](./Environment.md) — `JWT_*`, `COMMUNICATION_API_KEY`, `CREDENTIALS_MASTER_KEY_BASE64`, `ALLOWED_ORIGINS`
- [Backend API](./API.md) — which endpoints are Public vs protected
- [DEC-007 — Role Navigation and Route Protection](../Decisions/DEC-007-Role-Navigation-and-Route-Protection.md)
- [DEC-008 — User, Company and Role Lifecycle](../Decisions/DEC-008-User-Company-Role-Lifecycle.md)
- [DEC-012 — Platform Communication Resolution](../Decisions/DEC-012-Platform-Communication-Resolution-Strategy.md)
