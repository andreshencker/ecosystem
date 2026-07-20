---
tags: [technical-debt, queue]
id: TD-006
area: Queue
priority: High
status: Open
identified: 2026-06-13
action-plan: AP-010, AP-015, AP-016
---

# TD-006 — No BullMQ Processors — Queues Unused at Runtime

## Description

`NOTIFICATION_QUEUE`, `FILE_GENERATION_QUEUE`, and `AUDIT_QUEUE` are registered with BullMQ and the queue module is wired correctly. However:

- Zero processor (`*.processor.ts`) files exist anywhere in the codebase
- No `queue.add()` calls exist in any service
- All notification and file generation dispatch is synchronous on the HTTP thread
- The queues accept jobs if `.add()` is called but nothing consumes them

## Impact

The async processing infrastructure (retry, dead-letter queue, concurrency control, backpressure) that BullMQ provides is entirely bypassed. Notifications and file generation block the HTTP thread. Failed jobs have no automatic retry.

## Planned Resolution

- **AP-010** — `NOTIFICATION_PROCESSOR` for async notification delivery
- **AP-015** — `FILE_GENERATION_PROCESSOR` for async PDF/XLSX/CSV generation
- **AP-016** — `AUDIT_PROCESSOR` for async audit log persistence
