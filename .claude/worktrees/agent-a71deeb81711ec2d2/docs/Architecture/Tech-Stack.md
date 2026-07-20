---
tags: [architecture]
---

# Tech Stack

Platform-level technology decisions and rationale. Service-specific package versions live in each module's Overview doc.

---

## Core Choices

### Node.js + TypeScript

The platform uses Node.js 20 with TypeScript across all backend services. This keeps the toolchain consistent as new services are added and avoids context-switching between language ecosystems.

### NestJS

NestJS provides a structured, opinionated framework with first-class support for dependency injection, modular architecture, and decorators. It scales well as a codebase grows across multiple modules and teams.

### MongoDB Atlas

MongoDB is the primary datastore. A document model suits the platform's multi-tenant structure — company-scoped entities vary significantly in shape between tenants. Atlas is the managed provider, removing operational overhead for replication and backups.

### Redis + BullMQ

Redis is the queue backend for all async work (notification delivery, file generation, audit logging). BullMQ provides reliable job processing with retries, concurrency control, and dead-letter queue support. Redis is not used for application-level caching.

### AWS S3

S3 is the file storage layer. It handles media uploads, generated PDFs, spreadsheets, and other binary output. Presigned URLs provide temporary, secure access without exposing AWS credentials to clients.

### Docker

All services are containerised. Each service ships a multi-stage Dockerfile using `node:20-alpine` as the runtime base. Local development uses `docker-compose` for dependent services (Redis, optionally MongoDB).

---

## Decisions Not Yet Made

- **Frontend framework** — no framework chosen; no frontend exists yet
- **Infrastructure as code** — Terraform is a candidate but not started
- **Container orchestration** — Kubernetes is planned for production but not configured
- **API gateway technology** — deferred until a second service is built

---

## Related

- [[Global Architecture]] — how these choices fit the overall platform
- [[Modules/Communication/Backend/Overview]] — full package list with versions for the current service
