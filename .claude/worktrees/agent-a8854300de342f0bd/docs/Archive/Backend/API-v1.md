---
tags: [archived]
archived: true
archived_on: 2026-06-23
---

> **Archived Document**
>
> **Superseded by:** [Backend API Reference](../../Backend/API.md)
> **Archived on:** 2026-06-23
> **Reason:** Earlier endpoint listing from Obsidian vault (Sprint-001 era). Missing endpoints added in later sprints. Missing updated auth contract (5-role model, scope field, invitation hierarchy).

---

# Communication Backend — API (ARCHIVED)

Base URL (development): `http://localhost:3001`
Swagger UI: `http://localhost:3001/api`

**Authentication:** All endpoints require either a JWT Bearer token or an `x-api-key` header, unless marked **Public**.

> **⚠ Auth Contract Gap (2026-06-14):** The Auth section below documents the target contract. In the current implementation, login/refresh responses do not include `role` or `companyId`, `/auth/me` returns only `{ actorType, userId }`, and communication endpoints reject JWT Bearer requests. Full gap list and implementation order: [[Decisions/DEC-004 User Company Role Lifecycle]] Section 11. Required auth response contract: [[Decisions/DEC-004 User Company Role Lifecycle]] Section 7.

---

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness/readiness check — verifies Redis connectivity |

---

## Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user account |
| `GET` | `/auth/verify-email` | Public | Verify email address via token link |
| `POST` | `/auth/login` | Public | Login — returns access token + refresh token |
| `POST` | `/auth/refresh` | Public | Rotate tokens — old refresh token is revoked |
| `POST` | `/auth/logout` | Public | Revoke the provided refresh token |
| `POST` | `/auth/forgot-password` | Public | Send a password reset email |
| `POST` | `/auth/reset-password` | Public | Reset password using token from reset email |
| `GET` | `/auth/me` | JWT | Return the auth context of the current access token |
| `GET` | `/users/me` | JWT | Return full user profile (id, email, name, isEmailVerified, createdAt) |

**Token details:**
- Access token: `Authorization: Bearer <token>` — expires in `JWT_ACCESS_EXPIRES_IN` (default 15m)
- Refresh token: passed in request body — expires in `JWT_REFRESH_EXPIRES_IN` (default 7d)

**Required (not yet implemented):** Login and refresh responses must include `role` and `companyId` in the user object. `/auth/me` must return the full user profile matching `GET /users/me`. See DEC-003 GAP-2 and GAP-5.

---

## Companies (`/companies`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/companies` | JWT/Key | List all companies |
| `GET` | `/companies/:companyId` | JWT/Key | Get company by MongoDB ID |
| `GET` | `/companies/by-key/:companyKey` | JWT/Key | Get company by slug |
| `POST` | `/companies` | JWT/Key | Create a company |
| `POST` | `/companies/json` | JWT/Key | Create a company from a JSON payload |
| `PATCH` | `/companies/:companyKey` | JWT/Key | Update a company |
| `DELETE` | `/companies/:companyKey` | JWT/Key | Delete a company |

---

## Company Themes (`/company-themes`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/company-themes` | JWT/Key | List themes |
| `GET` | `/company-themes/:id` | JWT/Key | Get theme by ID |
| `POST` | `/company-themes` | JWT/Key | Create a theme |
| `PUT` | `/company-themes/:id` | JWT/Key | Replace a theme |
| `DELETE` | `/company-themes/:id` | JWT/Key | Delete a theme |

---

## Channels Catalogue (`/channels`)

| Method | Path | Auth | Description |
|---|---|---|---|
| *(read endpoints)* | `/channels` | JWT/Key | List/get platform-level channel definitions |

---

## Providers (`/providers`)

| Method | Path | Auth | Description |
|---|---|---|---|
| *(read endpoints)* | `/providers` | JWT/Key | List/get platform-level provider definitions |

---

## Company Channel Providers (`/company-channel-providers`)

| Method | Path | Auth | Description |
|---|---|---|---|
| *(CRUD)* | `/company-channel-providers` | JWT/Key | Assign providers to a company per channel |

---

## Provider Credentials (`/provider-credentials`)

| Method | Path | Auth | Description |
|---|---|---|---|
| *(CRUD)* | `/provider-credentials` | JWT/Key | Create and manage encrypted credentials per provider assignment |

---

## Domain Catalogue (`/domain-catalogue`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/domain-catalogue` | JWT/Key | Create a domain |
| `GET` | `/domain-catalogue` | JWT/Key | List domains |
| `GET` | `/domain-catalogue/:id` | JWT/Key | Get domain by ID |
| `PATCH` | `/domain-catalogue/:id` | JWT/Key | Update a domain |
| `DELETE` | `/domain-catalogue/:id` | JWT/Key | Delete a domain |
| `GET` | `/domain-catalogue/:id/credentials` | JWT/Key | Get credential routing for a domain |
| `PATCH` | `/domain-catalogue/:id/credentials/:channel` | JWT/Key | Update credential routing for a channel |
| `PATCH` | `/domain-catalogue/bulk/credentials` | JWT/Key | Bulk-update credential routing |

---

## Event Catalogue (`/event-catalogue`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/event-catalogue` | JWT/Key | Create a single event |
| `POST` | `/event-catalogue/bulk` | JWT/Key | Create multiple events |
| `GET` | `/event-catalogue` | JWT/Key | List events |
| `GET` | `/event-catalogue/:id` | JWT/Key | Get event by ID |
| `GET` | `/event-catalogue/by-company-event` | JWT/Key | Lookup by companyId + eventKey |
| `GET` | `/event-catalogue/runtime/:companyId/:eventKey` | JWT/Key | Runtime lookup (used internally at send time) |
| `PATCH` | `/event-catalogue/:id` | JWT/Key | Update an event |
| `DELETE` | `/event-catalogue/:id` | JWT/Key | Delete an event |

---

## Notifications (`/notifications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/notifications/event` | JWT/Key | Trigger a notification event — synchronous delivery, multi-channel |

### Response Contract (DEC-001 Option A)

| Scenario | HTTP Status | Body |
|---|---|---|
| All channels succeed | `200 OK` | `{ eventKey, companyId, results[] }` |
| One or more channels fail | `207 Multi-Status` | `{ eventKey, companyId, results[] }` |
| Invalid request / entity not found | `400` / `404` | Standard error body |

**Consumer rule:** Always inspect `results[]` regardless of HTTP status. A `207` does not mean all channels failed — some may have succeeded. Each `results[n].success` indicates the outcome for that channel.

```json
{
  "eventKey": "invoice.created",
  "companyId": "...",
  "results": [
    { "channel": "EMAIL", "provider": "sendgrid", "success": true, "error": null },
    { "channel": "SMS",   "provider": "twilio",   "success": false, "error": "Missing phone destination" }
  ]
}
```

---

## Layout Templates (`/layout-templates`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/layout-templates` | JWT/Key | Create a layout template |
| `GET` | `/layout-templates/by-company` | JWT/Key | List templates for a company |
| `GET` | `/layout-templates/default-by-company` | JWT/Key | Get the default template for a company |
| `GET` | `/layout-templates/company-overview` | JWT/Key | Summary view per company |
| `GET` | `/layout-templates/:id` | JWT/Key | Get template by ID |
| `PATCH` | `/layout-templates/:id` | JWT/Key | Update a template |
| `DELETE` | `/layout-templates/:id` | JWT/Key | Delete a template |

---

## Files — Media (`/files/media`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/files/media` | JWT/Key | Upload a file (multipart) |
| `PUT` | `/files/media` | JWT/Key | Replace / update a file |
| `DELETE` | `/files/media` | JWT/Key | Delete a file |
| `GET` | `/files/media/info` | JWT/Key | Get file metadata |

Max upload size: `MEDIA_MAX_MB` (default 5 MB). Files stored in S3 (`AWS_S3_BUCKET`).

---

## Files — Reports (`/files/reports`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/files/reports/generate/pdf` | JWT/Key | Generate a PDF report |

Generation is queue-backed (`FILE_GENERATION_QUEUE`).

---

## Files — Storage (`/files/storage`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/files/storage` | JWT/Key | Upload a file to S3 |
| `PUT` | `/files/storage` | JWT/Key | Replace a file in S3 |
| `DELETE` | `/files/storage` | JWT/Key | Delete a file from S3 |
| `GET` | `/files/storage/info` | JWT/Key | Get file info |
| `GET` | `/files/storage/download` | JWT/Key | Get a presigned download URL |

---

## Preview (`/preview`)

| Method | Path | Auth | Description |
|---|---|---|---|
| *(TBD)* | `/preview/*` | JWT/Key | Render a notification or template without sending |

---

## Pagination

All 9 list endpoints support offset-based pagination via query parameters.

| Parameter | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `limit` | integer | `50` | 1–200 | Max records to return |
| `offset` | integer | `0` | ≥ 0 | Records to skip |

**Response envelope** (all list endpoints):
```json
{
  "data": [...],
  "total": 243,
  "limit": 50,
  "offset": 0
}
```

Invalid values return `400 Bad Request`:
- `limit=0`, `limit=-1`, `limit=999` (exceeds max 200)
- `offset=-1`

Omitting both params returns the first 50 records — backwards-compatible with existing callers.

**Paginated endpoints:**

| Endpoint | Key filter params |
|---|---|
| `GET /companies` | `active` |
| `GET /company-themes` | `companyId`, `active` |
| `GET /channels` | `active` |
| `GET /providers` | `channelId`, `active` |
| `GET /company-channel-providers` | `companyId`, `channelId`, `active`, `isDefault` |
| `GET /provider-credentials` | `companyChannelProviderId`, `active` |
| `GET /domain-catalogue` | `companyId`, `active` |
| `GET /event-catalogue` | `domainCatalogueId`, `active` |
| `GET /layout-templates/by-company` | `companyId`, `templateType`, `active` |

> Note: `GET /layout-templates/by-company` always returns all themes; `limit`/`offset` apply to the `templates` array only. Response also includes `total`, `limit`, `offset` at the root.

---

## Notes

- `JWT/Key` means the endpoint accepts either a `Authorization: Bearer <token>` JWT or an `x-api-key: <COMMUNICATION_API_KEY>` header.
- There is no user-facing API key management system yet. `COMMUNICATION_API_KEY` is a static service-to-service secret.
- See [[Security]] for authentication details.
