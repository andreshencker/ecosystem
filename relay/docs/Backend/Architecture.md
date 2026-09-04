---
tags: [module, communication, backend, architecture]
---

# Communication Backend — Architecture

The service is organised into three layers. Each layer is a set of NestJS modules.

```
┌─────────────────────────────────────────┐
│           Platform Layer                │
│     Auth · Users · PlatformMail         │
├─────────────────────────────────────────┤
│         Communication Layer             │
│  Channels · Notifications · Files ·     │
│  Company · Templates · Preview          │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │
│  Database · Redis · Queue · Logging ·   │
│  Security · Health                      │
└─────────────────────────────────────────┘
```

---

## Infrastructure Layer (`src/infrastructure/`)

Shared technical services with no business logic. All other layers depend on these.

### DatabaseModule
Connects to MongoDB via Mongoose. Database name: `MONGODB_DB_NAME` (`dbName` override in `DatabaseModule`, defaults to `relaydb`; local dev uses `relaydb_dev`). Default: MongoDB Atlas.

### RedisModule
Global singleton ioredis client. Used by QueueModule and any module that needs direct Redis access. Configured via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.

### QueueModule
Registers three BullMQ queues on Redis:

| Queue | Concurrency env var | Default |
|---|---|---|
| `NOTIFICATION_QUEUE` | `QUEUE_NOTIFICATION_CONCURRENCY` | 5 |
| `FILE_GENERATION_QUEUE` | `QUEUE_FILE_GENERATION_CONCURRENCY` | 3 |
| `AUDIT_QUEUE` | — | — |

### LoggingModule
Request logging middleware. Assigns a unique request ID to every inbound HTTP request for log correlation.

### SecurityModule
Platform-wide authentication infrastructure:
- **JwtStrategy** — validates Bearer tokens via `JWT_ACCESS_SECRET`
- **GlobalAuthGuard** — all routes are protected by default
- **`@Public()` decorator** — opt-out for public endpoints (login, register, etc.)
- **ApiKeyGuard** — validates `x-api-key` header against `COMMUNICATION_API_KEY`
- Decorators: `@CurrentUser()`, `@CurrentOrg()`

### HealthModule
Exposes `GET /health` via `@nestjs/terminus`. Checks Redis connectivity. Returns liveness/readiness status for Docker and Kubernetes probes.

### PlatformMailModule
Nodemailer-backed SMTP for platform-internal emails only (email verification, password reset). Not a tenant communication channel. Configured via `PLATFORM_SMTP_*` env vars.

---

## Platform Layer (`src/platform/`)

SaaS-level concerns: user identity and session management. Entities here are not company-scoped.

### AuthModule
Full authentication lifecycle:

| Feature | Detail |
|---|---|
| `POST /auth/register` | Creates user, sends verification email via PlatformMailService |
| `GET /auth/verify-email` | Token-based email verification |
| `POST /auth/login` | Returns access token (JWT, 15 min) + refresh token (JWT, 7 days) |
| `POST /auth/refresh` | Rotates both tokens; old refresh token revoked |
| `POST /auth/logout` | Revokes the provided refresh token |
| `POST /auth/forgot-password` | Sends password reset email |
| `POST /auth/reset-password` | Hashes new password, revokes all refresh tokens for user |
| `GET /auth/me` | Returns auth context of the current access token |

Refresh tokens are persisted in the `refresh_tokens` collection. Access tokens are stateless.

### UsersModule
User profile read and update operations. Users are created by the auth flow.

---

## Communication Layer (`src/communication/`)

Core business logic. All entities are company-scoped (multi-tenant).

### Channels (`channels/`)

**channels-catalogue** — platform-level channel type definitions (`email`, `sms`, `storage`).

**providers** — platform-level provider definitions (`gmail`, `twilio`, `aws-s3`, etc.).

**company-channel-providers** — junction: which provider a company uses per channel. Multiple providers per channel allowed; exactly one `isDefault` per (company + channel).

**provider-credentials** — encrypted credential storage. AES-256-GCM with `CREDENTIALS_MASTER_KEY_BASE64`. Namespaced by `tag` (e.g. `"marketing"`, `"transactional"`).

**channels-runtime** — resolves the active provider + credentials for a company + channel at send time.

**implementation** — concrete channel implementations (email sender, SMS sender, S3 uploader). Factory pattern — the runtime selects the correct implementation based on `connectionType`.

### Company (`company/`)

**company-info** — tenant master record: identity, contact, address, URLs, social links, legal text, logos, timezone (default: `Australia/Sydney`).

**company-theme** — visual brand per company: colours (primary, secondary, background, surface, text, border, link) and typography. One theme is `isDefault` per company.

### Notifications (`notifications/`)

**notification** — orchestration entry point. `POST /notifications/event` pipeline:
1. Resolve event catalogue entry for `eventKey` + company
2. Resolve domain catalogue for channel routing
3. Resolve provider credentials for each channel
4. Enqueue job to `NOTIFICATION_QUEUE`
5. Queue worker renders template and dispatches via channel implementation

**domain-catalogue** — groups events into business domains (e.g. `invoices`, `support`). Defines which channels and credentials to route to. Company-scoped.

**event-catalogue** — individual notification event definitions per domain. Fields: `eventKey`, `eventType` (`notification` | `alert` | `request`), `channelContent` per channel. Supports bulk creation.

**layout-templates** — HTML + CSS email/PDF templates. Scoped to a company theme. Declares `requiredVariables` and `optionalVariables`.

**template-engine** — renders layout templates: merges HTML/CSS with event content and resolves variable substitution.

### Files (`files/`)

**generator** — file output:
- PDF via Puppeteer (max concurrent: `PUPPETEER_MAX_CONCURRENT`, default 3)
- XLSX via ExcelJS
- CSV native

**media** — user-uploaded files. `POST /files/media` (multipart). Stored in S3. Max: `MEDIA_MAX_MB` (default 5 MB).

**reports** — on-demand report generation. `POST /files/reports/generate/pdf`.

**storage** — direct S3 operations: upload, update, delete, info, presigned download URL.

### Preview (`preview/`)
Renders a notification or template for preview without sending or persisting anything.

### Common (`common/`)

**source-of-truth** — data retrieval abstraction. Decouples the notification engine from MongoDB queries.

**template-engine** — shared rendering utilities used across modules.

**security** — communication-layer-specific guards (separate from the infrastructure SecurityModule).

---

## Containerisation

`communication/Dockerfile` — multi-stage build:

| Stage | Base | Purpose |
|---|---|---|
| `builder` | `node:20-alpine` | Install deps, compile TypeScript → `dist/` |
| Runtime | `node:20-alpine` | Copy `dist/` + `node_modules`, run `node dist/main` |

`NODE_ENV` build argument controls environment-specific compilation. Port 3001 exposed.

Local dev stack via `docker-compose.yml`: Redis 7 Alpine (`cp_redis`, port 6379). MongoDB is Atlas by default; a local option is commented out.

---

## Related Docs

- [[Overview]] — purpose, tech stack, how to run
- [[Database]] — all MongoDB schemas
- [[Security]] — auth strategy, credential encryption detail
- [[Environment]] — environment variable reference
- [[Global Architecture]] — platform-level layer design
