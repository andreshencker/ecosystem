---
tags: [decision, communication, backend]
id: DEC-003
date: 2026-06-13
status: Closed
sprint: Backlog
audit-source: Audits/Audit-2026-06-13
action-plan: AP-010, AP-015, AP-016
---

# DEC-003 — Queue Architecture and Dispatch Strategy

## Status

**Closed** — synchronous dispatch accepted for Phase 1A. Queue-based dispatch deferred to Phase C. Timeout protection (AP-003) required in Phase A as a mitigation.

## Context

`NOTIFICATION_QUEUE`, `FILE_GENERATION_QUEUE`, and `AUDIT_QUEUE` are registered with BullMQ but:
- No processor (`*.processor.ts`) files exist
- No `queue.add()` calls exist in any service
- Notification dispatch is synchronous on the HTTP request thread
- File generation is synchronous on the HTTP request thread

This was an intentional Phase 1A simplification.

## Decision

**Accept synchronous dispatch in Phase 1A with mandatory timeout protection.**

Queue-based async dispatch (AP-010, AP-015) is deferred to Phase C (future scalability) because:
- Queue-based dispatch requires processor lifecycle management, dead-letter queues, and job status tracking — significant added complexity
- Phase 1A has low notification volume and a single internal service
- Synchronous dispatch is safe with proper timeouts (AP-003, Phase A)

## Consequences

- **AP-003 (Phase A, S)** — Channel timeout `CHANNEL_TIMEOUT_MS` is mandatory. Without it, synchronous dispatch risks hanging HTTP connections.
- **AP-009 (Phase B, M)** — Retry with backoff at the service layer before queue-based dispatch is implemented.
- **AP-010 (Phase C, L)** — Full async dispatch via `NOTIFICATION_PROCESSOR` when load justifies it.
- **AP-015 (Phase C, M)** — `FILE_GENERATION_PROCESSOR` for Puppeteer offload.
- **AP-016 (Phase C, M)** — `AUDIT_PROCESSOR` for audit event persistence.

## Links

- **Audit finding:** [[Audits/Audit-2026-06-13]] — CF-4 (queues unused)
- **Technical debt:** [[Technical Debt/Open/TD-006 No Queue Processors]], [[Technical Debt/Open/TD-007 Synchronous Notification No Timeout]], [[Technical Debt/Open/TD-012 Audit Queue Unused]], [[Technical Debt/Open/TD-013 File Generation Synchronous]]
- **Action items:** AP-010, AP-015, AP-016 in [[Backlog]]
