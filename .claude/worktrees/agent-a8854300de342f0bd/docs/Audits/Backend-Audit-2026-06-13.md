---
tags: [module, communication, backend, audit]
audit-date: 2026-06-13
status: final
immutable: true
---

# Communication Backend — Readiness Audit

**Date:** 2026-06-13
**Auditor:** Claude Code (automated source analysis + build run)
**Scope:** Full backend readiness assessment prior to frontend development

> This document is a historical snapshot. It must not be edited after creation.
> For current work status, see [[Current Sprint]] and [[Backlog]].
> For open debt items, see the [[Technical Debt/]] folder.
> For decisions made as a result of this audit, see [[Decisions/Backend-Readiness-Decision]].

---

## Build & Test Results

| Check | Result | Detail |
|---|---|---|
| `npm run build` | PASS | Exit 0 — `dist/main.js` produced, no TypeScript errors |
| `npm test` | PASS | 1 test suite, 1 test — `AppController.getHello()` smoke test only |
| `npm run test:e2e` | PASS (vacuous) | `test/jest-e2e.json` exists; 0 test files found — passes with no tests |

---

## Checklist

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Project builds | READY | Exit 0, no TypeScript errors |
| 2 | Application starts | PARTIALLY READY | `main.ts` well-formed; unconfirmed with live env vars |
| 3 | Environment variables | READY | `.env.example` complete and accurate |
| 4 | MongoDB integration | READY | Mongoose wired, health check pings DB |
| 5 | Redis / BullMQ | PARTIALLY READY | Client wired; queues registered; no processors |
| 6 | Authentication flow | READY | All 8 endpoints implemented |
| 7 | JWT protection | READY | `GlobalAuthGuard` + `JwtStrategy` |
| 8 | API key protection | PARTIALLY READY | Static env var key works; scoped guard is a stub |
| 9 | Swagger | READY | Available at `/docs` |
| 10 | Company endpoints | READY | Full CRUD + logo upload |
| 11 | Provider endpoints | READY | Channels, providers, company-channel-providers |
| 12 | Credential endpoints | READY | AES-256-GCM encrypt/decrypt confirmed in source |
| 13 | Template endpoints | READY | Layout templates + template engine |
| 14 | Notification endpoints | PARTIALLY READY | SMTP + Twilio work; SendGrid/Mailgun/OAuth stubs |
| 15 | File generation | READY | PDF (Puppeteer), XLSX (ExcelJS), CSV |
| 16 | AWS S3 | READY | Access keys + IAM role, presigned URLs |
| 17 | Error handling | READY | `HttpException` throughout, duplicate key handling |
| 18 | Validation | READY | `ValidationPipe` global, 60 DTOs, `class-validator` |
| 19 | Logging | READY | Structured JSON, request ID per request |
| 20 | Unit tests | NOT READY | 1 smoke test — effectively 0% coverage |
| 21 | E2E tests | NOT READY | Config exists, 0 test files |

---

## Module Status

| Module | Status | Notes |
|---|---|---|
| Build (TypeScript) | READY | |
| Auth (all 8 endpoints) | READY | |
| Users | READY | |
| JWT Guard | READY | |
| API Key — static `COMMUNICATION_API_KEY` | READY | |
| API Key — scoped `ApiKeyAuthGuard` | NOT READY | Stub — always returns false |
| Swagger | READY | `/docs` |
| Company CRUD | READY | |
| Company Theme CRUD | READY | |
| Channels Catalogue | READY | |
| Providers Catalogue | READY | |
| Company Channel Providers | READY | |
| Provider Credentials (encrypt/decrypt) | READY | |
| Domain Catalogue | READY | |
| Event Catalogue | READY | |
| Notifications — SMTP email | READY | |
| Notifications — Twilio SMS | READY | |
| Notifications — SendGrid email | PARTIALLY READY | Credential verify OK; send returns "not implemented" |
| Notifications — Mailgun email | PARTIALLY READY | Credential verify OK; send returns "not implemented" |
| Notifications — OAuth email | NOT READY | Send not implemented |
| Notifications — OAuth SMS | NOT READY | Send not implemented |
| Notifications — queue-based dispatch | NOT READY | Dispatch is synchronous; no queue processors |
| Layout Templates | READY | |
| Template Engine | READY | Variable substitution + CSS injection |
| PDF Generation (Puppeteer) | READY | |
| XLSX Generation (ExcelJS) | READY | |
| CSV Generation | READY | |
| Media Upload (S3) | READY | |
| Storage — S3 access keys | READY | Presigned URLs included |
| Storage — S3 IAM role | READY | |
| Preview (email / SMS / report) | READY | |
| Health Check | READY | MongoDB + Redis |
| Structured Logging | READY | JSON to stdout/stderr |
| Request ID Tracing | READY | |
| Validation (DTOs + pipe) | READY | 60 DTOs, whitelist enforced |
| Error Handling | READY | |
| Queue Infrastructure | READY | 3 queues registered |
| Queue Processors | NOT READY | 0 processor files |
| Unit Tests | NOT READY | 1 smoke test |
| E2E Tests | NOT READY | 0 tests |
| Platform Mail (SMTP) | READY | Nodemailer for platform emails |

---

## Critical Findings

### CF-1 — Notification endpoint returns HTTP 200 on delivery failure

`POST /notifications/event` always returns 200 regardless of whether the notification was delivered. Delivery failure is indicated only in the response body `results[].success`. Any consumer that checks only HTTP status will believe delivery succeeded.

```json
{
  "eventKey": "invoice.created",
  "companyId": "...",
  "results": [
    {
      "channel": "EMAIL",
      "provider": "sendgrid",
      "success": false,
      "error": "SendGrid email send not implemented yet (contract OK)"
    }
  ]
}
```

**Decision required** — see [[Decisions/Backend-Readiness-Decision]].

---

### CF-2 — SendGrid, Mailgun, and OAuth channels are credential-only stubs

`verifyCredentials()` works for all providers. `sendEmail()` and `sendSms()` for SendGrid, Mailgun, Gmail OAuth, and OAuth SMS return `{ success: false, error: "not implemented yet" }`.

**Affected files:**
- `src/communication/channels/implementation/email/api_key/sendgrid-email.channel.ts`
- `src/communication/channels/implementation/email/api_key/mailgun-email.channel.ts`
- `src/communication/channels/implementation/email/oauth/oauth-email.channel.ts`
- `src/communication/channels/implementation/sms/oauth/oauth-sms.channel.ts`

---

### CF-3 — Notification dispatch is synchronous with no timeout

`NotificationService.notifyEvent()` calls channel implementations directly on the HTTP thread. No timeout configured on SMTP, Twilio, or any other channel. Provider hangs will hang the HTTP connection.

---

### CF-4 — Queue infrastructure is wired but entirely unused

`NOTIFICATION_QUEUE`, `FILE_GENERATION_QUEUE`, and `AUDIT_QUEUE` are registered with BullMQ. Zero processor files exist in the codebase. No `queue.add()` calls exist in any service.

---

### CF-5 — `ApiKeyAuthGuard` is a documented stub

`canActivate()` unconditionally returns `false`. `tryAuthenticate()` returns `null`. The implementation plan is written in comments but not coded. Only the static `COMMUNICATION_API_KEY` env var works.

**File:** `src/infrastructure/security/guards/api-key-auth.guard.ts`

---

### CF-6 — Zero meaningful test coverage

1 test file (`src/app.controller.spec.ts`) verifies that `getHello()` returns `"Hello World!"`. No service, guard, controller, or DTO has a test.

---

## Frontend Readiness at Audit Date

### APIs confirmed working end-to-end

All auth endpoints, company CRUD, company themes, channels catalogue, providers, company-channel-providers, provider credentials (with encryption), domain catalogue, event catalogue, layout templates, notifications via SMTP and Twilio, PDF/XLSX/CSV generation, media upload, S3 storage with presigned URLs, preview, health check.

### APIs not yet usable

| Gap | Severity |
|---|---|
| SendGrid / Mailgun / OAuth channels — credential verify only, send is a stub | High |
| No pagination on any list endpoint | High |
| No notification delivery history endpoint | Medium |
| No scoped API key management (`/api-keys`) | Low |
| No audit log endpoint | Low |

### Breaking issues at audit date

| ID | Issue | Severity |
|---|---|---|
| BRK-001 | Notification endpoint returns HTTP 200 on delivery failure | High |
| BRK-002 | SendGrid / Mailgun / OAuth return `success: false` silently | High |
| BRK-003 | No timeout on channel implementations — HTTP hangs on slow providers | Medium |
| BRK-004 | No pagination — list endpoints return full collection | Medium |
| BRK-005 | Refresh token in response body (not HTTP-only cookie) | Low |

---

## Technical Debt Identified

17 debt items identified. One file per item in [[Technical Debt/]].

| ID | Area | Description |
|---|---|---|
| TD-001 | Security | `ApiKeyAuthGuard` stub — always returns false |
| TD-002 | Channels | SendGrid `sendEmail()` not implemented |
| TD-003 | Channels | Mailgun `sendEmail()` not implemented |
| TD-004 | Channels | OAuth email `sendEmail()` not implemented |
| TD-005 | Channels | OAuth SMS `sendSms()` not implemented |
| TD-006 | Queue | No BullMQ processors — queues unused at runtime |
| TD-007 | Performance | Notification dispatch synchronous, no timeout |
| TD-008 | Data | No notification delivery history |
| TD-009 | API | No pagination on list endpoints |
| TD-010 | Security | No rate limiting |
| TD-011 | Reliability | No retry / dead-letter queue |
| TD-012 | Observability | Audit queue unused, no audit logging |
| TD-013 | Performance | File generation synchronous, queue unused |
| TD-014 | Testing | 0% meaningful unit test coverage |
| TD-015 | Testing | 0 e2e tests |
| TD-016 | Security | Refresh token in response body |
| TD-017 | Security | No request signing on notification endpoint |

---

## Actions Raised

16 action items raised from this audit. Full detail with acceptance criteria in [[Backlog]].

| ID | Description | Priority |
|---|---|---|
| AP-001 | Implement SendGrid email send | P0 |
| AP-002 | Implement Mailgun email send | P0 |
| AP-003 | Add timeout to channel implementations | P0 |
| AP-004 | Fix / document 200-on-failure notification contract | P0 |
| AP-005 | Pagination on all list endpoints | P0 |
| AP-006 | Notification delivery log + history endpoint | P1 |
| AP-007 | Unit tests — auth, credentials, notifications | P1 |
| AP-008 | E2E test — notification delivery pipeline | P1 |
| AP-009 | Retry with backoff for failed channel sends | P1 |
| AP-010 | Queue-based notification dispatch | P2 |
| AP-011 | Scoped `ApiKeyAuthGuard` (Phase 1B) | P2 |
| AP-012 | HTTP-only cookie for refresh token | P2 |
| AP-013 | OAuth email send | P2 |
| AP-014 | OAuth SMS send | P2 |
| AP-015 | Queue-based file generation | P2 |
| AP-016 | Audit logging via `AUDIT_QUEUE` | P2 |
