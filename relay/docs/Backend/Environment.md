---
tags: [module, communication, backend, environment]
---

# Communication Backend — Environment Variables

Source of truth: `communication/.env.example`

> Never commit `.env` to the repository. Store all secrets in a secrets manager.

---

## Application

| Variable | Default | Required | Description |
|---|---|---|---|
| `NODE_ENV` | `development` | Yes | `development`, `staging`, or `production` |
| `PORT` | `3001` | Yes | HTTP port the server binds to |
| `APP_BASE_URL` | `http://localhost:3001` | Yes | Full base URL — used in email links (verification, password reset) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Yes | Comma-separated CORS origins |

---

## MongoDB

| Variable | Default | Required | Description |
|---|---|---|---|
| `MONGODB_URI` | — | Yes | Full connection string. The db name comes from `MONGODB_DB_NAME`, not the URI path. Example: `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `MONGODB_DB_NAME` | `relaydb` | No | Database name (`dbName` override in `DatabaseModule`). Prod leaves it unset; local dev sets `relaydb_dev` so it never shares a database with prod. |

---

## Security

| Variable | Default | Required | Description |
|---|---|---|---|
| `COMMUNICATION_API_KEY` | — | Yes | Static key for service-to-service calls (`x-api-key` header). Never expose to external clients. |
| `CREDENTIALS_MASTER_KEY_BASE64` | — | Yes | AES-256 master key, base64-encoded. Must decode to exactly 32 bytes. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

---

## JWT

| Variable | Default | Required | Description |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | — | Yes | Secret for access token signing. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | — | Yes | Secret for refresh token signing |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | No | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | No | Refresh token TTL |

---

## Redis

| Variable | Default | Required | Description |
|---|---|---|---|
| `REDIS_HOST` | `localhost` | Yes | Redis hostname |
| `REDIS_PORT` | `6379` | Yes | Redis port |
| `REDIS_PASSWORD` | — | No | Leave blank if Redis has no password |

---

## AWS / S3

| Variable | Default | Required | Description |
|---|---|---|---|
| `AWS_REGION` | — | Yes | AWS region (e.g. `ap-southeast-2`) |
| `AWS_S3_BUCKET` | — | Yes | S3 bucket for media and file storage |
| `AWS_ACCESS_KEY_ID` | — | Yes* | AWS access key. Not required if using IAM role. |
| `AWS_SECRET_ACCESS_KEY` | — | Yes* | AWS secret key. Not required if using IAM role. |
| `MEDIA_PUBLIC_BASE_URL` | — | Yes | Base URL for publicly accessible media files |
| `MEDIA_MAX_MB` | `5` | No | Maximum media upload size in MB |

---

## Platform SMTP

Used only for platform-level emails (user verification, password reset). Not the tenant's email provider.

| Variable | Default | Required | Description |
|---|---|---|---|
| `PLATFORM_SMTP_HOST` | — | Yes | SMTP server hostname |
| `PLATFORM_SMTP_PORT` | `587` | No | SMTP port |
| `PLATFORM_SMTP_SECURE` | `false` | No | `true` for TLS, `false` for STARTTLS |
| `PLATFORM_SMTP_USER` | — | Yes | SMTP username |
| `PLATFORM_SMTP_PASS` | — | Yes | SMTP password |
| `PLATFORM_SMTP_FROM_EMAIL` | — | Yes | From address |
| `PLATFORM_SMTP_FROM_NAME` | `Communication Platform` | No | From display name |

---

## Concurrency & Processing

| Variable | Default | Required | Description |
|---|---|---|---|
| `CHANNEL_TIMEOUT_MS` | `10000` | No | Maximum time in ms for a single channel send operation (SMTP, Twilio, etc.) before it is abandoned. Returns `{ success: false, error: "Provider timeout" }`. Must be > 0. Added in Sprint-001 AP-003. |
| `PUPPETEER_MAX_CONCURRENT` | `3` | No | Max concurrent headless Chrome instances for PDF generation |
| `QUEUE_NOTIFICATION_CONCURRENCY` | `5` | No | Parallel notification delivery jobs |
| `QUEUE_FILE_GENERATION_CONCURRENCY` | `3` | No | Parallel file generation jobs |

---

## Feature Flags

| Variable | Default | Required | Description |
|---|---|---|---|
| `ALLOW_DEBUG_DECRYPTED` | `false` | No | **Must be `false` in production.** Enables a debug mode for credential inspection. |

---

## Minimum Required for Local Development

At minimum, set these before starting the server:

```
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<random hex>
JWT_REFRESH_SECRET=<random hex>
CREDENTIALS_MASTER_KEY_BASE64=<32-byte base64>
COMMUNICATION_API_KEY=<any secret string>
PLATFORM_SMTP_HOST=...
PLATFORM_SMTP_USER=...
PLATFORM_SMTP_PASS=...
PLATFORM_SMTP_FROM_EMAIL=...
```

AWS and Redis values are only required if using file storage or notifications end-to-end. Redis must be running via `docker compose up -d`.
