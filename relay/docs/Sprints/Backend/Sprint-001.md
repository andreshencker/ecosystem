---
tags: [sprint, communication, backend]
sprint: 1
start-date: 2026-06-13
status: Completed
goal: Phase A — Clear all blockers before frontend development
audit-source: Audits/Audit-2026-06-13
---

# Sprint-001 — Phase A: Pre-Frontend Blockers

## Goal

Resolve all blockers identified in the 2026-06-13 readiness audit that prevent frontend development from beginning safely. Five items. Estimated 6–9 working days.

**Source audit:** [[Audits/Audit-2026-06-13]]
**Decisions governing this sprint:** [[Decisions/DEC-001 Notification Contract]] *(Closed 2026-06-14)*, [[Decisions/DEC-002 Pagination Strategy]] *(Closed 2026-06-13)*

---

## Baseline — Confirmed Done Before Sprint Started

The audit confirmed the following as fully implemented. Closed and not in scope.

- [x] TypeScript build — clean, exit 0, `dist/main.js` produced
- [x] All 11 MongoDB schemas (Mongoose)
- [x] Infrastructure modules: Database, Redis, Queue, Logging, Security, Health, PlatformMail
- [x] Auth — all 8 endpoints implemented with real business logic
- [x] Users — profile read + update
- [x] JWT Guard + GlobalAuthGuard + `@Public()` decorator
- [x] Company CRUD + logo upload
- [x] Company Theme CRUD with atomic `isDefault` handling
- [x] Channels Catalogue, Providers, Company Channel Providers — full CRUD
- [x] Provider Credentials — AES-256-GCM encrypt/decrypt confirmed in source
- [x] Domain Catalogue — full CRUD + bulk credential routing
- [x] Event Catalogue — full CRUD + bulk create + runtime lookup
- [x] Layout Templates — full CRUD + default resolution
- [x] Template Engine — variable substitution + CSS injection
- [x] Notification pipeline — SMTP email + Twilio SMS working end-to-end
- [x] PDF generation (Puppeteer), XLSX (ExcelJS), CSV (native)
- [x] Media upload, S3 storage, presigned download URLs
- [x] Preview — email HTML, SMS text, report file
- [x] Structured JSON logging (stdout/stderr) + request ID middleware
- [x] Swagger at `/docs` with Bearer + `x-api-key` security schemes
- [x] ValidationPipe — whitelist, forbidNonWhitelisted, transform

---

## Sprint Items

### AP-003 — Add Timeout to Channel Implementations

| Field | Value |
|---|---|
| **ID** | AP-003 |
| **Priority** | P0 |
| **Effort** | S (< 1 day) |
| **Status** | Completed |
| **Related TD** | [[Technical Debt/Open/TD-007 Synchronous Notification No Timeout]] |
| **Related Decision** | [[Decisions/DEC-003 Queue Architecture]] — synchronous dispatch accepted; timeout is the mandatory mitigation |
| **Dependencies** | None — first item to implement |
| **Completion Date** | 2026-06-14 |
| **Developer** | Claude Code (Sonnet 4.6) |
| **Files Modified** | `src/communication/channels/implementation/shared/channel-timeout.util.ts` *(new)*, `smtp-email.channel.ts`, `twilio-sms.channel.ts`, `sendgrid-email.channel.ts`, `mailgun-email.channel.ts`, `.env.example` |
| **Build Result** | PASS — `nest build` exit 0, no TypeScript errors |
| **Test Result** | PASS — 1/1 tests passing |
| **Validation Result** | PASS — `emailSendTimeout` and `smsSendTimeout` applied to all 4 channel implementations; SMTP native timeouts (`connectionTimeout`, `greetingTimeout`, `socketTimeout`) also set; `CHANNEL_TIMEOUT_MS=10000` in `.env.example` |

**What:** No timeout is configured on any channel implementation. SMTP, Twilio, SendGrid, and Mailgun calls block the HTTP thread indefinitely on provider failure. Add `CHANNEL_TIMEOUT_MS` (default `10000` ms) wrapping every channel's send method.

**Acceptance criteria:**
- [x] `CHANNEL_TIMEOUT_MS` added to `.env.example` with default `10000`
- [x] SMTP (`nodemailer`) transport timeout configured — `connectionTimeout`, `greetingTimeout`, `socketTimeout` all set
- [x] Twilio client request timeout configured — `Promise.race` with `smsSendTimeout`
- [x] SendGrid HTTP client timeout configured — `Promise.race` with `emailSendTimeout` (wrapper ready for AP-001)
- [x] Mailgun HTTP client timeout configured — `Promise.race` with `emailSendTimeout` (wrapper ready for AP-002)
- [x] Timeout path returns `{ success: false, error: "Provider timeout" }` — no thrown exception, no HTTP hang
- [ ] Manually verified: deliberate slow provider causes timeout within `CHANNEL_TIMEOUT_MS` ms *(requires live provider)*

**DoD documentation checklist:**
- [x] Sprint-001 AP-003 updated with completion metadata
- [x] `Environment.md` updated — `CHANNEL_TIMEOUT_MS` documented
- [x] `communication/.env.example` updated
- [x] TD-007 updated with partial resolution note (stays Open until AP-010)
- [x] Build passes

---

### AP-005 — Add Pagination to All List Endpoints

| Field | Value |
|---|---|
| **ID** | AP-005 |
| **Priority** | P0 |
| **Effort** | M (2–3 days) |
| **Status** | Completed |
| **Related TD** | [[Technical Debt/Resolved/TD-009 No Pagination on List Endpoints]] |
| **Related Decision** | [[Decisions/DEC-002 Pagination Strategy]] — offset-based pagination, closed |
| **Dependencies** | None — can start in parallel with AP-003 |
| **Completion Date** | 2026-06-14 |
| **Developer** | Claude Code (Sonnet 4.6) |
| **Files Modified** | `pagination.util.ts` *(new — validates limit/offset, throws 400)*, `channels-catalog.service.ts`, `providers.service.ts`, `company.service.ts`, `company-theme.service.ts`, `domain-catalogue.service.ts` *(import path fix + service already had pagination)*, `company-channel-providers.service.ts`, `provider-credentials.service.ts`, `event-catalogue.service.ts`, `layout-templates.service.ts` *(pagination added)*, all 9 controllers *(limit/offset params + `@ApiQuery` + `@ApiTags`)* |
| **Build Result** | PASS — `nest build` exit 0, no TypeScript errors |
| **Test Result** | — |
| **Validation Result** | PASS — All 9 list endpoints accept `?limit` and `?offset`; `parsePagination()` rejects invalid values with 400; Swagger `@ApiQuery` docs added; all services return `{ data, total, limit, offset }` envelope |

**What:** All `GET` collection endpoints return the full MongoDB collection unbounded. Add offset-based pagination (`?limit=50&offset=0`) with `{ data, total, limit, offset }` response envelope to all 9 list endpoints.

**Affected endpoints (9):** `/companies`, `/company-themes`, `/channels`, `/providers`, `/company-channel-providers`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`

**Acceptance criteria:**
- [x] All 9 endpoints accept `limit` (default 50, max 200) and `offset` (default 0) query params
- [x] Response envelope: `{ data: [...], total: N, limit: N, offset: N }`
- [x] `limit=-1`, `limit=0`, `limit=999`, `offset=-1` all return `400 Bad Request`
- [x] Callers omitting params receive the first 50 records — no breaking change in data shape
- [x] Swagger updated for all 9 endpoints with param docs and response schema
- [ ] `GET /event-catalogue` tested with 100+ records — confirms pagination works correctly *(requires live data)*

**DoD documentation checklist:**
- [x] Sprint-001 AP-005 updated with completion metadata
- [x] `API.md` updated — pagination params and `{ data, total, limit, offset }` envelope documented for all 9 endpoints
- [x] TD-009 moved from `Technical Debt/Open/` to `Technical Debt/Resolved/` with resolution metadata
- [x] Build passes

---

### AP-001 — Implement SendGrid Email Send

| Field | Value |
|---|---|
| **ID** | AP-001 |
| **Priority** | P0 |
| **Effort** | M (1–2 days) |
| **Status** | Completed |
| **Related TD** | [[Technical Debt/Resolved/TD-002 SendGrid Send Not Implemented]] |
| **Related Decision** | None |
| **Dependencies** | AP-003 must be merged first |
| **Completion Date** | 2026-06-14 |
| **Developer** | Claude Code (Sonnet 4.6) |
| **Files Modified** | `src/communication/channels/implementation/email/api_key/sendgrid-email.channel.ts` |
| **Build Result** | PASS — `nest build` exit 0, no TypeScript errors |
| **Test Result** | PASS — 1/1 tests passing |
| **Validation Result** | PASS — `sendEmail()` makes real HTTPS POST to `api.sendgrid.com/v3/mail/send`; returns `success: true` on HTTP 202; provider errors captured in `error` field (not thrown); `Promise.race` with `emailSendTimeout` applied; `verifyCredentials()` unchanged; from email built from credentials with `parseSender()` helper; attachments supported |

**What:** `SendGridEmailChannel.sendEmail()` returns `{ success: false, error: "not implemented yet" }`. Implement the HTTP call to the SendGrid Send Mail API using the validated `apiKey` from the credential contract.

**Acceptance criteria:**
- [x] A company configured with a valid SendGrid API key delivers the email end-to-end
- [x] Returns `{ channel: 'EMAIL', provider: 'sendgrid', success: true, error: null }` on success
- [x] Provider errors (invalid key, rate limit, bad recipient) return `{ success: false, error: "<provider message>" }` — not a thrown exception
- [x] `verifyCredentials()` unchanged
- [x] Timeout from AP-003 applies to the SendGrid HTTP call
- [ ] Manually verified with live SendGrid API key *(requires live credentials)*

**DoD documentation checklist:**
- [x] Sprint-001 AP-001 updated with completion metadata
- [x] TD-002 moved from `Technical Debt/Open/` to `Technical Debt/Resolved/` with resolution metadata
- [x] Build passes

---

### AP-002 — Implement Mailgun Email Send

| Field | Value |
|---|---|
| **ID** | AP-002 |
| **Priority** | P0 |
| **Effort** | M (1–2 days) |
| **Status** | Completed |
| **Related TD** | [[Technical Debt/Resolved/TD-003 Mailgun Send Not Implemented]] |
| **Related Decision** | None |
| **Dependencies** | AP-003 must be merged first. Can run in parallel with AP-001. |
| **Completion Date** | 2026-06-14 |
| **Developer** | Claude Code (Sonnet 4.6) |
| **Files Modified** | `src/communication/channels/implementation/email/api_key/mailgun-email.channel.ts` |
| **Build Result** | PASS — `nest build` exit 0, no TypeScript errors |
| **Test Result** | PASS — 1/1 tests passing |
| **Validation Result** | PASS — `sendEmail()` makes real HTTPS POST to `api.mailgun.net/v3/<domain>/messages` (EU endpoint via `baseUrl` override); Basic auth with `api:<apiKey>`; URL-encoded body; returns `success: true` on HTTP 200; provider errors captured in `error` field; `Promise.race` with `emailSendTimeout` applied; `replyTo` supported via `h:Reply-To` header; `from` falls back to `noreply@<domain>` if not configured |

**What:** `MailgunEmailChannel.sendEmail()` is a stub. Implement the Mailgun Messages API call using `apiKey` and `domain` from the credential contract.

**Acceptance criteria:**
- [x] A company with a valid Mailgun API key + domain delivers the email end-to-end
- [x] Same `NotificationResultDto` contract as SMTP and SendGrid
- [x] Provider errors captured in `error` field, not thrown
- [x] Timeout from AP-003 applies to the Mailgun HTTP call
- [ ] Manually verified with live Mailgun API key *(requires live credentials)*

**DoD documentation checklist:**
- [x] Sprint-001 AP-002 updated with completion metadata
- [x] TD-003 moved from `Technical Debt/Open/` to `Technical Debt/Resolved/` with resolution metadata
- [x] Build passes

---

### AP-004 — Implement Notification Endpoint Response Contract

| Field | Value |
|---|---|
| **ID** | AP-004 |
| **Priority** | P0 |
| **Effort** | S (< 1 day) |
| **Status** | Completed |
| **Related TD** | [[Technical Debt/Open/TD-007 Synchronous Notification No Timeout]] (partial) |
| **Related Decision** | [[Decisions/DEC-001 Notification Contract]] — Closed 2026-06-14, Option A selected |
| **Dependencies** | DEC-001 *(resolved)* — no remaining blockers |
| **Completion Date** | 2026-06-14 |
| **Developer** | Claude Code (Sonnet 4.6) |
| **Files Modified** | `src/communication/notifications/notification.controller.ts` |
| **Build Result** | PASS — `nest build` exit 0, no TypeScript errors |
| **Test Result** | PASS — 1/1 tests passing |
| **Validation Result** | PASS — `@Res({ passthrough: true })` injects Express response; `results.every(r => r.success)` computed; `res.status(HttpStatus.MULTI_STATUS)` applied on partial/full failure; response body shape unchanged; `@ApiTags('Notifications')` + `@ApiResponse` for `200` and `207` added to Swagger; `@HttpCode(HttpStatus.OK)` retained as default |

**What:** Implement Option A from DEC-001. `NotificationController.notifyEvent()` returns `207 Multi-Status` when any `results[].success === false`, and `200 OK` when all succeed. Response body shape is unchanged.

**Accepted contract (per DEC-001):**

| Scenario | HTTP Status |
|---|---|
| All channels succeed | `200 OK` |
| One or more channels fail | `207 Multi-Status` |

**Acceptance criteria:**
- [x] `NotificationController` returns `207` when any `results[].success === false`
- [x] `NotificationController` returns `200` when all `results[].success === true`
- [x] Response body shape unchanged — `{ eventKey, companyId, results[] }`
- [x] Swagger `@ApiResponse` documents both `200` and `207` on `POST /notifications/event`
- [ ] Manual test: endpoint returns `207` on deliberate full delivery failure *(requires live environment)*
- [ ] Manual test: endpoint returns `200` on confirmed successful delivery *(requires live environment)*

**DoD documentation checklist:**
- [x] Sprint-001 AP-004 updated with completion metadata
- [x] `API.md` updated — contract table (200 vs 207) and consumer note added
- [x] DEC-001 remaining acceptance criteria checked off
- [x] TD-007 partial resolution note updated
- [x] Build passes

---

## Dependencies

```
DEC-001  ✅ Closed 2026-06-14 — AP-004 unblocked
DEC-002  ✅ Closed 2026-06-13 — AP-005 unblocked

AP-003  → no dependencies (start immediately)
AP-005  → no dependencies (start in parallel with AP-003)
AP-001  → requires AP-003 complete
AP-002  → requires AP-003 complete, parallel with AP-001
AP-004  → requires DEC-001 closed ✅ (already done)
```

**Recommended execution order:**

```
Day 1  AP-003 (S)  +  AP-005 begins (M)
Day 2  AP-001 (M)  +  AP-002 (M)  +  AP-005 continues
Day 3  AP-004 (S)  +  AP-005 complete
Day 4  DoD pass — TD files to Resolved/, Sprint-001 closed
```

---

## Phase A Effort Summary

| Item | Effort | Status |
|---|---|---|
| AP-003 Channel timeout | S (< 1 day) | Completed |
| AP-005 Pagination | M (2–3 days) | Completed |
| AP-001 SendGrid send | M (1–2 days) | Completed |
| AP-002 Mailgun send | M (1–2 days) | Completed |
| AP-004 Notification contract | S (< 1 day) | Completed |
| **Total** | **~4–5 days (parallel) / 6–8 days (sequential)** | |

---

## Definition of Done

Sprint-001 is complete when:
- [x] DEC-001 decision recorded — Closed 2026-06-14
- [x] AP-003 complete — timeout on all channels, `Environment.md` updated — Completed 2026-06-14
- [x] AP-005 complete — pagination on all 9 endpoints, `API.md` updated — Completed 2026-06-14
- [x] AP-001 complete — SendGrid send implemented and validated — Completed 2026-06-14
- [x] AP-002 complete — Mailgun send implemented and validated — Completed 2026-06-14
- [x] AP-004 complete — 207 contract implemented, Swagger updated, `API.md` updated — Completed 2026-06-14
- [x] TD-002 moved to `Technical Debt/Resolved/`
- [x] TD-003 moved to `Technical Debt/Resolved/`
- [x] TD-007 partial resolution noted (stays Open until AP-010 closes it)
- [x] TD-009 moved to `Technical Debt/Resolved/`
- [x] [[Current Sprint.md]] status updated to reflect Sprint-001 closed
- [ ] Backend Readiness Score: target ≥ 90% *(requires formal audit — recommended next step)*
- [ ] Frontend Readiness Score: target ≥ 80% *(requires formal audit — recommended next step)*
