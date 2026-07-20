---
name: project-dec016-navigation
description: DEC-016 accepted 2026-06-25 — sidebar must follow configuration workflow order, not DB tables. Defines canonical Business App and Platform Admin structures. Mandatory for all future sidebar changes.
metadata:
  type: project
---

DEC-016 (Navigation Configuration Flow) accepted 2026-06-25. Sidebar is a guided setup workflow, not a directory.

**Why:** Sidebar was ordered by implementation detail (DB tables, module names). The new order reflects the configuration dependency chain so users can onboard without documentation.

**Business App sidebar order (Communication Setup):**
1. My Company → 2. Theme → 3. Enabled Providers → 4. Credentials → 5. Domains → 6. Templates → 7. Events → then Operations: Test Notifications

Reports, Media, Storage **removed** from Business App sidebar.

**Platform Admin sections:** Overview → Platform (Companies, Platform Admins) → Communication Catalog (Channels, Providers, Provider Schemas, Global Templates) → Operations → Security → Settings

**Naming rule:** Business terminology only. "Enabled Providers" not "Channel Providers". "Domains" not "Domain Catalogues".

**Future module gate:** Any new sidebar item must answer: (1) which workflow stage, (2) which section, (3) Business App or Platform Admin. No addition without answers.

**How to apply:** Before adding any sidebar item or route, consult DEC-016. `lib/config/role-config.ts` sidebar arrays must match the canonical structures in DEC-016. Supersedes UX.md §4 sidebar ordering where conflicts exist.

[[docs_governance]]
