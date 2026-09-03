---
tags: [architecture, layer]
---

# Infrastructure Layer

## Platform Responsibility

The Infrastructure Layer provides the shared technical services that business logic depends on: databases, caches, queues, logging, health checks, and platform email. It contains no business logic.

Key infrastructure decisions apply across the whole platform, not just a single service.

## Infrastructure Decisions

**MongoDB Atlas** — managed cloud MongoDB. Each service uses its own database. The Communication Backend uses `relaydb`. Atlas removes the operational overhead of replication, backups, and upgrades.

**Redis** — queue backend (BullMQ) for all async processing. Also used for any distributed locking or caching needs in future services. Deployed locally via Docker; managed Redis (ElastiCache or Upstash) for production.

**Docker** — all services are containerised with multi-stage Dockerfiles. Local development dependencies (Redis, optional MongoDB) run via `docker-compose` per service.

**Request tracing** — each service assigns a unique request ID to every inbound HTTP request. The ID propagates through log lines to enable correlation across service calls.

**Health checks** — each service exposes a `/health` endpoint via `@nestjs/terminus` for Docker and Kubernetes probes.

## Current Implementation

The Infrastructure Layer is implemented in `src/infrastructure/` within the Communication Backend.

For service-specific detail — module configuration, local dev setup, container build — see:

→ [[Modules/Communication/Backend/Architecture]]
→ [[Modules/Communication/Backend/Environment]]

## Key Decisions
- [[Decisions]]
