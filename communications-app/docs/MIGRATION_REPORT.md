# Documentation Migration Report

| Field | Value |
|---|---|
| Migration date | 2026-06-23 |
| Branch | `docs/migration-2026-06-23` |
| Executed by | Documentation Migration (automated + manual review) |
| Source systems | Obsidian Vault + `docs/` project folder |
| Target | `docs/` — single canonical source |

---

## Summary

| Metric | Count |
|---|---|
| Files moved from vault | 73 |
| Files merged (vault + project) | 6 |
| Files archived | 4 |
| Files deleted | 1 |
| New index/scaffold files created | 5 |
| DEC documents renumbered | 6 (old DEC-003→007 through DEC-008→012) |
| DEC documents added (from vault) | 6 (new DEC-001 through DEC-006) |
| ADR documents moved | 6 |
| Total files in docs/ after migration | 105 |
| Total folders in docs/ | 24 |
| Stale references fixed | 3 (API.md, State-Management.md, DEC-009) |

---

## Files Moved

### Architecture

| Source | Destination |
|---|---|
| Vault: `Architecture/Global Architecture.md` | `docs/Architecture/Global-Architecture.md` |
| Vault: `Architecture/Communication Layer.md` | `docs/Architecture/Communication-Layer.md` |
| Vault: `Architecture/Platform Layer.md` | `docs/Architecture/Platform-Layer.md` |
| Vault: `Architecture/Infrastructure Layer.md` | `docs/Architecture/Infrastructure-Layer.md` |
| Vault: `Architecture/Future Platform Architecture.md` | `docs/Architecture/Future-Platform-Architecture.md` |
| Vault: `Architecture/Gateway Layer.md` | `docs/Architecture/Gateway-Layer.md` |
| Vault: `Architecture/Tech Stack.md` | `docs/Architecture/Tech-Stack.md` |
| Vault: `Architecture/Data Models.md` | `docs/Architecture/Data-Models.md` |

### Business

| Source | Destination |
|---|---|
| Vault: `Business/Vision.md` | `docs/Business/Vision.md` |
| Vault: `Business/MVP.md` | `docs/Business/MVP.md` |
| Vault: `Business/Business Rules.md` | `docs/Business/Business-Rules.md` |
| Vault: `Business/Customer Journey.md` | `docs/Business/Customer-Journey.md` |
| Vault: `Business/Pricing.md` | `docs/Business/Pricing.md` |

### Governance

| Source | Destination |
|---|---|
| Vault: `Project/Roadmap.md` | `docs/Governance/Roadmap.md` |
| Vault: `Project/Governance/Definition of Done.md` | `docs/Governance/Definition-of-Done.md` |
| Vault: `Project/Governance/Project Lifecycle.md` | `docs/Governance/Project-Lifecycle.md` |
| Vault: `Project/Governance/AI Agents.md` | `docs/Governance/AI-Agents.md` |
| Vault: `Project/Governance/Agents/*.md` (4 files) | `docs/Governance/Agents/` |

### Reference

| Source | Destination |
|---|---|
| Vault: `Reference/Glossary.md` | `docs/Reference/Glossary.md` |

### Audits

| Source | Destination |
|---|---|
| Vault: `Modules/Communication/Backend/Audits/Audit-2026-06-13.md` | `docs/Audits/Backend-Audit-2026-06-13.md` |
| Vault: `Modules/Communication/Backend/Audits/Audit-2026-06-14.md` | `docs/Audits/Backend-Audit-2026-06-14.md` |
| Vault: `Modules/Communication/Frontend/Audits/Audit-2026-06-14.md` | `docs/Audits/Frontend-Audit-2026-06-14.md` |
| Vault: `Modules/Communication/Frontend/Audits/README.md` | `docs/Audits/README.md` |

### Templates

| Source | Destination |
|---|---|
| Vault: `_Templates/ADR.md` | `docs/Templates/ADR.md` |
| Vault: `_Templates/AI Session.md` | `docs/Templates/AI-Session.md` |
| Vault: `_Templates/Feature Spec.md` | `docs/Templates/Feature-Spec.md` |
| Vault: `_Templates/Meeting Notes.md` | `docs/Templates/Meeting-Notes.md` |

### Backend (unique vault content)

| Source | Destination |
|---|---|
| Vault: `Modules/Communication/Backend/Overview.md` | `docs/Backend/Overview.md` |
| Vault: `Modules/Communication/Backend/Architecture.md` | `docs/Backend/Architecture.md` |
| Vault: `Modules/Communication/Backend/Environment.md` | `docs/Backend/Environment.md` |

### Frontend (unique vault content)

| Source | Destination |
|---|---|
| Vault: `Modules/Communication/Frontend/Overview.md` | `docs/Frontend/Overview.md` |
| Vault: `Modules/Communication/Frontend/Components.md` | `docs/Frontend/Components.md` |
| Vault: `Modules/Communication/Frontend/Design-System.md` | `docs/Frontend/Design-System.md` |

### Sprints

| Source | Destination |
|---|---|
| Vault: `Development/Current Sprint.md` | `docs/Sprints/Current-Sprint.md` |
| Vault: `Development/Backlog.md` | `docs/Sprints/Platform-Backlog.md` |
| Vault: `Development/Release Plans.md` | `docs/Sprints/Release-Plans.md` |
| Vault: `Modules/Communication/Backend/Current Sprint.md` | `docs/Sprints/Backend/Current-Sprint.md` |
| Vault: `Modules/Communication/Backend/Backlog.md` | `docs/Sprints/Backend/Backlog.md` |
| Vault: `Modules/Communication/Backend/Sprints/Sprint-001.md` | `docs/Sprints/Backend/Sprint-001.md` |
| Vault: `Modules/Communication/Frontend/Current Sprint.md` | `docs/Sprints/Frontend/Current-Sprint.md` |
| Vault: `Modules/Communication/Frontend/Backlog.md` | `docs/Sprints/Frontend/Backlog.md` |
| Vault: `Modules/Communication/Frontend/Sprints/Sprint-001.md` | `docs/Sprints/Frontend/Sprint-001.md` |
| Vault: `Modules/Communication/Frontend/Sprints/Sprint-002.md` | `docs/Sprints/Frontend/Sprint-002.md` |
| Vault: `Modules/Communication/Frontend/Sprints/Sprint-003.md` | `docs/Sprints/Frontend/Sprint-003.md` |

### Technical Debt

| Source | Destination |
|---|---|
| Vault: `Backend/Technical Debt/Open/TD-001 through TD-017` (17 files) | `docs/TechnicalDebt/Backend/Open/` |
| Vault: `Backend/Technical Debt/Resolved/` (4 files) | `docs/TechnicalDebt/Backend/Resolved/` |
| Vault: `Frontend/Technical Debt/Open/README.md` | `docs/TechnicalDebt/Frontend/Open/README.md` |
| Vault: `Frontend/Technical Debt/Resolved/README.md` | `docs/TechnicalDebt/Frontend/Resolved/README.md` |

---

## Files Renamed (DEC Renumbering)

Unified DEC sequence (old project docs → new canonical numbers):

| Old file | New file | Reason |
|---|---|---|
| `Backend/Decisions/DEC-003 Role Navigation.md` | `Decisions/DEC-007-Role-Navigation-and-Route-Protection.md` | Unified sequence |
| `Backend/Decisions/DEC-004 User Company Role Lifecycle.md` | `Decisions/DEC-008-User-Company-Role-Lifecycle.md` | Unified sequence |
| `Backend/Decisions/DEC-005 Authentication Registration.md` | `Decisions/DEC-009-Authentication-Registration-Lifecycle.md` | Unified sequence |
| `Backend/Decisions/DEC-006 Module Ownership.md` | `Decisions/DEC-010-Module-Ownership-Communication-Surfaces.md` | Unified sequence |
| `Backend/Decisions/DEC-007 Platform Company Field.md` | `Decisions/DEC-011-Platform-Company-Field-and-Invariants.md` | Unified sequence |
| `Backend/Decisions/DEC-008 Communication Resolution.md` | `Decisions/DEC-012-Platform-Communication-Resolution-Strategy.md` | Unified sequence |

New additions from vault (assigned numbers DEC-001 through DEC-006):

| Vault source | New file | Title |
|---|---|---|
| `Backend/Decisions/DEC-001 Notification Contract.md` | `Decisions/DEC-001-Notification-Endpoint-Contract.md` | Notification Endpoint Response Contract |
| `Backend/Decisions/DEC-002 Pagination Strategy.md` | `Decisions/DEC-002-Pagination-Strategy.md` | Pagination Strategy |
| `Backend/Decisions/DEC-003 Queue Architecture.md` | `Decisions/DEC-003-Queue-Architecture.md` | Queue Architecture |
| `Backend/Decisions/DEC-004 API Key Strategy.md` | `Decisions/DEC-004-API-Key-Authentication-Strategy.md` | API Key Authentication Strategy |
| `Backend/Decisions/DEC-005 Test Coverage Strategy.md` | `Decisions/DEC-005-Backend-Test-Coverage-Strategy.md` | Backend Test Coverage Strategy |
| `Frontend/Decisions/DEC-002 Frontend Stack.md` | `Decisions/DEC-006-Frontend-Stack.md` | Frontend Stack |

ADRs moved from vault (no renumbering):

| Vault source | New file |
|---|---|
| `Architecture/Decisions/ADR-001 Dual Navigation Strategy.md` | `Decisions/ADR-001-Dual-Navigation-Strategy.md` |
| `Architecture/Decisions/ADR-002 Global Responsive Standard.md` | `Decisions/ADR-002-Global-Responsive-Standard.md` |
| `Architecture/Decisions/ADR-003 Top Navigation Simplification.md` | `Decisions/ADR-003-Top-Navigation-Simplification.md` |
| `Architecture/Decisions/ADR-004 Platform Operator Company Model.md` | `Decisions/ADR-004-Platform-Operator-Company-Model.md` |
| `Architecture/Decisions/ADR-005 Platform Company Field.md` | `Decisions/ADR-005-Platform-Company-Field-and-Invariants.md` |
| `Architecture/Decisions/ADR-006 Communication Resolution.md` | `Decisions/ADR-006-Communication-Resolution-Strategy.md` |

---

## Files Archived

Documents moved to `docs/Archive/` with archive headers:

| File | Archive destination | Reason |
|---|---|---|
| Vault `Backend/Decisions/DEC-004 User Company Role Lifecycle.md` | `Archive/Decisions/DEC-004-User-Lifecycle-pre-Amendment.md` | Pre-Amendment; 4-role model; `companyId:null` contradicts DEC-008 A3 |
| Vault `Frontend/Decisions/DEC-003 Role Navigation.md` | `Archive/Decisions/DEC-003-Role-Navigation-pre-Sprint001.md` | Pre-Sprint-001 audit draft; superseded by DEC-007 |
| Vault `Backend/API.md` | `Archive/Backend/API-v1.md` | Earlier endpoint listing; superseded by `Backend/API.md` |
| Vault `Backend/Database.md` | `Archive/Backend/Database-v1.md` | Pre-Amendment schema; superseded by `Backend/Database.md` |

---

## Files Merged

| Source A | Source B | Result | Key changes |
|---|---|---|---|
| Vault `Backend/Security.md` (2026-06-14) | Project `Backend/Security.md` (2026-06-15) | `Backend/Security.md` | Project as base; vault's RBAC Gap Report, AES-256-GCM detail, CORS, decorator sections added; BR-004 updated for DEC-008 A3 |
| Vault `Frontend/Architecture.md` (2026-06-14) | Project `Frontend/Architecture.md` (2026-06-15) | `Frontend/Architecture.md` | Project as base; decision references updated to new DEC numbers |
| Vault `Frontend/Authentication.md` (2026-06-14) | Project `Frontend/Authentication.md` (2026-06-15) | `Frontend/Authentication.md` | Project as base; references updated |
| Vault `Frontend/Routes.md` (2026-06-14) | Project `Frontend/Routes.md` (2026-06-15) | `Frontend/Routes.md` | Project as base; references updated |
| Vault `Frontend/State-Management.md` (2026-06-14) | Project `Frontend/State-Management.md` (2026-06-15) | `Frontend/State-Management.md` | Project as base; stale platform_admin validation logic fixed |
| Vault `Frontend/UX.md` (2026-06-14) | Project `Frontend/UX.md` (2026-06-15) | `Frontend/UX.md` | Full rewrite: vault UX patterns + project role/sidebar detail; §3 Navbar rewritten per ADR-003 (badges removed, tabs right); UX gaps UX-002/003 closed; user journeys updated |

---

## Files Deleted

| File | Reason |
|---|---|
| `communications-backend/README.md` | NestJS scaffold boilerplate (generated artifact); no project-specific content |

---

## Broken Links Found and Fixed

| File | Old reference | Fixed reference | Type |
|---|---|---|---|
| `Backend/API.md` | `platform_admin has companyId = null` | Platform admin inherits platform company companyId automatically | Stale normative statement |
| `Frontend/State-Management.md` | `if (user.role === 'platform_admin' && user.companyId !== null)` — incorrect guard | `if (user.role === 'platform_admin' && user.scope !== 'global')` | Stale validation logic |
| `Decisions/DEC-009-Authentication-Registration-Lifecycle.md` | `platform_admin has companyId = null` | Platform admin inherits platform company companyId automatically | Stale normative statement |
| `Frontend/UX.md` §2 | Navbar with env badge + role badge | Navbar per ADR-003 (no badges, tabs right) | Stale UX spec |
| `Frontend/UX.md` §9 | UX-002 and UX-003 open | UX-002 and UX-003 closed (ADR-003) | Stale gap status |

### References Updated (DEC renumbering)

Cross-references updated across all decision and architectural documents:
- `DEC-006 §` → `DEC-010 §`
- `DEC-007 §` → `DEC-011 §`
- `DEC-008 §` → `DEC-012 §`
- `DEC-004 Amendment` → `DEC-008 Amendment` (in DEC-008 self-references)
- `DEC-006 Frontend Stack` → `DEC-006` (already correct, different topic)

---

## Validation Results

### A — Structural Completeness

| Check | Result |
|---|---|
| All 12 target folders exist | PASS |
| DEC-001 through DEC-012 present | PASS (all 12) |
| ADR-001 through ADR-006 present | PASS (all 6) |
| Archive folder and README present | PASS |
| All 4 archived files present with headers | PASS |

### B — Decision Numbering Integrity

| Check | Result |
|---|---|
| No old DEC files remain in Backend/ or Frontend/ | PASS |
| No duplicate DEC numbers | PASS |
| Decisions README lists all 12 DECs and 6 ADRs | PASS |

### D — Content Integrity

| Check | Result |
|---|---|
| UX.md §3 navbar reflects ADR-003 (badges removed) | PASS |
| UX.md §9 UX-002, UX-003 closed | PASS |
| Security.md has 5-role model (company_owner present) | PASS |
| No stale normative `companyId=null` for platform_admin outside Archive | PASS (3 remaining hits are historical/explanatory context in ADR-004, DEC-008 — intentional) |
| All archive documents have archive headers | PASS |

### E — No Orphaned Documents

| Check | Result |
|---|---|
| No .md files in `communications-backend/` source | PASS |
| No .md files in `communications-front/` source | PASS |
| All 17 backend TD open items present | PASS |

### F — Consistency

| Check | Result |
|---|---|
| Decisions/README.md lists all 12 DECs | PASS |
| Decisions/README.md lists all 6 ADRs | PASS |

---

## Outstanding Issues

| # | Issue | Severity | Action required |
|---|---|---|---|
| OUT-001 | Obsidian wikilinks (`[[Architecture]]`, `[[DEC-003]]`, etc.) remain in vault-origin files. These do not break git rendering but do not resolve as links in GitHub/IDE. | LOW | Future pass: convert all remaining wikilinks to relative markdown links using a scripted search-replace |
| OUT-002 | Vault `Backend/Security.md` still exists in the Obsidian vault but is now superseded. | INFO | The vault is no longer canonical; no action required in this repo |
| OUT-003 | `docs/Architecture/Data-Models.md` still references vault path `[[Modules/Communication/Backend/Database]]` internally (Obsidian wikilink). | LOW | Update to relative markdown link `../Backend/Database.md` in a follow-up |
| OUT-004 | `docs/Backend/API.md` §1.2 JWT payload still shows `companyId: string | null` in the example — the comment should note this is non-null for platform_admin. | LOW | Add clarifying comment to the API.md JWT example |

No validation failures. Migration is complete.

---

## Git Branch

All changes are on branch `docs/migration-2026-06-23`.

To merge into main:
```bash
git checkout main
git merge docs/migration-2026-06-23
```
