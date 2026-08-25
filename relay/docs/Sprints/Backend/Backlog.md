---
tags: [module, communication, backend, backlog]
---

# Communication Backend — Backlog

Items not in the active sprint. Grouped by execution phase.
See [[Audits/Audit-2026-06-13]] for the originating audit.
Decisions: [[Decisions/DEC-001 Notification Contract]] · [[Decisions/DEC-002 Pagination Strategy]] · [[Decisions/DEC-003 Queue Architecture]] · [[Decisions/DEC-004 API Key Strategy]] · [[Decisions/DEC-005 Test Coverage Strategy]]

**Phase A items (active sprint):** [[Sprints/Sprint-001]]
**Platform-level backlog:** [[Backlog]]

---

## Phase B — Recommended Before Production Release

Items that must be complete before the service goes to production, but which do not block frontend development. Target: immediately after Sprint-001 closes.

| ID | Description | Effort | TD Closed | Status |
|---|---|---|---|---|
| AP-006 | Notification delivery log — `notification_logs` collection + `GET /notifications/history` | M | [[Technical Debt/Open/TD-008 No Notification Delivery History\|TD-008]] | Not started |
| AP-007 | Unit tests — AuthService, CryptoService, NotificationService, GlobalAuthGuard (≥80% coverage) | L | [[Technical Debt/Open/TD-014 No Unit Test Coverage\|TD-014]] | Not started |
| AP-008 | E2E test — full notification pipeline with mock SMTP | L | [[Technical Debt/Open/TD-015 No E2E Tests\|TD-015]] | Not started |
| AP-009 | Retry with exponential backoff for failed channel sends (2 retries, 1s/3s delay) | M | [[Technical Debt/Open/TD-011 No Retry or Dead Letter Queue\|TD-011]] | Not started |

### AP-006 Acceptance Criteria
- Every `POST /notifications/event` call creates one `notification_logs` document per channel result
- Fields: `companyId`, `eventKey`, `channel`, `provider`, `success`, `error`, `recipient` (masked), `sentAt`
- `GET /notifications/history?companyId=&limit=&offset=` returns paginated, immutable logs
- Recipient email masked (show domain only), phone masked (last 2 digits)

### AP-007 Acceptance Criteria
- `AuthService`: register, login (wrong password), token rotation, reuse detection, password reset
- `CryptoService`: encrypt → decrypt round-trip; tampered ciphertext rejected
- `NotificationService`: event not found, channel routing, per-channel result aggregation
- `GlobalAuthGuard`: public routes pass, expired token rejects, valid API key passes
- Coverage ≥ 80% on the four classes above; run in CI

### AP-008 Acceptance Criteria
- E2E test starts NestJS app against test MongoDB
- SMTP delivery verified via local mock SMTP server
- Covers: company creation → SMTP credential setup → domain → event → `POST /notifications/event` → delivery confirmed
- Runs via `npm run test:e2e` in CI

### AP-009 Acceptance Criteria
- Failed channel send retried up to 2 times with 1s, 3s exponential backoff
- Retries do not block the HTTP response
- Final failure status logged and recorded in delivery log (AP-006 as prerequisite or stdout)

---

## Phase C — Future Scalability and Platform Improvements

Items that improve the system at scale or add capabilities not needed for initial frontend development. No fixed timeline.

| ID | Description | Effort | TD Closed | Decision | Status |
|---|---|---|---|---|---|
| AP-010 | Queue-based notification dispatch — `NOTIFICATION_PROCESSOR`, 202 response, dead-letter | L | [[Technical Debt/Open/TD-006 No Queue Processors\|TD-006]], [[Technical Debt/Open/TD-007 Synchronous Notification No Timeout\|TD-007]] | [[Decisions/DEC-003 Queue Architecture\|DEC-003]] | Not started |
| AP-011 | Scoped `ApiKeyAuthGuard` — SHA-256 hash, Redis cache, MongoDB fallback (Phase 1B) | M | [[Technical Debt/Open/TD-001 Api Key Auth Guard Stub\|TD-001]] | [[Decisions/DEC-004 API Key Strategy\|DEC-004]] | Not started |
| AP-012 | HTTP-only cookie for refresh token (`REFRESH_TOKEN_COOKIE` env flag) | S | [[Technical Debt/Open/TD-016 Refresh Token in Response Body\|TD-016]] | — | Not started |
| AP-013 | Gmail OAuth email send (`OAuthEmailChannel`) — token refresh, in-memory cache | L | [[Technical Debt/Open/TD-004 OAuth Email Send Not Implemented\|TD-004]] | — | Not started |
| AP-014 | OAuth SMS send (`OAuthSmsChannel`) — provider TBD | M | [[Technical Debt/Open/TD-005 OAuth SMS Send Not Implemented\|TD-005]] | — | Not started |
| AP-015 | Queue-based file generation — `FILE_GENERATION_PROCESSOR`, 202 response | M | [[Technical Debt/Open/TD-013 File Generation Synchronous\|TD-013]] | [[Decisions/DEC-003 Queue Architecture\|DEC-003]] | Not started |
| AP-016 | Audit logging — `AUDIT_PROCESSOR`, `audit_logs` collection, `GET /audit` | M | [[Technical Debt/Open/TD-012 Audit Queue Unused\|TD-012]] | — | Not started |

### Phase C — No AP yet (tracked in Technical Debt only)

| TD | Description | Effort | Status |
|---|---|---|---|
| [[Technical Debt/Open/TD-010 No Rate Limiting\|TD-010]] | Rate limiting — per-tenant and per-route (NestJS Throttler or BullMQ rate limiter) | M | Not started |
| [[Technical Debt/Open/TD-017 No Request Signing\|TD-017]] | Request signing / HMAC on notification endpoint for external callers | M | Not started |

### Phase C Dependencies

```
AP-010 (queue notifications) depends on: AP-009 (retry), AP-006 (delivery log)
AP-015 (queue files) is independent
AP-016 (audit) depends on: AP-010 preferred but not required
AP-011 (scoped API keys) is independent
AP-013 (OAuth email) is independent
AP-014 (OAuth SMS) depends on: provider choice
```

---

## Confirmed Done (Audit-Verified)

Removed from backlog — fully implemented as confirmed by 2026-06-13 audit.

- [x] Channel runtime — provider + credential resolution at send time
- [x] SMTP email — send via Nodemailer
- [x] Twilio SMS — send via Twilio SDK
- [x] S3 storage — upload, replace, delete, presigned URL (access keys + IAM role)
- [x] Provider credential encryption/decryption (AES-256-GCM)
- [x] Template engine — variable substitution + CSS injection
- [x] Layout templates — CRUD + default resolution
- [x] File generation — PDF (Puppeteer), XLSX (ExcelJS), CSV
- [x] Preview — email HTML, SMS text, report file
- [x] Domain catalogue — full CRUD + bulk credential routing
- [x] Event catalogue — full CRUD + bulk create + runtime lookup
- [x] Error handling — HttpException throughout, duplicate key (11000) handling
- [x] Validation — ValidationPipe global, whitelist, forbidNonWhitelisted

---

## Icebox

No priority assigned. Revisit when the platform matures.

- [ ] Webhook delivery channel (HTTP POST to a configured URL)
- [ ] Template versioning (layout template history and rollback)
- [ ] Scheduled notifications (delayed BullMQ job)
- [ ] Presigned URL expiry configuration (currently SDK defaults)
- [ ] Bulk notification support (one event → multiple recipients)
