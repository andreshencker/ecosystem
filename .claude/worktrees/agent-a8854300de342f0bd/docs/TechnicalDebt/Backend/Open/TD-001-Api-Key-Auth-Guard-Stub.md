---
tags: [technical-debt, security]
id: TD-001
area: Security
priority: High
status: Open
identified: 2026-06-13
action-plan: AP-011
---

# TD-001 — `ApiKeyAuthGuard` Always Returns False

## Description

`ApiKeyAuthGuard.canActivate()` unconditionally returns `false`. `tryAuthenticate()` unconditionally returns `null`. The guard is a documented stub with the full implementation plan written in comments but not coded.

## Location

`src/infrastructure/security/guards/api-key-auth.guard.ts`

## Impact

Only the static `COMMUNICATION_API_KEY` environment variable works for service-to-service authentication. No database-backed, per-tenant, or revocable API key can be issued or validated. A dynamically issued API key will always fail authentication with a 401.

## Planned Resolution

**AP-011** — Implement the full Phase 1B design documented in the guard stub:
1. Read `x-api-key` header
2. SHA-256 hash the incoming key
3. Look up hash in Redis cache (TTL 300s), fall back to MongoDB
4. Validate `status === 'active'` and `expiresAt`
5. Attach `AuthContext { actorType: 'apikey', keyId, organizationId }` to request
6. Increment `usageCount` asynchronously

## Workaround

Use the static `COMMUNICATION_API_KEY` environment variable in the `x-api-key` header for all service-to-service calls.
