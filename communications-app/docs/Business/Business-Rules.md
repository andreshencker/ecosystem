---
tags: [business]
---

# Business Rules

Rules that govern platform behaviour, constraints, and domain logic. All rules below are derived directly from the codebase — nothing here is speculative.

## Multi-Tenancy

- Every business entity (company themes, channel providers, credentials, domain catalogues, event catalogues, layout templates) is scoped to a `companyId`.
- Platform-level entities (users, refresh tokens, channels catalogue, providers catalogue) exist above the tenant boundary.
- `companyKey` is the stable, unique slug that identifies a tenant. It is used in routing and lookups and must not change once set.

## Authentication & Sessions

- All routes are protected by default. A route must be explicitly decorated with `@Public()` to allow unauthenticated access.
- Access tokens are JWTs with a 15-minute expiry (`JWT_ACCESS_EXPIRES_IN`).
- Refresh tokens are JWTs with a 7-day expiry (`JWT_REFRESH_EXPIRES_IN`) and are persisted in the `refresh_tokens` collection.
- On logout, the provided refresh token is revoked. On password reset, all refresh tokens for the user are revoked.
- Service-to-service calls authenticate via a static `COMMUNICATION_API_KEY` in the `x-api-key` header.

## Credential Encryption

- Provider credentials (API keys, SMTP passwords, OAuth tokens, AWS keys) are **always encrypted at rest** using AES-256-GCM.
- The master key (`CREDENTIALS_MASTER_KEY_BASE64`) must decode to exactly 32 bytes.
- The encryption envelope stores: algorithm, IV (base64), GCM auth tag (base64), ciphertext (base64).
- `ALLOW_DEBUG_DECRYPTED` must be `false` in production. Any environment where this is `true` is a non-production debug environment only.

## Channel & Provider Rules

- A company can assign multiple providers to the same channel (e.g. two different SMTP servers for email).
- Exactly one provider per (company + channel) is marked `isDefault`. This constraint is enforced at the database level with a partial unique index.
- Provider credentials are further namespaced by a `tag` (e.g. `"marketing"`, `"transactional"`). The combination of `(companyChannelProviderId, tag)` must be unique.

## Notifications

- Notification delivery is asynchronous and queue-backed (BullMQ). Sending a notification returns immediately; delivery happens in a worker.
- `QUEUE_NOTIFICATION_CONCURRENCY` (default: 5) controls how many notifications are processed in parallel.
- Notification routing is determined by the domain catalogue entry, which maps a domain + channel to a specific credential set. The notification engine does not pick providers at send time — it follows the pre-configured routing.

## File Generation

- PDF rendering uses Puppeteer (headless Chrome). Max concurrent instances: `PUPPETEER_MAX_CONCURRENT` (default: 3).
- File generation is queue-backed. `QUEUE_FILE_GENERATION_CONCURRENCY` (default: 3) controls parallelism.
- Maximum file size for media uploads: `MEDIA_MAX_MB` (default: 5 MB).

## Templates

- Layout templates are scoped to a company theme, not directly to a company.
- Exactly one template per (theme + type) can be `isDefault`. Enforced by a partial unique index.
- Templates declare `requiredVariables` — variables that must be provided at render time. Missing required variables are a render error.

## Compliance

- Credentials must never be stored in plaintext or returned in API responses.
- `ALLOW_DEBUG_DECRYPTED` is a feature flag that must remain `false` in all production environments.
- Unsubscribe URL is a first-class field on the company record, indicating compliance with email unsubscribe requirements is the company's responsibility.
