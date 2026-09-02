# DEC-013 — Invitation and Temporary Password Architecture

| Field | Value |
|---|---|
| ID | DEC-013 |
| Status | **Approved (2026-06-24) — Revised 2026-06-28 (Rev-1)** |
| Authors | Architecture |
| Last Updated | 2026-06-28 |
| Depends on | DEC-009 §4, DEC-008 A3 |

---

## Revision History

| Rev | Date | Summary |
|---|---|---|
| Original | 2026-06-24 | Direct-creation flow via PlatformMailService |
| **Rev-1** | **2026-06-28** | Delivery path changed from PlatformMailService to NotificationEngine. Invitation payload extended to include `tempPassword`, `companyName`, `role`, `loginUrl`. Token-based acceptance formally removed. `company_owner` removed from `/users/invite` hierarchy. |

---

## 1. Context

DEC-009 §4 defines two onboarding flows. This document specifies the **direct-creation** invitation model used in **Flow B** (Admin Invitation):

- Account created immediately with a temporary password
- Credentials delivered via the Notification Engine (`security.company_user_invitation`)
- User must change password on first login (`mustChangePassword = true`)

The token-based acceptance model (POST /auth/accept-invitation) has been **formally dropped**. It is not part of any approved flow.

---

## 2. Decision

**Direct-creation flow** is the only approved invitation model:

```
Actor triggers invitation
  (via POST /users/invite  OR  POST /companies/with-owner)

↓

Backend:
  → validates INVITE_HIERARCHY (403 if forbidden)
  → generates 16-char secure temporary password
  → creates User:
       isEmailVerified    = true   ← admin-vouched
       mustChangePassword = true
       passwordHash       = bcrypt(tempPassword, 12 rounds)
  → plaintext tempPassword held in memory only
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
           tempPassword: <plaintext — held only for this call>,
           loginUrl:     config.loginUrl,
         }
       }
     })
  → tempPassword discarded from memory
  → creates Invitation audit record with delivery status
  → returns { userId, invitationId, emailDelivered, message }
```

---

## 3. Temporary Password

### 3.1 Generation

A 16-character password generated from a charset of uppercase, lowercase, digits, and symbols (`!@#$`), using `crypto.randomBytes` — never `Math.random`.

```typescript
private generateTempPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => charset[b % charset.length]).join('');
}
```

Ambiguous characters (`0`, `O`, `I`, `l`, `1`) are excluded to reduce copy errors.

### 3.2 Storage

The temporary password is hashed with bcrypt (12 rounds) and stored in `user.passwordHash`. The plaintext is **never stored** — it is passed once to `notifyEvent()` as `payload.data.tempPassword` and then discarded.

### 3.3 `mustChangePassword` Field

```typescript
@Prop({ default: false })
mustChangePassword!: boolean;
```

Set to `true` for all invited users. Cleared when the user successfully calls `PATCH /users/me/password` with a valid current (temp) password and a new password.

Public-registration users always have `mustChangePassword = false` — they chose their own password and are never forced to change it on first login.

---

## 4. Email Delivery

### 4.1 Required Email Payload

The invitation email must contain the following variables, all delivered through `payload.data.*` to `notifyEvent()`:

| Variable | Description |
|---|---|
| `data.firstName` | Invitee's first name |
| `data.companyName` | Display name of the assigned company |
| `data.role` | Assigned role (for display in email) |
| `data.email` | Invitee's email address |
| `data.tempPassword` | Plaintext temporary password — used once, then discarded |
| `data.loginUrl` | Direct URL to the login page |

### 4.2 Delivery Method

All invitation emails are delivered exclusively through the **Notification Engine**:

```
NotificationEngine.notifyEvent({
  companyId:  <resolved company>,
  event:      'security.company_user_invitation',
  email:      invitee.email,
  payload:    { data: { firstName, companyName, role, email, tempPassword, loginUrl } }
})
```

The Notification Engine resolves:
- Event template from the EventCatalogue (subject, HTML content body)
- Domain channel and credential reference from DomainCatalogue
- Theme tokens and Layout HTML from the company's provisioned assets
- Delivers via the company's configured provider (SMTP, SendGrid, etc.)
- Writes an ExecutionLog entry

**PlatformMailService is not used for invitation delivery.** Invitations for all roles — including `platform_admin` — are delivered through the Notification Engine using the respective company's (or platform company's) configured assets.

### 4.3 Delivery Status Tracking

The `Invitation` document records whether delivery succeeded:

| `status` | Meaning |
|---|---|
| `pending_delivery` | User created; email not sent (credentials not configured or delivery failed) |
| `pending` | User created; email sent; awaiting first login |
| `accepted` | User completed first-login password change (future) |
| `cancelled` | Admin cancelled the invitation |

### 4.4 Frontend Handling

When `emailDelivered === false`, the UI displays a warning:

> "User created successfully. Invitation email could not be delivered — configure credentials on the Domains page."

The user account is fully active. The admin can resend once credentials are configured.

---

## 5. Invitation Record

The `Invitation` document is an **audit and delivery log** — not a token-acceptance record.

Fields:
- `userId` — links to the created user account
- `status` — `pending_delivery`, `pending`, `accepted`, `cancelled`
- `tokenHash` — retained for potential future use (resend flow)
- `invitedByUserId` — actor who triggered the invitation
- `invitationScope` — `'platform'` (platform_admin) or `'company'` (all others)

---

## 6. Invitation Hierarchy

`POST /users/invite` enforces `INVITE_HIERARCHY`:

```typescript
const INVITE_HIERARCHY = {
  platform_admin: ['platform_admin'],
  company_owner:  ['company_admin', 'operator', 'viewer'],
  company_admin:  ['operator', 'viewer'],
};
```

`company_owner` is **not** an invitable role via this endpoint. Company owner accounts are created exclusively via `POST /companies/with-owner` (see DEC-009 §4.1).

**Error responses:**
- `403 Forbidden` — actor's role is not permitted to invite the target role
- `400 Bad Request` — `email` is missing or invalid
- `409 Conflict` — an account with the email already exists

---

## 7. Credential Security

### Rule: credentials are never returned in API responses

Temporary passwords must **never appear in API responses or server logs**.

### When the Notification Engine is configured

1. `tempPassword` is generated in memory.
2. Hashed and stored in `user.passwordHash`.
3. Passed once to `notifyEvent()` as `payload.data.tempPassword`.
4. Discarded from memory after the call returns.

### When company credentials are not configured

The Notification Engine returns a failed delivery result. The system:
- Logs a server-side warning only
- Returns `{ emailDelivered: false, message: "..." }` to the API caller
- **Does NOT include the temporary password** in the API response

To test in development: configure real credentials (e.g. Gmail SMTP, Mailtrap) or use the real Grapifly Gmail credentials already configured on the platform company.

---

## 8. Implementation Status

| Item | Status | Notes |
|---|---|---|
| `user.mustChangePassword` field | ✅ Done | |
| `invitation.status` including `pending_delivery` | ✅ Done | |
| `UsersService.createInvitedUser()` — temp password generation | ✅ Done | |
| `UsersService.createInvitationRecord()` | ✅ Done | |
| `POST /users/invite` enforces hierarchy | ✅ Done | |
| `company_owner` removed from `/users/invite` hierarchy | ⏳ Pending | |
| `notifyEvent()` called with full payload (incl. `tempPassword`, `companyName`, `loginUrl`) | ⏳ Pending | Currently missing these fields |
| `POST /companies/with-owner` triggers `notifyEvent` with full payload | ⏳ Pending | Currently uses PlatformMailService |
| `mustChangePassword` redirect on first login | ✅ Done | |
| Resend invitation endpoint | ⏳ Pending | |
