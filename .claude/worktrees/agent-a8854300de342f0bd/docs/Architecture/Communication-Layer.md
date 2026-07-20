---
tags: [architecture, layer]
---

# Communication Layer

## Platform Responsibility

The Communication Layer is the platform's outbound communication capability. It owns:

- Multi-tenant channel configuration — which companies use which providers for email, SMS, and storage
- Encrypted storage of third-party provider credentials
- Event-driven notification delivery via queues
- Template rendering and file generation (PDF, XLSX, CSV)
- Business domain and event catalogues that drive notification routing

This is the only layer with a production implementation today. It lives in the **Communication Backend** service.

## Current Implementation

The Communication Backend implements this layer in full. It is a NestJS service (port 3001) backed by MongoDB and Redis.

For implementation detail — module structure, controllers, queue architecture — see:

→ [[Modules/Communication/Backend/Architecture]]
→ [[Modules/Communication/Backend/API]]
→ [[Modules/Communication/Backend/Database]]

## Future Services in This Layer

As the platform grows, additional services will contribute to this layer:

- **Communication Frontend** — dashboard UI for managing providers, templates, and event catalogues
- **Reporting Service** — delivery metrics and analytics across tenants

See [[Future Platform Architecture]] for planning notes.

## Key Decisions
- [[Decisions]]
