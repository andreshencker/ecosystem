---
tags: [architecture]
---

# Global Architecture

## What the Platform Is

The Invoice Platform is a multi-tenant SaaS product. It is being built as a set of independent services — each service owns a bounded domain and exposes an API.

Today, only one service exists: the **Communication Backend**. All other services are planned.

## Current State (2026-06-13)

```
┌─────────────────────────────────────────────┐
│            Invoice Platform                 │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │     Communication Backend            │   │
│  │     (NestJS · MongoDB · Redis)        │   │
│  │     Port 3001                        │   │
│  │     Status: In development           │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  All other services: planned               │
└─────────────────────────────────────────────┘
```

## Planned Future State

```
                    ┌─────────────┐
   Clients ────────▶│  API Gateway │
                    └──────┬──────┘
                           │
          ┌────────────────┼──────────────────┐
          │                │                  │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼──────┐
   │ Communication│  │   Invoice   │  │   Reporting  │
   │   Backend   │  │   Service   │  │   Service    │
   └─────────────┘  └─────────────┘  └──────────────┘
                           │
                    ┌──────▼──────┐
                    │   Billing   │
                    │   Service   │
                    └─────────────┘
```

## Architectural Principles

**Multi-tenancy** — every business entity is scoped to a company. The `companyKey` slug is the stable tenant identifier across the platform.

**Service boundaries** — each service owns its data and domain. Services communicate via API, not shared databases.

**Async by default** — notifications and file generation are queue-backed (BullMQ on Redis). Endpoints enqueue work and return immediately.

**Encrypted at rest** — credentials and secrets are never stored in plaintext. Provider credentials use AES-256-GCM.

**API-first** — no frontend exists yet. All functionality is exposed via REST API with Swagger documentation.

## Layers Within Each Service

Each service is organised into three layers:

| Layer | Responsibility |
|---|---|
| Platform Layer | User identity, auth, session management — above the tenant boundary |
| Communication Layer | Business logic — tenant-scoped domain operations |
| Infrastructure Layer | Database, cache, queue, logging, health — no business logic |

See [[Communication Layer]], [[Platform Layer]], [[Infrastructure Layer]] for how this applies to the current service.

## Related

- [[Future Platform Architecture]] — detail on planned services
- [[System Overview]] — visual canvas
- [[Modules/Communication/Backend/Overview]] — the only implemented service
- [[Decisions]] — architecture decision records (ADRs)
