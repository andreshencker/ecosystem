---
tags: [archived]
archived: true
archived_on: 2026-06-23
---

> **Archived Document**
>
> **Superseded by:** [Backend Database](../../Backend/Database.md)
> **Archived on:** 2026-06-23
> **Reason:** Pre-Amendment schema from Obsidian vault. Missing fields: `company.ownerUserId`, `company.createdByUserId`, `company.isPlatformCompany`, `invitation.invitationScope`, `invitation.senderCredentialScope`. Missing planned collections: `communication_templates`, `company_branding`.

---

# Communication Backend — Database (ARCHIVED)

## MongoDB

**Provider:** MongoDB Atlas (cloud-managed by default; local option commented out in `docker-compose.yml`)
**Database name:** `communication_platform_db`
**ODM:** Mongoose 9
**Connection:** `MONGODB_URI` environment variable

All business collections are company-scoped. Platform collections (`users`, `refresh_tokens`, `channels`, `providers`) exist above the tenant boundary.

---

## Collections

### `users`
Platform user accounts. Not company-scoped.

| Field | Type | Notes |
|---|---|---|
| email | String | Unique |
| passwordHash | String | bcrypt |
| firstName | String | |
| lastName | String | |
| isEmailVerified | Boolean | |
| emailVerificationToken | String | Cleared on verification |
| passwordResetToken | String | |
| passwordResetExpires | Date | |
| createdAt / updatedAt | Date | Auto-managed |

---

### `refresh_tokens`
JWT refresh token store. Not company-scoped.

| Field | Type | Notes |
|---|---|---|
| userId | ObjectId | Ref: users |
| token | String | Hashed |
| expiresAt | Date | |
| createdAt | Date | |

---

### `channels`
Platform-level channel type definitions. Seeded data — not created per-company.

| Field | Type | Notes |
|---|---|---|
| channelKey | String | Unique: `email`, `sms`, `storage` |
| displayName | String | |
| description | String | |
| contentFormat | Enum | `html` \| `text` \| `binary` |
| supportsTemplates | Boolean | |
| supportsFiles | Boolean | |
| isActive | Boolean | |

---

### `providers`
Platform-level provider definitions. Seeded data — not created per-company.

| Field | Type | Notes |
|---|---|---|
| providerKey | String | Unique: e.g. `gmail`, `twilio`, `aws-s3` |
| displayName | String | |
| channelId | ObjectId | Ref: channels |
| connectionType | Enum | `api_key` \| `smtp` \| `oauth` \| `access_keys` |
| isActive | Boolean | |

---

### `companies`
One document per tenant. `companyKey` is the stable slug used throughout the system.

| Field | Type | Notes |
|---|---|---|
| companyKey | String | Unique slug — treat as immutable after creation |
| displayName | String | |
| legalName | String | |
| tagline | String | |
| timezone | String | Default: `Australia/Sydney` |
| supportEmail / supportPhone / supportHours | String | |
| address (line1, line2, city, state, postal, country) | String | |
| webBaseUrl / apiBaseUrl / helpCenterUrl | String | |
| privacyPolicyUrl / termsUrl / unsubscribeUrl | String | |
| social (facebook, instagram, linkedin, x, youtube, tiktok, whatsapp, telegram) | String | |
| copyrightText / disclaimerShort / disclaimerLong | String | |
| logoIconUrl / logoFullUrl | String | |
| isActive | Boolean | |
| createdAt / updatedAt | Date | |

---

### `company_themes`
Visual brand themes. A company can have multiple; one is `isDefault`.

| Field | Type | Notes |
|---|---|---|
| companyId | ObjectId | Ref: companies |
| label | String | |
| primaryColor / secondaryColor | String | Hex |
| backgroundColor / surfaceColor | String | |
| textColor / mutedTextColor / borderColor / linkColor | String | |
| fontFamily | String | |
| fontSizeBase / fontWeightNormal / fontWeightBold | String | |
| isDefault | Boolean | Partial unique index: unique per company when true |
| isActive | Boolean | |
| createdAt / updatedAt | Date | |

---

### `company_channel_providers`
Links a company to the provider it uses for a given channel.

| Field | Type | Notes |
|---|---|---|
| companyId | ObjectId | Ref: companies |
| providerId | ObjectId | Ref: providers |
| channelId | ObjectId | Ref: channels (denormalised for fast queries) |
| isDefault | Boolean | Partial unique index: unique per (company + channel) when true |
| isActive | Boolean | |

---

### `provider_credentials`
Encrypted credentials for a company + channel + provider assignment.

| Field | Type | Notes |
|---|---|---|
| companyChannelProviderId | ObjectId | Ref: company_channel_providers |
| tag | String | e.g. `"marketing"`, `"transactional"` |
| encrypted.alg | String | Always `aes-256-gcm` |
| encrypted.ivBase64 | String | Initialisation vector |
| encrypted.tagBase64 | String | GCM authentication tag |
| encrypted.dataBase64 | String | Ciphertext |
| isActive | Boolean | |
| Unique constraint | | (companyChannelProviderId + tag) |

---

### `domain_catalogues`
Business domains that group notification events and define channel routing.

| Field | Type | Notes |
|---|---|---|
| companyId | ObjectId | Ref: companies |
| domainKey | String | Unique per company (e.g. `invoices`, `support`) |
| displayName | String | |
| domainCategory | String | |
| channelsToUse | Array | `[{ channel: 'email'\|'sms', providerCredentialsId }]` |
| isActive | Boolean | |

---

### `event_catalogues`
Individual notification event definitions within a domain.

| Field | Type | Notes |
|---|---|---|
| domainCatalogueId | ObjectId | Ref: domain_catalogues |
| eventKey | String | Unique per domain (e.g. `invoice.created`, `payment.overdue`) |
| displayName / description | String | |
| eventType | Enum | `notification` \| `alert` \| `request` |
| channelContent.email | Object | Subject, body, template variables |
| channelContent.sms | Object | Text content, template variables |
| isActive | Boolean | |

---

### `layout_templates`
HTML + CSS layout wrappers for email and PDF output. Scoped to a company theme.

| Field | Type | Notes |
|---|---|---|
| companyThemeId | ObjectId | Ref: company_themes |
| templateType | Enum | `email` \| `pdf` |
| key | String | Unique per (theme + type) |
| name | String | |
| html | String | Template HTML |
| css | String | Template CSS |
| requiredVariables | String[] | Must be provided at render time |
| optionalVariables | String[] | May be provided at render time |
| isDefault | Boolean | Partial unique index: unique per (theme + type) when true |
| isActive | Boolean | |

---

## Entity Relationships

```
companies
  ├── company_themes
  │     └── layout_templates
  ├── company_channel_providers
  │     ├── → channels  (platform-level)
  │     ├── → providers (platform-level)
  │     └── provider_credentials
  └── domain_catalogues
        └── event_catalogues

users
  └── refresh_tokens

channels  (platform-level seed data, not company-scoped)
providers (platform-level seed data, not company-scoped)
```

---

## Redis

**Version:** 7 (Alpine)
**Client:** ioredis 5.11.1
**Connection:** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

Used exclusively as the BullMQ queue backend. Three queues:

| Queue name | Purpose | Concurrency env var | Default |
|---|---|---|---|
| `NOTIFICATION_QUEUE` | Outbound email / SMS delivery | `QUEUE_NOTIFICATION_CONCURRENCY` | 5 |
| `FILE_GENERATION_QUEUE` | PDF / XLSX / CSV generation | `QUEUE_FILE_GENERATION_CONCURRENCY` | 3 |
| `AUDIT_QUEUE` | Audit logging | — | — |

Redis is not used for application-level caching — only for queue persistence.
