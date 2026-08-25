---
tags: [technical-debt, api]
id: TD-009
area: API
priority: High
status: Resolved
identified: 2026-06-13
resolved: 2026-06-14
action-plan: AP-005
resolution: AP-005 — offset-based pagination added to all 9 list endpoints
---

# TD-009 — No Pagination on List Endpoints

## Description

All `GET` collection endpoints returned the full MongoDB collection in a single response. No `limit`, `offset`, cursor, or page parameters existed on any endpoint.

## Affected Endpoints

`GET /companies`, `GET /company-themes`, `GET /channels`, `GET /providers`, `GET /company-channel-providers`, `GET /provider-credentials`, `GET /domain-catalogue`, `GET /event-catalogue`, `GET /layout-templates`

## Impact

- Frontend list views would load entire collections. Performance degrades linearly with collection size.
- A tenant with thousands of event catalogue entries would cause slow responses and potential browser timeouts.
- The API was not safe to expose to a frontend without pagination.

## Resolution

**AP-005** — Completed 2026-06-14.

- `pagination.util.ts` added: `parsePagination(rawLimit, rawOffset)` validates inputs and throws `400` for `limit < 1`, `limit > 200`, or `offset < 0`.
- All 9 services updated to return `{ data: T[], total: number, limit: number, offset: number }`.
- All 9 controllers updated: `@Query('limit')` and `@Query('offset')` params wired to `parsePagination`; `@ApiQuery` Swagger docs added; `@ApiTags` added where missing.
- Default behaviour unchanged: callers omitting params receive the first 50 records.

See [[Sprints/Sprint-001]] AP-005 for full implementation details.
