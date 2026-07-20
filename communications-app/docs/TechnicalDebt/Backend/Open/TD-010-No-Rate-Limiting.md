---
tags: [technical-debt, security]
id: TD-010
area: Security
priority: Medium
status: Open
identified: 2026-06-13
action-plan: none-yet
---

# TD-010 — No Rate Limiting

## Description

No rate limiting exists at any level — route, tenant, or global. Any authenticated caller can flood any endpoint without restriction.

## Impact

- A single tenant can saturate `POST /notifications/event`, blocking the notification queue for all other tenants.
- `POST /files/reports/generate/pdf` (Puppeteer) is particularly expensive — repeated rapid calls will exhaust CPU and memory.
- Auth endpoints (`POST /auth/login`, `POST /auth/register`) are vulnerable to brute-force without rate limiting.

## Planned Resolution

No action item raised yet. Candidates:
- NestJS Throttler module (`@nestjs/throttler`) for per-route rate limiting
- BullMQ rate limiter for queue-level tenant throttling
- Redis token bucket for per-tenant API rate limiting

Should be prioritised before public launch. Add to backlog when frontend development begins.
