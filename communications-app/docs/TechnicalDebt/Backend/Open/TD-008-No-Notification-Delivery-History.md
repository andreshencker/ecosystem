---
tags: [technical-debt, data]
id: TD-008
area: Data
priority: High
status: Open
identified: 2026-06-13
action-plan: AP-006
---

# TD-008 — No Notification Delivery History

## Description

After `POST /notifications/event` returns, the delivery result (`success`, `error`, `channel`, `provider`, recipient) is not persisted anywhere. There is no MongoDB collection, no log record beyond stdout, and no endpoint to query delivery status after the fact.

## Impact

- The caller receives the result once in the HTTP response body. After that, the delivery record is gone.
- No audit trail of what was sent, to whom, when, or whether it succeeded.
- Frontend cannot build a notification history or delivery status view.
- Failed deliveries cannot be identified without the caller having captured the original response.

## Planned Resolution

**AP-006** — Create `notification_logs` collection. Persist one document per channel result after every `notifyEvent()` call. Fields: `companyId`, `eventKey`, `channel`, `provider`, `success`, `error`, `recipient` (masked), `sentAt`. Expose `GET /notifications/history` with pagination and company-scoped filtering.
