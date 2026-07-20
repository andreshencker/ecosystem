# Backend Database Architecture

| Field | Value |
|---|---|
| Last Updated | 2026-06-23 |
| Governs | `communications-backend` MongoDB collections |
| Depends on | DEC-004, DEC-005 |

---

## 1. Engine

MongoDB via Mongoose (NestJS `@nestjs/mongoose`). Single Atlas/replica-set connection configured in `src/infrastructure/database/database.module.ts`.

---

## 2. Collection Inventory

| Collection | Schema file | Purpose |
|---|---|---|
| `users` | `platform/users/schemas/user.schema.ts` | All platform users across all roles |
| `invitations` | `platform/users/schemas/invitation.schema.ts` | Pending/accepted/expired invitations |
| `refresh_tokens` | `platform/auth/schemas/refresh-token.schema.ts` | JWT refresh token rotation store |
| `companies` | `communication/company/company-info/schemas/company.schema.ts` | Company records (`isPlatformCompany` field added — DEC-007) |
| `company_themes` | `communication/company/company-theme/schemas/company-theme.schema.ts` | Per-company UI themes |
| `channels_catalog` | `communication/channels/channels-catalogue/schemas/channel-catalog.schema.ts` | Global channel types (email, SMS, storage) |
| `providers` | `communication/channels/providers/schemas/provider.schema.ts` | Global channel provider catalogue |
| `company_channel_providers` | `communication/channels/company-channel-providers/schemas/company-channel-provider.schema.ts` | Company ↔ Provider assignments |
| `provider_credentials` | `communication/channels/provider-credentials/schemas/provider-credentials.schema.ts` | Encrypted company provider credentials (includes platform company credentials) |
| `domain_catalogue` | `communication/notifications/events/domain-catalogue/schemas/domain-catalogue.schema.ts` | Company domain groupings |
| `event_catalogue` | `communication/notifications/events/event-catalogue/schemas/event-catalogue.schema.ts` | Per-domain notification events |
| `layout_templates` | `communication/notifications/template/layout-templates/schemas/layout-template.schema.ts` | Company notification templates |
| `communication_templates` | `infrastructure/communication/schemas/communication-template.schema.ts` | Platform and company communication templates by type (DEC-008 — planned) |
| `company_branding` | `communication/company/branding/schemas/company-branding.schema.ts` | Per-company sender identity and branding (DEC-008 — planned) |

---

## 3. Core Relationship Diagram

```
companies
  _id (PK)
  companyKey           (unique)
  isPlatformCompany    (boolean, default: false; unique partial index enforces single platform company)
  ownerUserId    ──────────────────→ users._id   (sparse)
  createdByUserId ─────────────────→ users._id

users
  _id (PK)
  email                (unique)
  role                 (enum: 5 values)
  scope                (global | company)
  companyId  ──────────────────────→ companies._id   (sparse)
  companyKey           (denormalised slug)
  isActive             (boolean, default: true)

invitations
  _id (PK)
  email
  role                 (all 5 roles)
  companyId  ──────────────────────→ companies._id   (null for platform scope)
  companyKey
  tokenHash            (unique)
  status               (pending | accepted | expired | cancelled)
  invitationScope      (platform | company)
  senderCredentialScope (platform | company)
  invitedByUserId ─────────────────→ users._id

refresh_tokens
  _id (PK)
  userId     ──────────────────────→ users._id
  tokenHash            (unique)
  isRevoked
  expiresAt            (TTL index)

company_channel_providers
  _id (PK)
  companyId  ──────────────────────→ companies._id
  providerId ──────────────────────→ providers._id
  channelId  ──────────────────────→ channels_catalog._id
  isDefault

provider_credentials
  _id (PK)
  companyChannelProviderId ────────→ company_channel_providers._id
  tag
  encrypted            (AES-256-GCM blob)
```

---

## 4. Company ↔ User Relationship

The ownership relationship is tracked in **both directions**:

| Direction | Field | Purpose |
|---|---|---|
| User → Company | `user.companyId` | Every company-scoped user belongs to exactly one company |
| Company → User | `company.ownerUserId` | Fast lookup: "who owns this company?" |
| Company → Creator | `company.createdByUserId` | Audit trail: "who created this company?" |

**Rules:**
- `company.ownerUserId` is set atomically at creation — never `null` after creation completes.
- Set on public registration (`POST /auth/register`): the registering user becomes the owner.
- Set when `platform_admin` creates a company via `POST /companies/with-owner`: the invited user becomes the owner.
- Updated on ownership transfer (not yet implemented).
- `company.createdByUserId` is set once at creation and never updated.

---

## 5. Index Catalogue

### users

| Index | Type | Purpose |
|---|---|---|
| `email` | unique | Login / duplicate prevention |
| `role` | sparse | Role-based queries |
| `companyId` | sparse | "All users in company X" |
| `isActive` | sparse | Active-user filter |
| `isEmailVerified` | — | (built-in) |
| `emailVerificationToken` | sparse | Token lookup |
| `passwordResetToken` | sparse | Token lookup |

### companies

| Index | Type | Purpose |
|---|---|---|
| `companyKey` | unique | Slug uniqueness |
| `isActive` | — | Active company filter |
| `ownerUserId` | sparse | "Company owned by user X" |
| `isPlatformCompany` | unique partial (`isPlatformCompany: true`) | Enforces that at most one company is the platform company |

### invitations

| Index | Type | Purpose |
|---|---|---|
| `tokenHash` | unique | Accept-invitation token lookup |
| `email` | — | "Has this email been invited?" |
| `companyId + status` | compound | Company's pending invitations |
| `invitationScope + status` | compound | Platform admin pending invitations |

### refresh_tokens

| Index | Type | Purpose |
|---|---|---|
| `tokenHash` | unique | Token lookup |
| `userId + isRevoked` | compound | Session revocation |
| `expiresAt` | TTL | Automatic cleanup |

---

## 6. Migration History

| Date | Change | File |
|---|---|---|
| 2026-06-14 | Initial: users, invitations, refresh_tokens, companies | Sprint-001 |
| 2026-06-16 | Add `company.ownerUserId`, `company.createdByUserId` | DEC-005 implementation |
| 2026-06-16 | Add `invitation.invitationScope`, `invitation.senderCredentialScope`; expand role enum to include `platform_admin` | DEC-006 implementation |
| 2026-06-23 | Add `company.isPlatformCompany: Boolean (default: false)`; create unique partial index `{ isPlatformCompany: 1 }` where `isPlatformCompany: true` | DEC-007 / ADR-005 |
| 2026-06-23 | Add `user.role`, `user.scope`, `user.companyId`, `user.companyKey`, `user.isActive` to users schema; export `UserRole` / `UserScope` types from `user.schema.ts`; add `role` and `isActive` indexes | DEC-008 A1/A3 — type fix |
| 2026-06-23 | `UsersBootstrapService` registered in `UsersModule`; bootstrap creates Grapifly platform company then seeds `admin@grapifly.com` with `companyId = <grapifly._id>` — replaces null-companyId approach (DEC-008 A3) | DEC-008 A3 bootstrap |
| 2026-06-23 | `GET /users` list endpoint added to `UsersController`; `UsersService.listByCompanyId()` added; resolves company scope from DB (actor lookup) since JWT doesn't carry role/scope yet | DEC-008 A3.10 gap workaround |
| 2026-06-24 | Add `user.mustChangePassword: Boolean (default: false)` — set for admin-invited users | DEC-013 |
| 2026-06-24 | Add `invitation.userId: String\|null` and `invitation.status='pending_delivery'` (email undelivered) | DEC-013 |
| 2026-06-23 (planned) | Add `communication_templates` collection; add `company_branding` collection; add `invitation.communicationType` field | DEC-012 / ADR-006 |

### Backfill required after deploy

**platform_admin companyId (DEC-008 A3):** If `admin@grapifly.com` already exists in the database with `companyId: null`, the bootstrap service will patch it automatically on next startup. No manual action required — the bootstrap detects the stale record and updates it.

**companies:** For each existing company document, find the user where `companyId = company._id AND role = 'company_owner'` and set `ownerUserId = user._id` and `createdByUserId = user._id`.

**invitations:** For each existing invitation document, set `invitationScope = 'platform'` and `senderCredentialScope = 'platform'` where `role IN (company_owner)`, and `invitationScope = 'company'` / `senderCredentialScope = 'company'` where `role IN (company_admin, operator, viewer)`.

```js
// Backfill companies ↔ owners
db.getCollection('companies').find({}).forEach(company => {
  const owner = db.getCollection('users').findOne({
    companyId: String(company._id),
    role: 'company_owner',
  });
  if (owner) {
    db.getCollection('companies').updateOne(
      { _id: company._id },
      { $set: { ownerUserId: String(owner._id), createdByUserId: String(owner._id) } }
    );
  }
});

// Backfill invitations scope
db.getCollection('invitations').updateMany(
  { role: { $in: ['company_admin', 'operator', 'viewer'] } },
  { $set: { invitationScope: 'company', senderCredentialScope: 'company' } }
);
db.getCollection('invitations').updateMany(
  { invitationScope: { $exists: false } },
  { $set: { invitationScope: 'platform', senderCredentialScope: 'platform' } }
);
```
