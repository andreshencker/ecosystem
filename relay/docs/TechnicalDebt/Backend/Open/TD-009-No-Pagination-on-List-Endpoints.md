---
tags: [technical-debt, api]
id: TD-009
area: API
priority: High
status: Resolved
identified: 2026-06-13
resolved: 2026-06-14
action-plan: AP-005
---

> **Moved to** [[Technical Debt/Resolved/TD-009 No Pagination on List Endpoints]]


# TD-009 — No Pagination on List Endpoints

## Description

All `GET` collection endpoints return the full MongoDB collection in a single response. No `limit`, `offset`, cursor, or page parameters exist on any endpoint.

## Affected Endpoints

`GET /companies`, `GET /company-themes`, `GET /channels`, `GET /providers`, `GET /company-channel-providers`, `GET /provider-credentials`, `GET /domain-catalogue`, `GET /event-catalogue`, `GET /layout-templates`

## Impact

- Frontend list views will load entire collections. Performance degrades linearly with collection size.
- A tenant with thousands of event catalogue entries will cause slow responses and potential browser timeouts.
- The API is not safe to expose to a frontend without pagination.

## Planned Resolution

**AP-005** — Add offset-based pagination (`?limit=50&offset=0`) to all list endpoints. Decision on pagination strategy: see [[Decisions/DEC-002 Pagination Strategy]]. Response envelope: `{ data: [...], total: N, limit: N, offset: N }`.
