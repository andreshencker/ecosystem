---
tags: [project]
---

# Roadmap

## Current Phase

**Phase 1 — Complete Communication Backend**

The Communication Backend is the only service in the codebase. It is the foundation everything else depends on. Nothing moves to Phase 2 until this service is stable and tested.

---

## Phase 1 — Communication Backend *(current)*

**Goal:** A production-ready, tested, documented multi-tenant API for notification delivery and file generation.

| Milestone | Status |
|---|---|
| Architecture and scaffolding complete | Done |
| All MongoDB schemas defined | Done |
| Notification delivery pipeline end-to-end | In progress |
| Channel implementations (email, SMS, S3) | In progress |
| Template engine + layout templates | In progress |
| File generation (PDF, XLSX, CSV) | In progress |
| Unit + E2E test coverage | Not started |
| CI/CD pipeline | Not started |
| Staging environment | Not started |
| v0.1.0 release | Not started |

See [[Modules/Communication/Backend/Current Sprint]] and [[Modules/Communication/Backend/Backlog]] for detail.

---

## Phase 2 — Communication Frontend *(planned)*

A web dashboard for managing company configuration: providers, credentials, templates, domains, events.

No framework chosen. No timeline set. Depends on Phase 1 being stable.

---

## Phase 3 — Invoice Service *(planned)*

Backend service for invoice creation, delivery (via Communication Backend), and payment tracking.

No design started. Depends on Phase 1.

---

## Phase 4 — Reporting Service *(planned)*

Cross-service analytics: notification delivery metrics, invoice summaries, usage reports, exports.

No design started. Depends on Phase 3.

---

## Phase 5 — Billing Service *(planned)*

Subscription management and billing for platform tenants. Depends on Phase 3 and 4.

---

## Phase 6 — API Gateway *(planned)*

Unified entry point for all services: routing, edge auth, rate limiting, versioning.

Build when two or more services are in production. See [[Gateway Layer]].

---

## Milestones

| Milestone | Target Date | Status |
|---|---|---|
| Communication Backend v0.1.0 | TBD | In progress |
| Staging environment live | TBD | Planned |
| Communication Frontend v1 | TBD | Planned |
| Invoice Service v0.1.0 | TBD | Planned |
| Reporting Service v0.1.0 | TBD | Planned |
| API Gateway | TBD | Planned |

## Dependencies

- Phase 2 depends on Phase 1 (stable API)
- Phase 3 depends on Phase 1 (communication and file delivery)
- Phase 4 depends on Phase 3 (data to report on)
- Phase 5 depends on Phase 3 and 4
- Phase 6 depends on multiple services existing
