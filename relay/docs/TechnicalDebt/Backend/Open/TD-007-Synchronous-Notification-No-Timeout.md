---
tags: [technical-debt, performance]
id: TD-007
area: Performance
priority: High
status: Open
identified: 2026-06-13
action-plan: AP-003, AP-010
partial-resolution: AP-003 (2026-06-14)
---

# TD-007 — Notification Dispatch Synchronous with No Timeout

## Description

`NotificationService.notifyEvent()` calls channel implementations (SMTP, Twilio) directly on the HTTP request thread. No per-call timeout is configured on any channel implementation. If a provider is slow or unresponsive, the HTTP connection hangs for the full TCP/provider timeout — potentially several minutes.

## Impact

A slow SMTP server or unresponsive Twilio endpoint will cause the `POST /notifications/event` HTTP connection to hang. Frontend users will experience the application appearing to freeze.

## Resolution Progress

### AP-003 — Timeout added (2026-06-14) — PARTIAL

`CHANNEL_TIMEOUT_MS` (default 10,000 ms) applied to all channel implementations:

- **SMTP** — `connectionTimeout`, `greetingTimeout`, `socketTimeout` set on nodemailer transporter + `Promise.race`
- **Twilio** — `Promise.race` with `smsSendTimeout`
- **SendGrid** — `Promise.race` wrapper in place (ready for AP-001 implementation)
- **Mailgun** — `Promise.race` wrapper in place (ready for AP-002 implementation)

Timeout resolves with `{ success: false, error: "Provider timeout" }` — no thrown exception, no HTTP hang.

Utility: `src/communication/channels/implementation/shared/channel-timeout.util.ts`

**Remaining gap:** The root cause — synchronous dispatch on the HTTP thread — is not resolved. The timeout is a mitigation. HTTP connections still block for up to `CHANNEL_TIMEOUT_MS` per channel. A notification with 3 channels could block for up to `3 × CHANNEL_TIMEOUT_MS` in the worst case.

### AP-010 — Queue-based dispatch (future, Phase C) — PENDING

Full resolution: migrate notification dispatch to `NOTIFICATION_PROCESSOR` (BullMQ). `POST /notifications/event` returns `202 Accepted` immediately. The HTTP thread is never blocked. See [[Backlog]] and [[Decisions/DEC-003 Queue Architecture]].

## Status

**Open** — AP-003 mitigates the hang risk. Full resolution requires AP-010. This item remains in `Open/` until AP-010 is implemented.
