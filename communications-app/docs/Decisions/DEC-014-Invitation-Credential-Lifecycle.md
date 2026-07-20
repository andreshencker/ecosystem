# DEC-014 — Invitation & Credential Lifecycle

| Field | Value |
|---|---|
| ID | DEC-014 |
| Status | **Approved (2026-06-24) — Revised 2026-06-28 (Rev-1)** |
| Authors | Architecture |
| Last Updated | 2026-06-28 |
| Depends on | DEC-009 §4, DEC-013 |

---

## Revision History

| Rev | Date | Summary |
|---|---|---|
| Original | 2026-06-24 | Initial approval — PlatformMailService delivery, `company_owner` via `/users/invite` |
| **Rev-1** | **2026-06-28** | All invitation delivery moved to NotificationEngine. `company_owner` removed from `/users/invite` — exclusively via `POST /companies/with-owner`. Platform SMTP fallback for company invites removed. Login lifecycle split into two paths (public reg vs. invited). |

---

## 1. Invitation Hierarchy

The approved hierarchy, enforced server-side in `INVITE_HIERARCHY`. See DEC-009 §4 for the canonical definition.

| Actor | May invite via `POST /users/invite` |
|---|---|
| `platform_admin` | `platform_admin` only |
| `company_owner` | `company_admin`, `operator`, `viewer` |
| `company_admin` | `operator`, `viewer` |
| `operator` | (none) |
| `viewer` | (none) |

`company_owner` is **never** created via `POST /users/invite`. See §1a.

---

## 1a. Surface Separation — Where Each Invitation Is Issued

### Platform Team (`/users` — `platform_admin` in Platform mode)

| Actor | Invited role | Notes |
|---|---|---|
| `platform_admin` | `platform_admin` | Invite User form shows Platform Admin only |

Platform admins manage other platform admins from the Team page. No company-scoped roles are available here.

### Business Team (`/users` — company-scoped roles)

| Actor | Invited roles | Notes |
|---|---|---|
| `company_owner` | `company_admin`, `operator`, `viewer` | Invite User form shows these three roles |
| `company_admin` | `operator`, `viewer` | Invite User form shows these two roles |
| `operator` | (none) | No invite button |
| `viewer` | (none) | No invite button |

Company-scoped invitations are always scoped to the actor's own `companyId`. No company selector is shown.

### Global Users (`/global-users` — `platform_admin` only)

| Action | Endpoint | Notes |
|---|---|---|
| Create Company + Owner | `POST /companies/with-owner` | Atomic: creates company, provisions default assets, creates `company_owner` |

**`company_owner` is created exclusively from Global Users via the Create Company form.** This is the only permitted path.

> **Rule:** `company_owner` accounts are created **only** via `POST /companies/with-owner`.
> They are never available as an invite option on the Team page (`/users`).
> They are never created via `POST /users/invite`.

---

## 2. Account Creation Flow

Both `POST /users/invite` and `POST /companies/with-owner` use the direct-creation model (DEC-013 §2). No token-based acceptance exists.

```
Actor triggers creation (invite or company+owner creation)

↓

Backend:
  → validates INVITE_HIERARCHY (403 if forbidden via /users/invite)
  → generates 16-char secure temporary password
  → creates User:
       isEmailVerified    = true   ← admin-vouched; no email link required
       mustChangePassword = true
       passwordHash       = bcrypt(tempPassword, 12 rounds)
  → calls NotificationEngine.notifyEvent({
       companyId,
       event:   'security.company_user_invitation',
       email:   invitee.email,
       payload: {
         data: {
           firstName:    invitee.firstName,
           companyName:  company.displayName,
           role:         invitee.role,
           email:        invitee.email,
           tempPassword: <plaintext, in-memory only>,
           loginUrl:     config.loginUrl,
         }
       }
     })
  → tempPassword discarded from memory
  → creates Invitation audit record
  → returns { userId, invitationId, emailDelivered, message }
```

---

## 3. Credential Security

Temporary credentials must **never appear in API responses or server logs in production**.

The plaintext `tempPassword` is:
1. Generated in memory.
2. Hashed and stored in `user.passwordHash`.
3. Passed once to `notifyEvent()` as `payload.data.tempPassword`.
4. Discarded after the call returns.

It is never written to the database, never returned in the API response body, and never logged.

See DEC-013 §7 for full credential security rules.

---

## 4. Temporary Password and `mustChangePassword`

All invited users are created with:

```typescript
isEmailVerified    = true   // admin-vouched; no email link required
mustChangePassword = true   // forced on first login
```

`mustChangePassword` is cleared when the user completes `PATCH /users/me/password` with a valid current (temp) password.

**Public-registration users are not affected by this rule.** They have `mustChangePassword = false` because they chose their own password during registration (DEC-009 Flow A).

---

## 5. Notification Delivery

### 5.1 Notification Ownership

All invitation notifications are delivered through the **Notification Engine** using the credentials of the **resolved company**.

| Invitation source | `companyId` used | Credentials |
|---|---|---|
| `POST /users/invite` — `platform_admin` invites `platform_admin` | Platform company ID | Platform company credentials |
| `POST /companies/with-owner` — creates `company_owner` | New company ID | New company credentials (provisioned at creation) |
| `POST /users/invite` — `company_owner` or `company_admin` invites | Actor's own `companyId` | That company's credentials |

**PlatformMailService is not used for invitation delivery.** There is no global credential fallback. A company without configured credentials will receive `emailDelivered: false` and must configure credentials before delivery works.

### 5.2 Delivery Outcome

| Outcome | `Invitation.status` | UI Response |
|---|---|---|
| Email delivered | `pending` | Success message |
| Credentials not configured or delivery failed | `pending_delivery` | Warning — "configure credentials on the Domains page" |

A `pending_delivery` account is fully active. The user can log in with their temporary password without waiting for the email. The admin can resend once credentials are configured.

---

## 6. Login Lifecycle by Creation Path

The first-login experience differs depending on how the user account was created.

### 6.1 Public Registration (Flow A)

```
User registers → isEmailVerified = false, mustChangePassword = false

→ Receives security.company_verify_email

→ Clicks verification link → isEmailVerified = true

→ POST /auth/login (now permitted)

→ Portal detects mustChangePassword === false

→ getLandingPage(role) → Dashboard
```

The user is **never** forced to change their password — they already chose it.

### 6.2 Admin Invitation (Flow B)

```
Admin creates account
  isEmailVerified    = true
  mustChangePassword = true

↓

Receives security.company_user_invitation
  (contains: tempPassword, loginUrl, companyName, role)

↓

POST /auth/login { email, password: tempPassword }
  → isEmailVerified check: passes (true)
  → JWT issued

↓

Frontend portal layout checks user.mustChangePassword

↓

if mustChangePassword === true:
  ┌──────────────────────────────────────────────────────────┐
  │  MANDATORY GATE                                          │
  │                                                          │
  │  → router.replace('/auth/change-password')               │
  │  → Page has no sidebar, no topbar, no back navigation    │
  │  → Navigating to any other route is intercepted and      │
  │    redirected back to /auth/change-password              │
  │  → No application content is accessible                  │
  │                                                          │
  │  User submits:                                           │
  │  PATCH /users/me/password {                              │
  │    currentPassword: <tempPassword>,                      │
  │    newPassword:     <new chosen password>                │
  │  }                                                       │
  │  → server: bcrypt verify currentPassword                 │
  │  → server: hash newPassword                              │
  │  → server: mustChangePassword = false                    │
  │  → client: auth store re-hydrated                        │
  │                                                          │
  │  Gate lifted. Normal navigation begins.                  │
  └──────────────────────────────────────────────────────────┘

↓

getLandingPage(role) → Dashboard
```

**This gate is mandatory at the portal layout level.** It applies to every invited user across all roles — `platform_admin`, `company_owner`, `company_admin`, `operator`, `viewer`. There are no exceptions, no role-based bypasses, and no way to dismiss or skip it.

---

## 7. Password Change Requirement

`mustChangePassword` is cleared server-side only when:

1. `PATCH /users/me/password` is called with a valid `currentPassword` and a `newPassword` meeting complexity requirements.
2. Server sets `mustChangePassword = false` and saves the user document.

---

## 8. Gaps and Remaining Work

| ID | Gap | Priority | Status |
|---|---|---|---|
| G-DEC014-001 | First-login redirect to `/auth/change-password` when `mustChangePassword = true` | High | ✅ Done |
| G-DEC014-002 | `PATCH /users/me/password` endpoint | High | ✅ Done |
| G-DEC014-003 | `/auth/change-password` page | High | ✅ Done |
| G-DEC014-004 | `company_owner` removed from `POST /users/invite` hierarchy | High | ⏳ Pending |
| G-DEC014-005 | `notifyEvent()` called with full payload from `/users/invite` | High | ⏳ Pending |
| G-DEC014-006 | `notifyEvent()` called with full payload from `/companies/with-owner` | High | ⏳ Pending |
| G-DEC014-007 | `Invitation.status` set to `accepted` on first password change | Low | ⏳ Pending |
| G-DEC014-008 | Resend invitation endpoint | Medium | ⏳ Pending |

---

## 9. Implementation Status

| Item | Status | Notes |
|---|---|---|
| `INVITE_HIERARCHY` enforced server-side in `POST /users/invite` | ✅ Done | |
| Direct-creation: user created with temp password on invite | ✅ Done | |
| `mustChangePassword` field + DTO | ✅ Done | |
| `isEmailVerified = true` for all invited users | ✅ Done | |
| Invitation audit record | ✅ Done | |
| `company_owner` removed from `POST /users/invite` | ⏳ Pending | G-DEC014-004 |
| `POST /users/invite` — full payload to `notifyEvent()` | ⏳ Pending | G-DEC014-005 |
| `POST /companies/with-owner` — `notifyEvent()` with full payload | ⏳ Pending | G-DEC014-006 |
| Platform Team invite button: shows only `platform_admin` role | ⏳ Pending | |
| Business Team invite: `company_owner` option removed | ⏳ Pending | |
| First-login redirect (`app/(portal)/layout.tsx`) | ✅ Done | |
| `PATCH /users/me/password` endpoint | ✅ Done | |
| `/auth/change-password` page | ✅ Done | |
