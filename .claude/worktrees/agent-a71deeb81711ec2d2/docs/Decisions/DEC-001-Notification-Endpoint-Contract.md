---
tags: [decision, communication, backend]
id: DEC-001
date: 2026-06-13
decision-date: 2026-06-14
status: Closed
sprint: Sprint-001
audit-source: Audits/Audit-2026-06-13
action-plan: AP-004
---

# DEC-001 — Notification Endpoint Response Contract

## Status

**Closed** — Option A (207 Multi-Status) approved on 2026-06-14. AP-004 is unblocked.

---

## Context

`POST /notifications/event` executes one or more delivery channels per request (email, SMS, storage, and future channels). When any channel fails, the original implementation always returned HTTP 200, with failure indicated only inside `results[].success`. A consumer checking only HTTP status would interpret a full delivery failure as success.

Example of the silent failure state (prior to AP-004 implementation):
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

---

## Options Evaluated

| Option | HTTP status on failure | Pros | Cons |
|---|---|---|---|
| A — 207 Multi-Status | `207` when any `success: false` | Standard HTTP semantics; machine-readable; no ambiguity | Breaking change for any existing consumer |
| B — 200 + `allSucceeded` flag | Always `200` | No breaking change | Requires frontend discipline; non-standard pattern |

---

## Decision

**Option A — HTTP 207 Multi-Status.**

---

## Rationale

The Communication service is designed to execute multiple channels in a single request (email, SMS, file generation, and future channels). A partial failure is a meaningful outcome — one channel may succeed while another fails. Reflecting this at the HTTP layer rather than only in the response body:

1. Aligns with the RFC 7807 / HTTP multi-status semantics that correctly describe partial success
2. Allows frontend consumers and internal services to distinguish full success from partial or complete failure without parsing the body
3. Is the correct contract for a multi-channel service from the outset, before external consumers are locked in

There are no existing production consumers whose integration would be broken by this change. The service is not yet in production.

---

## Contract Specification

| Scenario | HTTP Status | Body |
|---|---|---|
| All channels succeed (`results[].success` all `true`) | `200 OK` | `{ eventKey, companyId, results[] }` |
| One or more channels fail (`any results[].success === false`) | `207 Multi-Status` | `{ eventKey, companyId, results[] }` |
| Request-level error (invalid input, entity not found) | `400` / `404` | Standard error body |
| Server error | `500` | Standard error body |

Response body shape is **unchanged** in all cases. Consumers must inspect `results[]` for per-channel outcomes regardless of HTTP status.

---

## Consequences

- `NotificationController.notifyEvent()` must compute `allSucceeded = results.every(r => r.success)` and return `HttpStatus.MULTI_STATUS` (207) when false.
- Swagger must document both `200` and `207` responses on `POST /notifications/event`.
- Frontend notification screens must handle both 200 and 207 as valid responses and always check `results[].success`.
- Any future internal service calling `POST /notifications/event` must implement the same check.

---

## Acceptance Criteria

- [x] Option chosen and recorded in this document with rationale *(2026-06-14)*
- [x] `NotificationController` updated — returns `207` when any result has `success: false` *(2026-06-14)*
- [x] Swagger updated — `@ApiResponse` for both `200` and `207` on `POST /notifications/event` *(2026-06-14)*
- [x] `API.md` updated with contract table and consumer guidance *(2026-06-14)*
- [x] Sprint-001 AP-004 marked complete with DoD metadata *(2026-06-14)*

---

## Links

- **Audit finding:** [[Audits/Audit-2026-06-13]] — Critical Finding CF-1
- **Related decision:** [[Decisions/DEC-003 Queue Architecture]] — synchronous dispatch accepted; contract must be stable before timeout (AP-003) and queue migration (AP-010)
- **Technical debt:** [[Technical Debt/Open/TD-007 Synchronous Notification No Timeout]]
- **Action item:** AP-004 in [[Sprints/Sprint-001]]
