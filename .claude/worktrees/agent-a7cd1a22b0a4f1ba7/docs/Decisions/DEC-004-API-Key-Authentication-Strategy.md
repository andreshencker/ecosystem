---
tags: [decision, communication, backend]
id: DEC-004
date: 2026-06-13
status: Closed
sprint: Backlog
audit-source: Audits/Audit-2026-06-13
action-plan: AP-011
---

# DEC-004 — API Key Authentication Strategy

## Status

**Closed** — static env var approach accepted for Phase 1A. Scoped API key guard deferred to Phase C.

## Context

`ApiKeyAuthGuard.canActivate()` always returns `false`. Only the static `COMMUNICATION_API_KEY` environment variable works for service-to-service auth. No database-backed, per-tenant, or revocable API key exists.

The full Phase 1B implementation plan is written in comments inside the guard stub:
1. Read `x-api-key` header
2. SHA-256 hash the incoming key
3. Look up hash in Redis (TTL 300s), fall back to MongoDB
4. Validate `status === 'active'` and `expiresAt`
5. Attach `AuthContext`, increment `usageCount` asynchronously

## Decision

**Accept the static `COMMUNICATION_API_KEY` env var for Phase 1A.** Implement full scoped `ApiKeyAuthGuard` in Phase C (AP-011).

**Rationale:** A full API key system (issuance, rotation, revocation, Redis cache, usage tracking, management endpoints) is non-trivial. The platform currently has a single internal service-to-service consumer. The static key is sufficient while no external third-party callers exist. The risk is low because the key is only used in server-to-server communication, never in browser clients.

## Consequences

- Any dynamically issued API key will fail authentication until AP-011 is implemented.
- The static key must be rotated by updating the env var and redeploying — no API endpoint required.
- No `/api-keys` management UI can be built until AP-011 is complete.

## Links

- **Audit finding:** [[Audits/Audit-2026-06-13]] — CF-5 (ApiKeyAuthGuard stub)
- **Technical debt:** [[Technical Debt/Open/TD-001 Api Key Auth Guard Stub]]
- **Action item:** AP-011 in [[Backlog]]
