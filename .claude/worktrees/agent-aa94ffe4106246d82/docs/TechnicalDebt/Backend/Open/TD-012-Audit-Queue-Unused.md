---
tags: [technical-debt, observability]
id: TD-012
area: Observability
priority: Medium
status: Open
identified: 2026-06-13
action-plan: AP-016
---

# TD-013 — `AUDIT_QUEUE` Has No Processor and No Producers

## Description

`AUDIT_QUEUE` is registered in `QueueModule` with BullMQ. No service enqueues audit events (`queue.add()` is never called for audit purposes). No processor file exists. Audit logging does not exist in any form beyond `console.log`/`Logger` output to stdout.

## Impact

- No audit trail for security-sensitive operations: credential creation/deletion, company creation/deletion, notification sends.
- Compliance requirements that require audit logs cannot be met.
- Frontend cannot build an admin activity view.

## Planned Resolution

**AP-016** — Implement `AUDIT_PROCESSOR`. Enqueue audit events from: credential create/update/delete, notification sent, company create/delete. Persist to `audit_logs` collection. Expose `GET /audit?companyId=&limit=&offset=`.
