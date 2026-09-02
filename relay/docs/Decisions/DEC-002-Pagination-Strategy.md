---
tags: [decision, communication, backend]
id: DEC-002
date: 2026-06-13
status: Closed
sprint: Sprint-001
audit-source: Audits/Audit-2026-06-13
action-plan: AP-005
---

# DEC-002 — Pagination Strategy for List Endpoints

## Status

**Closed** — offset-based pagination chosen. Implementation tracked in AP-005.

## Context

All `GET` collection endpoints return the full MongoDB collection in a single response. No `limit`, `offset`, or cursor parameters exist. This is a pre-frontend blocker — list views cannot be built safely without pagination.

## Options Evaluated

| Option | Query params | Response envelope | Notes |
|---|---|---|---|
| Offset-based | `?limit=50&offset=0` | `{ data, total, limit, offset }` | Simple; consistent; minor offset drift on concurrent inserts |
| Cursor-based | `?limit=50&after=<id>` | `{ data, nextCursor }` | No drift; no total count; harder to implement; non-obvious to frontend |

## Decision

**Offset-based pagination** (`?limit=50&offset=0`).

**Rationale:** Simpler to implement consistently across all endpoints. Frontend data tables expect a total count for pagination controls. Collections are not expected to reach sizes where offset drift becomes a practical problem. Cursor-based pagination can be introduced per-endpoint if needed once collections exceed ~100k documents.

## Implementation

Response envelope for all list endpoints:
```json
{
  "data": [...],
  "total": 1234,
  "limit": 50,
  "offset": 0
}
```

Default: `limit=50`, max: `limit=200`. Invalid params return `400 Bad Request`.

**Affected endpoints:** `/companies`, `/company-themes`, `/channels`, `/providers`, `/company-channel-providers`, `/provider-credentials`, `/domain-catalogue`, `/event-catalogue`, `/layout-templates`

## Links

- **Audit finding:** [[Audits/Audit-2026-06-13]] — Critical Finding: no pagination
- **Technical debt:** [[Technical Debt/Open/TD-009 No Pagination on List Endpoints]]
- **Action item:** AP-005 in [[Sprints/Sprint-001]]
