# DEC-009 — Authentication and Registration Lifecycle

| Field | Value |
|---|---|
| ID | DEC-009 |
| Status | **Approved (2026-06-16) — Revised 2026-06-28 (Rev-2)** |
| Authors | Architecture |
| Last Updated | 2026-06-28 |
| Depends on | DEC-008 A3 |

---

## Revision History

| Rev | Date | Summary |
|---|---|---|
| Original | 2026-06-16 | Initial approval — token-based invitation (acceptance endpoint) |
| Rev-1 | 2026-06-28 | Added `platform_admin → company_admin` to invite hierarchy; later superseded |
| **Rev-2** | **2026-06-28** | Complete lifecycle revision. Two flows only. Email verification is a hard login gate. Auto-login removed. Token-based acceptance removed. `company_owner` creation moved exclusively to `POST /companies/with-owner`. Invite hierarchy simplified. DEC-009 Rev-1 superseded. |

---

## 1. Single Login Endpoint

There is exactly one login endpoint:

```
POST /auth/login
```

All roles authenticate through the same flow. There are no separate login pages or endpoints per role.

### 1.1 Email Verification Gate

`POST /auth/login` **rejects authentication** when `isEmailVerified === false`.

```
POST /auth/login
  → find user by email
  → verify password (bcrypt)
  → if isEmailVerified === false:
      → return 403 { error: "EMAIL_NOT_VERIFIED",
                     message: "Please verify your email address before logging in." }
  → issue JWT pair
  → return AuthResponseDto
```

This gate applies only to users created via public registration. Invited users are always created with `isEmailVerified = true` and are never affected by this check.

### 1.2 Post-Login Flow and Mandatory Password-Change Gate

```
POST /auth/login
  → find user by email
  → verify password (bcrypt)
  → if isEmailVerified === false → 403 EMAIL_NOT_VERIFIED   (public reg only)
  → if isActive === false        → 403 ACCOUNT_INACTIVE
  → issue JWT pair
  → return AuthResponseDto

Frontend (portal layout — runs on every authenticated navigation):
  → auth store hydrated with user object
  → if mustChangePassword === true:
      ┌─────────────────────────────────────────────────────────┐
      │  MANDATORY GATE — no application routes accessible      │
      │                                                         │
      │  router.replace('/auth/change-password')                │
      │    → cannot be dismissed                                │
      │    → navigating away returns to /auth/change-password   │
      │    → no sidebar, no topbar, no other navigation         │
      │                                                         │
      │  PATCH /users/me/password                               │
      │    { currentPassword: tempPassword, newPassword: ... }  │
      │    → bcrypt verify                                      │
      │    → hash new password                                  │
      │    → mustChangePassword = false                         │
      │    → auth store re-hydrated                             │
      │                                                         │
      │  Normal navigation unlocked                             │
      └─────────────────────────────────────────────────────────┘
  → else:
      → getLandingPage(role) redirect
      → full navbar + sidebar rendered
```

**This gate is mandatory, not advisory.** The portal layout must enforce it before rendering any application content. A user with `mustChangePassword = true` must not be able to reach any business route until the password is changed.

---

## 2. Two Onboarding Flows

There are exactly two ways a user account is created. No other creation paths exist.

---

### Flow A — Public Registration

```
User completes registration form

↓

POST /auth/register
  → validate uniqueness (email)
  → create Company record
  → provision default assets:
       Theme · Email Layout · PDF Layout
       security Domain · Default Events
  → create User:
       role               = company_owner
       scope              = company
       passwordHash       = bcrypt(chosenPassword)
       isEmailVerified    = false
       mustChangePassword = false
  → generate email verification token (SHA-256 stored, raw in URL)
  → trigger:
       NotificationEngine.notifyEvent({
         companyId,
         event:   'security.company_verify_email',
         email:   user.email,
         payload: { data: { firstName, verificationUrl, expiresAt } }
       })
  → return { message: "Check your email to verify your account." }

↓

User receives email → clicks verification link

↓

GET /auth/verify-email?token=<raw>
  → SHA-256(raw) → find user by emailVerificationToken
  → assert not expired
  → set isEmailVerified = true
  → return { message: "Email verified. You may now log in." }

↓

POST /auth/login  (email gate passes: isEmailVerified === true)

↓

Dashboard (mustChangePassword === false — no forced change)
```

**Key properties of Flow A:**

| Property | Value |
|---|---|
| `isEmailVerified` at creation | `false` |
| `mustChangePassword` | `false` |
| Login before verification | ❌ Forbidden (403) |
| Tokens returned by register | ❌ Never |
| Registration response | `{ message: string }` only |
| Password chosen by | The user, during registration |
| Email verification event | `security.company_verify_email` |
| Provisioning | ✅ Triggered at `POST /auth/register` |

---

### Flow B — Admin Invitation

```
Actor:
  platform_admin  → invites platform_admin (via POST /users/invite)
  platform_admin  → invites company_owner  (via POST /companies/with-owner only)
  company_owner   → invites company_admin, operator, viewer (via POST /users/invite)
  company_admin   → invites operator, viewer (via POST /users/invite)

↓

Backend creates User:
  role               = <target role>
  scope              = derived from role
  companyId          = resolved server-side (never from request body for cross-company)
  passwordHash       = bcrypt(generatedTempPassword)
  isEmailVerified    = true   ← admin-vouched; no link required
  mustChangePassword = true

↓

NotificationEngine.notifyEvent({
  companyId,
  event:   'security.company_user_invitation',
  email:   invitee.email,
  payload: {
    data: {
      firstName:    invitee.firstName,
      companyName:  company.displayName,
      role:         invitee.role,
      email:        invitee.email,
      tempPassword: generatedTempPassword,
      loginUrl:     config.loginUrl,
    }
  }
})

↓

User receives email → logs in with temp password

↓

POST /auth/login  (email gate passes: isEmailVerified === true)

↓

Portal layout detects mustChangePassword === true

↓

Redirect to /auth/change-password (cannot dismiss)

↓

PATCH /users/me/password { currentPassword, newPassword }
  → bcrypt verify → hash new → mustChangePassword = false

↓

Dashboard
```

**Key properties of Flow B:**

| Property | Value |
|---|---|
| `isEmailVerified` at creation | `true` (admin-vouched) |
| `mustChangePassword` | `true` |
| Email verification step | ❌ Not required |
| Tokens returned | ❌ Never by the invite endpoint |
| Password chosen by | The system (temp); user changes on first login |
| Invitation event | `security.company_user_invitation` |
| Provisioning | ✅ Triggered when company is created (via `/companies/with-owner`) |

---

## 3. Platform Admin Creation

### 3.1 Bootstrap

The `UsersBootstrapService` runs on every application startup. It sets `role = 'platform_admin'`, `scope = 'global'` on the account identified by the `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` environment variable, but only if that account currently has no role field (first-time setup). The platform admin is associated with the Grapifly platform company (DEC-008 A3, DEC-011).

### 3.2 Platform Admin Inviting Another Platform Admin

A `platform_admin` may invite another `platform_admin` via:

```
POST /users/invite
Authorization: Bearer <platform_admin_token>

{
  "email":     "new-admin@example.com",
  "firstName": "...",
  "lastName":  "...",
  "role":      "platform_admin"
}
```

The new `platform_admin` inherits the Grapifly platform `companyId`. No `targetCompanyId` is required — platform admins always belong to the platform company.

The invitation uses Flow B: temp password, `isEmailVerified = true`, `mustChangePassword = true`, triggers `security.company_user_invitation` against the platform company.

---

## 4. Role Hierarchy and Invitation Rules

### 4.0 Who Can Create Whom

```
  platform_admin
    ├── platform_admin          (POST /users/invite)
    └── company_owner           (POST /companies/with-owner ONLY — never via /users/invite)

  company_owner
    ├── company_admin           (POST /users/invite)
    ├── operator                (POST /users/invite)
    └── viewer                  (POST /users/invite)

  company_admin
    ├── operator                (POST /users/invite)
    └── viewer                  (POST /users/invite)

  operator    →  (none)
  viewer      →  (none)
```

The hierarchy is enforced server-side. Any attempt to invite a role outside the permitted set returns **403 Forbidden**.

The approved hierarchy (enforced in `INVITE_HIERARCHY`):

```
platform_admin  → platform_admin                         (via POST /users/invite)
                  company_owner                          (via POST /companies/with-owner ONLY)
company_owner   → company_admin, operator, viewer        (via POST /users/invite)
company_admin   → operator, viewer                       (via POST /users/invite)
operator        → (none)
viewer          → (none)
```

### 4.1 company_owner Creation Rule

> **`company_owner` is NEVER created via `POST /users/invite`.**
> Attempting to pass `role: "company_owner"` to `POST /users/invite` returns **403 Forbidden**.
>
> The only permitted creation path is `POST /companies/with-owner`, which:
> 1. Creates the Company record
> 2. Provisions default assets (Theme, Layouts, Domain, Events)
> 3. Creates the `company_owner` user account (Flow B)
> 4. Triggers `security.company_user_invitation`
>
> This endpoint is accessible only to `platform_admin`.

### 4.2 targetCompanyId Rule

| Inviting actor | Target role | `targetCompanyId` required |
|---|---|---|
| `platform_admin` | `platform_admin` | No — inherits platform company |
| `platform_admin` | `company_owner` | N/A — use `POST /companies/with-owner` instead |
| `company_owner` | `company_admin`, `operator`, `viewer` | Ignored — actor's own `companyId` always used |
| `company_admin` | `operator`, `viewer` | Ignored — actor's own `companyId` always used |

When company-scoped roles send invitations, any `targetCompanyId` in the request body is silently discarded. The actor's own `companyId` is always authoritative. This prevents cross-company injection attacks.

---

## 5. Email Verification Lifecycle

Email verification applies **only** to Flow A (public registration).

```
POST /auth/register
  → creates user with isEmailVerified = false
  → generates rawToken (randomBytes(32).hex)
  → stores SHA-256(rawToken) in user.emailVerificationToken
  → sets user.emailVerificationTokenExpiresAt = now + 24h
  → triggers security.company_verify_email notification

User clicks link in email:

GET /auth/verify-email?token=<rawToken>
  → SHA-256(rawToken) → find user
  → assert emailVerificationTokenExpiresAt > now
  → set isEmailVerified = true
  → clear token + expiry
  → return { message }

POST /auth/login (now permitted)
```

Email verification is **never** triggered for invited users. Invited users have `isEmailVerified = true` set at account creation time.

---

## 6. Forgot Password / Reset Password

Applies to all users regardless of creation flow.

```
POST /auth/forgot-password { email }
  → always returns safe response (prevents enumeration)
  → if user found:
      → generate rawToken (randomBytes(32).hex)
      → store SHA-256(rawToken) as user.passwordResetToken (expires 1h)
      → trigger security.company_forgot_password notification
           (uses company credentials for company-scoped users;
            platform credentials for platform_admin)

POST /auth/reset-password { token, newPassword }
  → SHA-256(token) → find user by passwordResetToken
  → assert not expired
  → bcrypt hash newPassword → store
  → revoke all refresh tokens for user
  → clear passwordResetToken + expiry
  → trigger security.company_password_changed notification
```

---

## 7. Canonical User Creation Matrix

> This matrix is the **single authoritative reference** for all user creation paths. Every DEC and documentation page that describes authentication, onboarding, or user creation must be consistent with this table.

| Creation path | Initiator | Endpoint | Password source | `isEmailVerified` | `mustChangePassword` | Notification event | Can log in when |
|---|---|---|---|---|---|---|---|
| Public Registration | Self | `POST /auth/register` | User-chosen (during registration) | `false` | `false` | `security.company_verify_email` | After email verification |
| Platform Admin invitation | `platform_admin` | `POST /users/invite` | System-generated temp password | `true` | `true` | `security.company_user_invitation` | Immediately — forced PW change on first login |
| Company Owner creation | `platform_admin` | `POST /companies/with-owner` | System-generated temp password | `true` | `true` | `security.company_user_invitation` | Immediately — forced PW change on first login |
| Company Admin invitation | `company_owner` | `POST /users/invite` | System-generated temp password | `true` | `true` | `security.company_user_invitation` | Immediately — forced PW change on first login |
| Operator invitation | `company_owner` or `company_admin` | `POST /users/invite` | System-generated temp password | `true` | `true` | `security.company_user_invitation` | Immediately — forced PW change on first login |
| Viewer invitation | `company_owner` or `company_admin` | `POST /users/invite` | System-generated temp password | `true` | `true` | `security.company_user_invitation` | Immediately — forced PW change on first login |

**Notes:**

1. `security.company_user_invitation` is the **single invitation event** for ALL invited users regardless of role. The `data.role` variable in the payload allows the email template to address the invitee by their assigned role.
2. Public registration is the **only** path that produces `isEmailVerified = false`. All other paths produce `isEmailVerified = true` (admin-vouched).
3. Public registration is the **only** path that produces `mustChangePassword = false`. All invitation paths produce `mustChangePassword = true`.
4. `company_owner` has exactly one creation path: `POST /companies/with-owner`. Any other path is forbidden.
5. A user with `mustChangePassword = true` cannot access any application route until the password is changed — this is a mandatory gate, not a recommendation.

---

## 8. Ownership Transfer (Future)

Not yet implemented. When implemented:
- Update `company.ownerUserId` to the new owner's `_id`.
- Update the previous owner's role (to `company_admin` or deactivate — TBD).
- Record in audit log.

Only `company_owner` may initiate for their own company. `platform_admin` may force-transfer.

---

## 9. Implementation Status

| Item | Status | Notes |
|---|---|---|
| `POST /auth/login` — single flow for all roles | ✅ Done | `AuthService.login()` |
| `POST /auth/login` — `isEmailVerified` hard gate | ⏳ Pending | Must reject login when `isEmailVerified === false` |
| `POST /auth/register` — company + owner + provisioning + verify email event | ⏳ Pending | Currently: no provisioning, no verify email event, returns tokens (auto-login) — all three must change |
| `POST /auth/register` — response is `{ message }` only, no tokens | ⏳ Pending | Currently returns `AuthResponseDto` |
| `GET /auth/verify-email` — sets `isEmailVerified = true` | ✅ Done | `AuthService.verifyEmail()` |
| `security.company_verify_email` event triggered on registration | ⏳ Pending | Event must exist in event catalogue; `AuthService.register()` must call `notifyEvent()` |
| `POST /companies/with-owner` — atomic company + provisioning + owner | ✅ Done | `CompanyController.createWithOwner()` — provisioning ⏳ Pending |
| `POST /companies/with-owner` — triggers `security.company_user_invitation` | ⏳ Pending | Currently uses PlatformMailService |
| `POST /users/invite` — enforces `INVITE_HIERARCHY` | ✅ Done | `UsersController.invite()` |
| `POST /users/invite` — `company_owner` not an invitable role | ⏳ Pending | Must be removed from INVITE_HIERARCHY |
| `POST /users/invite` — triggers `security.company_user_invitation` with full payload | ⏳ Pending | Currently missing `tempPassword`, `companyName`, `loginUrl` in payload |
| `PATCH /users/me/password` — clears `mustChangePassword` | ✅ Done | |
| Portal layout — forced redirect when `mustChangePassword === true` | ✅ Done | |
| `/auth/change-password` page | ✅ Done | |
| Frontend — no auto-login after registration; redirect to `/auth/login?registered=true` | ⏳ Pending | Currently stays on register page |
| Frontend — login page shows 403 error for unverified email | ⏳ Pending | |
