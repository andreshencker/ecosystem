---
name: project-integrations-architecture
description: ADR-020 defines src/integrations/ as the canonical location for all external integrations; settings/ is being renamed/migrated; docs/integrations/README.md is the entry point
metadata:
  type: project
---

ADR-020 accepted 2026-07-07: `src/integrations/` replaces `src/settings/` as the canonical location for all external integration code in Business App backend.

**Why:** `settings/` was semantically wrong — it contained integration clients and connection state (bi-client, communication-client, communication-connection), not user preferences.

**Migration map:**
- `src/settings/communication-connection/` → `src/integrations/communications/`
- `src/settings/communication-client/` → `src/integrations/communications/`
- `src/settings/bi-client/` → `src/integrations/business-intelligence/`

**Rule:** Every external connection (Communications, BI, Google Calendar, Stripe, Xero, etc.) lives in its own self-contained folder under `src/integrations/`. No integration code lives anywhere else.

**What an integration owns:** authentication, connection state, HTTP client, sync execution, adapters, own models, own docs (README.md).
**What an integration does NOT own:** business rules, domain entities, rendering logic.

**Documents created:**
- `business-app/docs/decisions/ADR-020-integrations-architecture.md`
- `business-app/docs/integrations/README.md` (entry point for integration docs)

**Why:** Code migration is a separate phase. ADR-020 defines the target architecture only.
**How to apply:** Any new external integration goes in `src/integrations/<name>/`. Never in `src/settings/`, `src/modules/`, or `src/infrastructure/`.
