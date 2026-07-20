---
tags: [technical-debt, reliability]
id: TD-011
area: Reliability
priority: Medium
status: Open
identified: 2026-06-13
action-plan: AP-009, AP-010
---

# TD-011 — No Retry or Dead-Letter Queue for Failed Deliveries

## Description

Failed channel sends (SMTP error, Twilio error, provider timeout) produce a `success: false` result in the HTTP response. There is no automatic retry, no dead-letter queue, and no mechanism to re-trigger a failed delivery without a new API call from the client.

## Impact

Transient provider failures (brief SMTP outage, Twilio rate limit) result in permanent delivery failure. The caller must detect the failure in the response body and decide whether to retry. There is no server-side recovery.

## Planned Resolution

- **AP-009 (P1)** — Add retry with exponential backoff (2 retries, 1s/3s delay) at the service layer before queue-based dispatch is implemented. Retries deferred to not block the HTTP response.
- **AP-010 (P2)** — Queue-based dispatch via BullMQ will provide full retry + dead-letter queue configuration natively.
