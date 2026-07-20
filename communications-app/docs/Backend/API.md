# Backend API Reference

| Field | Value |
|---|---|
| Last Updated | 2026-06-28 |
| Governs | `communications-backend` |
| Auth baseline | DEC-009 Rev-2, DEC-013 Rev-1, DEC-014 Rev-1 |

---

## 1. Conventions

- Base URL: `http://localhost:3001` (development)
- All request bodies: `application/json`
- All responses: `application/json`
- Timestamps: ISO 8601 (`2026-06-14T12:00:00.000Z`)
- Pagination: `{ items: T[], total: number, page: number, limit: number }`
- Error shape: `{ statusCode: number, message: string, error?: string }`

> **Note:** The pagination wrapper key is `items`, not `data`. See §3 (GET /users) for the authoritative example.

### 1.1 Authentication

Protected endpoints require:

```
Authorization: Bearer <accessToken>
```

### 1.2 Role / Scope in JWT

As of DEC-004 A1, every access token carries `{ sub, role, scope, companyId, companyKey, type }`. Guards use these claims without a DB round-trip.

### 1.3 Role Access Legend

In the endpoint tables below:

| Symbol | Meaning |
|---|---|
| ✓ | Full access |
| ✓ (own) | Access limited to own company's data |
| ✓ (read) | Read-only access |
| 403 | Authenticated but forbidden |
| — | Not applicable |
| public | No authentication required |

---

## 2. Auth Endpoints

### POST `/auth/register`

Creates a new company + `company_owner` atomically, provisions default assets, and triggers email verification. **Does not return tokens.** The user must verify their email before they can log in.

**Role access:** public — no token required

**Body**
```json
{
  "companyName": "string (required)",
  "firstName":   "string (required)",
  "lastName":    "string (required)",
  "email":       "string (required)",
  "password":    "string (required, min 8 chars)"
}
```

**Response 201**
```json
{
  "message": "Registration successful. Please check your email to verify your account."
}
```

**What the backend does:**
1. Validates all required fields
2. Checks email not already registered (409 on duplicate)
3. Creates `Company` document
4. Provisions default assets: Theme, Email Layout, PDF Layout, security Domain, Default Events
5. Creates `User` document:
   - `role = company_owner`, `scope = company`, `companyId = company._id`
   - `isEmailVerified = false`, `mustChangePassword = false`
   - `passwordHash = bcrypt(chosenPassword)`
6. Sets `company.ownerUserId = user._id`
7. Generates email verification token (SHA-256 stored; raw in URL)
8. Triggers `security.company_verify_email` via Notification Engine
9. Returns `{ message }` — **no tokens, no auto-login**

**Errors:**
- 400 — validation failure
- 409 — email already registered or company key already exists

**Frontend post-submit action:** Redirect to `/auth/login?registered=true`. Show banner: "Account created. Check your email to verify before logging in." No tokens to store.

---

### POST `/auth/login`

**Role access:** public

**Body**
```json
{ "email": "string", "password": "string" }
```

**Response 200**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 900,
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "platform_admin | company_owner | company_admin | operator | viewer",
    "scope": "global | company",
    "companyId": "string | null",
    "companyKey": "string | null",
    "isActive": true,
    "isEmailVerified": true,
    "createdAt": "ISO8601"
  }
}
```

**Email verification gate:** If `isEmailVerified === false`, login is rejected with 403. This applies to users created via public registration. Invited users always have `isEmailVerified = true` and are unaffected.

**Errors:**
- 401 — invalid credentials (same message whether email or password is wrong — prevents enumeration)
- 403 `EMAIL_NOT_VERIFIED` — user exists but has not verified their email (public registration only)
- 403 `ACCOUNT_INACTIVE` — user has been deactivated

---

### POST `/auth/refresh`

**Role access:** public (uses refresh token, not access token)

**Body**
```json
{ "refreshToken": "string" }
```

**Response 200**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 900
}
```

> **Gap (G-007):** Refresh response does not return an updated `user` object. Role changes on the server side are invisible until full re-login.

**Errors:** 401 (invalid / expired / reused token)

---

### POST `/auth/logout`

**Role access:** all authenticated roles

**Body**
```json
{ "refreshToken": "string" }
```

**Response 200**
```json
{ "message": "Logged out successfully" }
```

Idempotent — always returns 200.

---

### GET `/auth/verify-email?token=<raw>`

**Role access:** public

**Response 200**
```json
{ "message": "Email verified successfully. You can now log in." }
```

**Errors:** 400 (invalid or expired token)

---

### POST `/auth/forgot-password`

**Role access:** public

**Body**
```json
{ "email": "string" }
```

**Response 200** — always returns the same message (prevents email enumeration)
```json
{ "message": "If an account with that email exists, a password reset link has been sent." }
```

---

### POST `/auth/reset-password`

**Role access:** public

**Body**
```json
{ "token": "string", "newPassword": "string" }
```

**Response 200**
```json
{ "message": "Password reset successfully. You can now log in." }
```

**Errors:** 400 (invalid or expired token)

---

## 3. User Endpoints

### GET `/users`

Returns users scoped to the active company (Business App "Team" endpoint).

**Scoping rules** (JWT carries only `sub`; role/scope resolved from DB by the handler):

| Actor | `?companyId` param | Result |
|---|---|---|
| `platform_admin` (scope=global) | omitted | Users in platform_admin's own company (Grapifly) |
| `platform_admin` (scope=global) | provided | Users in the specified company |
| Company-scoped roles | ignored | Always returns own company's users |

**Query params:**

| Param | Type | Description |
|---|---|---|
| `companyId` | string | Target company ObjectId — `platform_admin` only, optional |
| `page` | number | 1-based page number (default: 1) |
| `limit` | number | Page size 1–100 (default: 25) |
| `search` | string | Case-insensitive filter on name/email |

**Response 200**
```json
{
  "items": [
    {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "string",
      "scope": "string",
      "companyId": "string | null",
      "companyKey": "string | null",
      "isActive": true,
      "isEmailVerified": true,
      "createdAt": "string"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 25
}
```

---

### POST `/users/invite`

Creates an invited user account with a temporary password and triggers `security.company_user_invitation` via the Notification Engine. See DEC-009 §4 and DEC-013 for full lifecycle.

> **`company_owner` is NOT an invitable role via this endpoint.** Company owners are created exclusively via `POST /companies/with-owner`. Attempting to invite `company_owner` via this endpoint returns 403.

**Role access and target role restrictions:**

| Inviting role | Permitted target roles | Forbidden target roles |
|---|---|---|
| `platform_admin` | `platform_admin` | `company_owner` (use `/companies/with-owner`), `company_admin`, `operator`, `viewer` (403) |
| `company_owner` | `company_admin`, `operator`, `viewer` | `company_owner`, `platform_admin` (403) |
| `company_admin` | `operator`, `viewer` | `company_owner`, `company_admin`, `platform_admin` (403) |
| `operator` | (none) | all (403) |
| `viewer` | (none) | all (403) |

**Body**
```json
{
  "email":     "string (required)",
  "firstName": "string (required)",
  "lastName":  "string (required)",
  "role":      "platform_admin | company_admin | operator | viewer (required)"
}
```

**companyId resolution:**
- Actor scope = `company`: actor's own `companyId` is always used. `targetCompanyId` is ignored (cross-company injection prevention).
- Actor scope = `global` (`platform_admin`) + `platform_admin` target: inherits platform company.

**What the backend does:**
1. Validates INVITE_HIERARCHY (403 if forbidden)
2. Generates 16-char temporary password
3. Creates user: `isEmailVerified = true`, `mustChangePassword = true`
4. Triggers `security.company_user_invitation` with full payload: `firstName`, `companyName`, `role`, `email`, `tempPassword`, `loginUrl`
5. Creates Invitation audit record
6. Returns `{ userId, invitationId, email, role, emailDelivered, message }`

**Response 201**
```json
{
  "userId":        "string",
  "invitationId":  "string",
  "email":         "string",
  "role":          "string",
  "emailDelivered": true,
  "message":       "string"
}
```

**Errors:**
- 400 — validation failure
- 403 — actor role not permitted to invite target role (including `company_owner`)
- 409 — email already registered

---

### PATCH `/users/:id`

Updates a user's role or profile fields.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | Any user |
| `company_owner` | Users within own company |
| `company_admin` | `operator` and `viewer` users within own company only |
| `operator` | 403 |
| `viewer` | 403 |

**Backend enforces:** role/scope combination validity per DEC-004 §5. Cannot promote a user to a role higher than the actor's own role.

**Errors:** 400 (invalid role/scope), 403 (cannot promote to higher role or cross-company)

---

### DELETE `/users/:id`

Deactivates a user account.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | Any user |
| `company_owner` | Users within own company |
| `company_admin` | 403 |
| `operator` | 403 |
| `viewer` | 403 |

---

## 4. Company Endpoints

### GET `/companies`

Returns companies.

**Authentication:** Accepts `Authorization: Bearer <accessToken>` (JWT) **or** `x-api-key: <COMMUNICATION_API_KEY>` (internal engine calls). The `assertAccess()` helper in `CompanyController` accepts either; `GlobalAuthGuard` still validates the JWT first.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | All companies (JWT Bearer) |
| `company_owner` | 403 — use `GET /company` for own company |
| `company_admin` | 403 |
| `operator` | 403 |
| `viewer` | 403 |

> **CONT-001 (resolved):** `company_owner` does not access the companies list. They access their own company via `GET /company` (portal layer). This corrects earlier docs that listed `company_owner` as having access to `GET /companies`.

---

### POST `/companies`

Creates a new company.

**Role access:** `platform_admin` only

**Body**
```json
{
  "companyKey": "string",
  "displayName": "string",
  "legalName": "string",
  "timezone": "string"
}
```

**Response 201** — returns created company object

---

### GET `/companies/:id`

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | Any company |
| `company_owner` | Own company only (`id` must equal `authContext.companyId`) |
| `company_admin` | 403 |
| `operator` | 403 |
| `viewer` | 403 |

---

### PATCH `/companies/:id`

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | Any company |
| `company_owner` | Own company only |
| `company_admin` | 403 |
| `operator` | 403 |
| `viewer` | 403 |

---

### DELETE `/companies/:id`

Soft-delete (sets `isActive: false`).

**Role access:** `platform_admin` only

---

## 5. Channel Endpoints

Platform-level catalogue. Readable and writable by `platform_admin` only.

**Role access:** `platform_admin` — all others 403

### GET `/channels`
### GET `/channels/:id`
### POST `/channels`
### PATCH `/channels/:id`

---

## 6. Provider Endpoints

Platform-level catalogue. `platform_admin` only.

**Role access:** `platform_admin` — all others 403

### GET `/providers`
### POST `/providers`
### GET `/providers/:id`
### PATCH `/providers/:id`

---

## 7. Company Channel Provider Endpoints

Company-scoped.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | ✓ |
| `company_owner` | ✓ (own company) |
| `company_admin` | ✓ (own company) |
| `operator` | 403 |
| `viewer` | 403 |

### GET `/company-channel-providers`
### POST `/company-channel-providers`
### GET `/company-channel-providers/:id`
### PATCH `/company-channel-providers/:id`

---

## 8. Provider Credentials Endpoints

Company-scoped.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | ✓ |
| `company_owner` | ✓ (own company) |
| `company_admin` | ✓ (own company) |
| `operator` | 403 |
| `viewer` | 403 |

### GET `/provider-credentials`
### POST `/provider-credentials`
### GET `/provider-credentials/:id`
### PATCH `/provider-credentials/:id`
### DELETE `/provider-credentials/:id`

---

## 9. Domain Catalogue Endpoints

Company-scoped.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | ✓ |
| `company_owner` | ✓ (own company) |
| `company_admin` | ✓ (own company) |
| `operator` | 403 |
| `viewer` | 403 |

### GET `/domain-catalogue`
### POST `/domain-catalogue`
### GET `/domain-catalogue/:id`
### PATCH `/domain-catalogue/:id`

---

## 10. Event Catalogue Endpoints

Company-scoped.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | ✓ |
| `company_owner` | ✓ (own company) |
| `company_admin` | ✓ (own company) |
| `operator` | 403 |
| `viewer` | 403 |

### GET `/event-catalogue`
### POST `/event-catalogue`
### GET `/event-catalogue/:id`
### PATCH `/event-catalogue/:id`

---

## 11. Layout Template Endpoints

Company-scoped. Readable by `viewer` (read-only); writable by `company_owner` and `company_admin`.

**Role access:**

| Role | GET | POST / PATCH / DELETE |
|---|---|---|
| `platform_admin` | ✓ | ✓ |
| `company_owner` | ✓ (own) | ✓ (own) |
| `company_admin` | ✓ (own) | ✓ (own) |
| `operator` | 403 | 403 |
| `viewer` | ✓ (own, read-only) | 403 |

### GET `/layout-templates`
### POST `/layout-templates`
### GET `/layout-templates/:id`
### PATCH `/layout-templates/:id`

---

## 12. Notification Testing Endpoint

Company-scoped.

**Role access:**

| Role | Access |
|---|---|
| `platform_admin` | ✓ |
| `company_owner` | ✓ (own company) |
| `company_admin` | ✓ (own company) |
| `operator` | ✓ (own company) |
| `viewer` | 403 |

### POST `/notifications/test`

---

## 13. Files — Media, Reports, Storage

Company-scoped.

| Endpoint group | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| `GET /files/media` | ✓ | ✓ (own) | ✓ (own) | ✓ (own) | 403 |
| `POST /files/media` | ✓ | ✓ (own) | ✓ (own) | ✓ (own) | 403 |
| `GET /files/reports` | ✓ | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) |
| `POST /files/reports` | ✓ | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) |
| `GET /files/storage` | ✓ | ✓ (own) | ✓ (own) | 403 | 403 |

---

## 14. API Keys Endpoints

> **Gap (G-004):** API Keys module not yet implemented.

**Role access (planned):**

| Role | Access |
|---|---|
| `platform_admin` | ✓ (any company) |
| `company_owner` | ✓ (own company) |
| `company_admin` | 403 |
| `operator` | 403 |
| `viewer` | 403 |

### GET `/api-keys`
### POST `/api-keys`
### DELETE `/api-keys/:id`

---

## 15. Audit Log Endpoints

> **Gap (G-005):** Audit Logs module not yet implemented.

**Role access (planned):**

| Role | Access |
|---|---|
| `platform_admin` | ✓ (any company) |
| `company_owner` | ✓ (own company) |
| `company_admin` | 403 |
| `operator` | 403 |
| `viewer` | 403 |

### GET `/audit-logs`

---

## 16. Full Role × Endpoint Access Summary

| Endpoint | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| GET /users | ✓ all | ✓ own | ✓ own | 403 | 403 |
| POST /users/invite | ✓ | ✓ (admin/op/viewer) | ✓ (op/viewer) | 403 | 403 |
| PATCH /users/:id | ✓ | ✓ own | ✓ op/viewer own | 403 | 403 |
| DELETE /users/:id | ✓ | ✓ own | 403 | 403 | 403 |
| GET /companies | ✓ all | 403 | 403 | 403 | 403 |
| POST /companies | ✓ | 403 | 403 | 403 | 403 |
| GET /companies/:id | ✓ | ✓ own | 403 | 403 | 403 |
| PATCH /companies/:id | ✓ | ✓ own | 403 | 403 | 403 |
| DELETE /companies/:id | ✓ | 403 | 403 | 403 | 403 |
| GET /channels | ✓ | 403 | 403 | 403 | 403 |
| POST /channels | ✓ | 403 | 403 | 403 | 403 |
| GET /providers | ✓ | 403 | 403 | 403 | 403 |
| POST /providers | ✓ | 403 | 403 | 403 | 403 |
| GET /provider-credentials | ✓ | ✓ own | ✓ own | 403 | 403 |
| POST /provider-credentials | ✓ | ✓ own | ✓ own | 403 | 403 |
| GET /domain-catalogue | ✓ | ✓ own | ✓ own | 403 | 403 |
| POST /domain-catalogue | ✓ | ✓ own | ✓ own | 403 | 403 |
| GET /event-catalogue | ✓ | ✓ own | ✓ own | 403 | 403 |
| POST /event-catalogue | ✓ | ✓ own | ✓ own | 403 | 403 |
| GET /layout-templates | ✓ | ✓ own | ✓ own | 403 | ✓ own (read) |
| POST /layout-templates | ✓ | ✓ own | ✓ own | 403 | 403 |
| POST /notifications/test | ✓ | ✓ own | ✓ own | ✓ own | 403 |
| GET /files/media | ✓ | ✓ own | ✓ own | ✓ own | 403 |
| POST /files/media | ✓ | ✓ own | ✓ own | ✓ own | 403 |
| GET /files/reports | ✓ | ✓ own | ✓ own | ✓ own | ✓ own |
| GET /files/storage | ✓ | ✓ own | ✓ own | 403 | 403 |
| GET /api-keys | ✓ | ✓ own | 403 | 403 | 403 |
| GET /audit-logs | ✓ | ✓ own | 403 | 403 | 403 |

---

## 17. Error Reference

| Code | Meaning |
|---|---|
| 400 | Validation failure (invalid role/scope combination, malformed body) |
| 401 | Not authenticated (missing or invalid access token) |
| 403 | Authenticated but not authorized for this resource or action |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate company key) |
| 422 | Unprocessable entity (business rule violation) |
| 500 | Internal server error |
