# Final Audit Report — docs/ Pre-Merge

| Field | Value |
|---|---|
| Audit date | 2026-06-23 |
| Branch | `docs/migration-2026-06-23` |
| Files scanned | 106 `.md` files |
| Scan passes | 23 automated + manual review |

---

## Summary

| Severity | Count |
|---|---|
| **FAIL** | **11** |
| WARNING | 67 |
| PASS | 38 |

**FAIL count > 0. Required fixes are listed at the end. Merge is blocked until all FAILs are resolved.**

---

## Pass Results

| ID | Check | Result |
|---|---|---|
| P-001 | All 12 target folders exist (`Architecture/`, `Backend/`, `Frontend/`, `Decisions/`, `Business/`, `Governance/`, `Reference/`, `Audits/`, `TechnicalDebt/`, `Sprints/`, `Templates/`, `Archive/`) | **PASS** |
| P-002 | DEC-001 through DEC-012 — all 12 files present in `Decisions/` | **PASS** |
| P-003 | ADR-001 through ADR-006 — all 6 files present in `Decisions/` | **PASS** |
| P-004 | DEC-001 through DEC-005 have correct internal IDs matching filenames | **PASS** |
| P-005 | ADR-001 through ADR-006 have correct internal IDs matching filenames | **PASS** |
| P-006 | All 4 archive files have archive headers | **PASS** |
| P-007 | No old DEC files remain in `Backend/` or `Frontend/` subfolders | **PASS** |
| P-008 | No duplicate DEC numbers (no two files share the same DEC-NNN) | **PASS** |
| P-009 | `Decisions/README.md` lists all 12 DECs and 6 ADRs | **PASS** |
| P-010 | All 17 backend Technical Debt open items present | **PASS** |
| P-011 | No `.md` files remain in `communications-backend/` source tree | **PASS** |
| P-012 | No `.md` files remain in `communications-front/` source tree | **PASS** |
| P-013 | `Frontend/UX.md` §3 navbar correctly reflects ADR-003 (no env badge, no role badge) | **PASS** |
| P-014 | `Frontend/UX.md` §10 UX-002, UX-003 marked closed per ADR-003 | **PASS** |
| P-015 | `Backend/Security.md` has 5-role model (company_owner present) | **PASS** |
| P-016 | `Backend/Security.md` BR-004 updated to reflect DEC-008 A3 (platform_admin requires isPlatformCompany company) | **PASS** |
| P-017 | All 4 archive documents have correct archive headers with supersession links | **PASS** |
| P-018 | No broken links from active documents into `Archive/` | **PASS** |
| P-019 | `docs/README.md` top-level index exists and links to all folders | **PASS** |
| P-020 | `Decisions/README.md` unified index exists | **PASS** |
| P-021 | `Archive/README.md` archive index with full list exists | **PASS** |
| P-022 | No duplicate files (identical content) detected | **PASS** |
| P-023 | Technical Debt `Backend/Resolved/` contains correct resolved items | **PASS** |
| P-024 | Governance/ has all 4 agent documents + roadmap + DoD + project lifecycle | **PASS** |
| P-025 | Business/ has all 5 documents (Vision, MVP, Business Rules, Customer Journey, Pricing) | **PASS** |
| P-026 | Audits/ has 3 historical audit files + README | **PASS** |
| P-027 | Sprints/ has all 11 sprint documents (platform + backend + frontend) | **PASS** |
| P-028 | Templates/ has 5 templates (ADR, DEC, AI Session, Feature Spec, Meeting Notes) | **PASS** |
| P-029 | `Frontend/State-Management.md` stale platform_admin guard fixed (scope check, not companyId check) | **PASS** |
| P-030 | `Backend/API.md` stale `platform_admin has companyId=null` statement fixed | **PASS** |
| P-031 | `Decisions/DEC-009` stale `platform_admin has companyId=null` statement fixed | **PASS** |
| P-032 | `Frontend/Architecture.md` migration note present | **PASS** |
| P-033 | `Backend/Security.md` contains RBAC gap report (merged from vault) | **PASS** |
| P-034 | `Backend/Security.md` contains AES-256-GCM encryption detail (merged from vault) | **PASS** |
| P-035 | `Frontend/UX.md` contains vault design principles and Global Interaction Patterns (merged) | **PASS** |
| P-036 | Backend/Environment.md present (unique vault content, not in original project docs) | **PASS** |
| P-037 | `Frontend/Components.md` and `Frontend/Design-System.md` present (unique vault content) | **PASS** |
| P-038 | `Backend/Architecture.md` and `Backend/Overview.md` present (unique vault content) | **PASS** |

---

## Fail Results

### F-001 — DEC-006 claims wrong internal ID

| Field | Value |
|---|---|
| File | `Decisions/DEC-006-Frontend-Stack.md` |
| Line 1 | `# DEC-002 — Frontend Stack` |
| Expected | `# DEC-006 — Frontend Stack` |
| ID field | Missing (frontmatter not updated) |
| Impact | Any tool or reader parsing the document header will see DEC-002. The filename says DEC-006. |

### F-002 — DEC-007 claims wrong internal ID

| File | `Decisions/DEC-007-Role-Navigation-and-Route-Protection.md` |
|---|---|
| Line 1 | `# DEC-003 — Role Navigation and Route Protection` |
| Line 5 | `\| ID \| DEC-003 \|` |
| Expected | `# DEC-007 …` / `\| ID \| DEC-007 \|` |

### F-003 — DEC-008 claims wrong internal ID

| File | `Decisions/DEC-008-User-Company-Role-Lifecycle.md` |
|---|---|
| Line 1 | `# DEC-004 — User Company Role Lifecycle` |
| Line 5 | `\| ID \| DEC-004 \|` |
| Expected | `# DEC-008 …` / `\| ID \| DEC-008 \|` |

### F-004 — DEC-009 claims wrong internal ID

| File | `Decisions/DEC-009-Authentication-Registration-Lifecycle.md` |
|---|---|
| Line 1 | `# DEC-005 — Authentication, Registration and User Creation Lifecycle` |
| Line 5 | `\| ID \| DEC-005 \|` |
| Expected | `# DEC-009 …` / `\| ID \| DEC-009 \|` |

### F-005 — DEC-010 claims wrong internal ID

| File | `Decisions/DEC-010-Module-Ownership-Communication-Surfaces.md` |
|---|---|
| Line 1 | `# DEC-006 — Module Ownership, Admin Views and Invitation Sender Credentials` |
| Line 5 | `\| ID \| DEC-006 \|` |
| Expected | `# DEC-010 …` / `\| ID \| DEC-010 \|` |

### F-006 — DEC-011 claims wrong internal ID

| File | `Decisions/DEC-011-Platform-Company-Field-and-Invariants.md` |
|---|---|
| Line 1 | `# DEC-007 — Platform Company Field and Invariants` |
| Line 5 | `\| ID \| DEC-007 \|` |
| Expected | `# DEC-011 …` / `\| ID \| DEC-011 \|` |

### F-007 — DEC-012 claims wrong internal ID

| File | `Decisions/DEC-012-Platform-Communication-Resolution-Strategy.md` |
|---|---|
| Line 1 | `# DEC-008 — Platform Communication Resolution Strategy` |
| Line 5 | `\| ID \| DEC-008 \|` |
| Expected | `# DEC-012 …` / `\| ID \| DEC-012 \|` |

---

### F-008 — Broken relative link in Frontend/Architecture.md (link A)

| File | `Frontend/Architecture.md` |
|---|---|
| Line 115 | `[DEC-004 §7](../Backend/Decisions/DEC-004%20User%20Company%20Role%20Lifecycle.md#7-frontend-single-source-of-truth--role-configts)` |
| Target resolved | `docs/Backend/Decisions/DEC-004 User Company Role Lifecycle.md` — **DOES NOT EXIST** |
| Why | `Backend/Decisions/` folder was removed during migration. This file moved to `Decisions/DEC-008-User-Company-Role-Lifecycle.md` |
| Correct link | `[DEC-008 §7](../Decisions/DEC-008-User-Company-Role-Lifecycle.md#7-frontend-single-source-of-truth--role-configts)` |

### F-009 — Broken relative link in Frontend/Architecture.md (link B)

| File | `Frontend/Architecture.md` |
|---|---|
| Line 248 | `[DEC-004 A2 §A2.5](../Backend/Decisions/DEC-004%20User%20Company%20Role%20Lifecycle.md#a25-permission-matrix)` |
| Target resolved | **DOES NOT EXIST** |
| Correct link | `[DEC-008 A2 §A2.5](../Decisions/DEC-008-User-Company-Role-Lifecycle.md#a25-permission-matrix)` |

---

### F-010 — Broken relative link in Archive/Decisions/DEC-003

| File | `Archive/Decisions/DEC-003-Role-Navigation-pre-Sprint001.md` |
|---|---|
| Link | `[DEC-007 — Role Navigation…](../Decisions/DEC-007-Role-Navigation-and-Route-Protection.md)` |
| Target resolved | `Archive/Decisions/Decisions/DEC-007…` — **DOES NOT EXIST** |
| Why | File is in `Archive/Decisions/`. Path `../Decisions/` resolves to `Archive/Decisions/`, not `docs/Decisions/`. |
| Correct link | `[DEC-007 — Role Navigation…](../../Decisions/DEC-007-Role-Navigation-and-Route-Protection.md)` |

### F-011 — Broken relative link in Archive/Decisions/DEC-004

| File | `Archive/Decisions/DEC-004-User-Lifecycle-pre-Amendment.md` |
|---|---|
| Link | `[DEC-008 — User, Company and Role Lifecycle](../Decisions/DEC-008-User-Company-Role-Lifecycle.md)` |
| Target resolved | **DOES NOT EXIST** |
| Correct link | `[DEC-008 — User, Company and Role Lifecycle](../../Decisions/DEC-008-User-Company-Role-Lifecycle.md)` |

---

## Warning Results

### Category W-ID: DEC Internal ID mismatches in cross-references

These are references in active documents that use old project DEC numbers. They are warnings (not fails) because the correct file is reachable via the `Decisions/` folder — the numbers are confusing but not broken links. They should be corrected after merge in a dedicated cleanup commit.

| ID | File | Line | Old reference | Correct reference |
|---|---|---|---|---|
| W-001 | `Frontend/Authentication.md` | 61, 86, 181, 229 | `DEC-004 A1`, `DEC-004 A2` | `DEC-008 A1`, `DEC-008 A2` |
| W-002 | `Frontend/Architecture.md` | 62, 68, 72, 159 | `DEC-004 A1/A2` | `DEC-008 A1/A2` |
| W-003 | `Frontend/Routes.md` | 13 | `DEC-004 A1` | `DEC-008 A1` |
| W-004 | `Frontend/State-Management.md` | 25, 61 | `DEC-004 A1`, `DEC-004 A2 BR-…` | `DEC-008 A1`, `DEC-008 A2 BR-…` |
| W-005 | `Backend/API.md` | 7, 32, 338 | `DEC-004 Amendment A1/A2`, `DEC-004 A1`, `DEC-004 §5` | `DEC-008 Amendment A1/A2`, etc. |
| W-006 | `Backend/API.md` | 55, 275 | `DEC-005 §2`, `DEC-005 §4 and DEC-006` | `DEC-009 §2`, `DEC-009 §4 and DEC-010` |
| W-007 | `Backend/Database.md` | 7 | `Depends on \| DEC-004, DEC-005` | `DEC-008, DEC-009` |
| W-008 | `Backend/Database.md` | 105, 155 | `DEC-005 §6`, `DEC-005 implementation` | `DEC-009 §6`, `DEC-009 implementation` |
| W-009 | `Backend/Database.md` | 24, 157 | `DEC-007` (platform company) | `DEC-011` |
| W-010 | `Backend/Database.md` | 33, 34, 158 | `DEC-008` (comm templates) | `DEC-012` |
| W-011 | `Backend/Database.md` | 156 | `DEC-006 implementation` | `DEC-010 implementation` |
| W-012 | `Architecture/dual-surface-module-model.md` | 8 | `DEC-004 Amendment A2` | `DEC-008 Amendment A2` |
| W-013 | `Decisions/ADR-004` | 13, 21, 60, 147, 193, 211 | `DEC-004 A2`, `DEC-004 A3` | `DEC-008 A2`, `DEC-008 A3` |
| W-014 | `Decisions/ADR-004` | 176, 212 | `DEC-005 §3.2`, `DEC-005 —` | `DEC-009 §3.2`, `DEC-009 —` |
| W-015 | `Decisions/ADR-004` | 213 | `DEC-006 —` (module ownership) | `DEC-010 —` |
| W-016 | `Decisions/ADR-005` | 27, 78, 162 | `DEC-004 A3` | `DEC-008 A3` |
| W-017 | `Decisions/ADR-005` | 177, 223, 224 | `DEC-005 invitation lifecycle`, `DEC-007` | `DEC-009`, `DEC-011` |
| W-018 | `Decisions/ADR-006` | 229, 233, 269, 270 | `DEC-006` (module), `DEC-008` (comm res) | `DEC-010`, `DEC-012` |
| W-019 | `Decisions/DEC-007` | 9 | `Depends on \| DEC-004 Amendment A1/A2` | `DEC-008 Amendment A1/A2` |
| W-020 | `Decisions/DEC-008` | 1247 | `See DEC-007` (platform company, in A3 note) | `See DEC-011` |
| W-021 | `Decisions/DEC-008` | 1192, 1194, 1229 | `DEC-007 (2026-06-23)` refinement (platform company) | `DEC-011 (2026-06-23)` |
| W-022 | `Decisions/DEC-009` | 9 | `Depends on \| DEC-004 Amendment A2` | `DEC-008 Amendment A2` |
| W-023 | `Decisions/DEC-010` | 6 | `superseded by DEC-008` (comm resolution) | `superseded by DEC-012` |
| W-024 | `Decisions/DEC-010` | 9, 11 | `DEC-004 Amendment A2, DEC-005`, `DEC-008 supersedes §4` | `DEC-008 A2, DEC-009`, `DEC-012 supersedes §4` |
| W-025 | `Decisions/DEC-011` | 9, 16, 58, 191, 192, 238, 239 | `DEC-004 Amendment A3` | `DEC-008 Amendment A3` |
| W-026 | `Decisions/DEC-012` | 1, 5, 354, 407 | Internal title says `DEC-008`, table header `under DEC-008` | `DEC-012`, `under DEC-012` — resolved by F-007 fix |
| W-027 | `Sprints/Frontend/Sprint-003.md` | 90 | `[[../Decisions/DEC-003 Role Navigation and Route Protection]]` | Wikilink + old filename; use `[DEC-007](../../Decisions/DEC-007-Role-Navigation-and-Route-Protection.md)` |

---

### Category W-WL: Obsidian Wikilinks requiring conversion

54 files contain Obsidian `[[wikilink]]` syntax. These do not resolve in GitHub, IDE Markdown viewers, or any non-Obsidian renderer. The content is present and accessible via correct docs/ paths — links are non-functional, not broken in terms of missing information.

**High-priority wikilinks** (link to content that does exist in docs/ but at a new path):

| ID | File | Wikilink | Should become |
|---|---|---|---|
| W-028 | `Architecture/Data-Models.md:68` | `[[Modules/Communication/Backend/Database]]` | `[Backend Database](../Backend/Database.md)` |
| W-029 | `Architecture/Global-Architecture.md:78` | `[[Modules/Communication/Backend/Overview]]` | `[Backend Overview](../Backend/Overview.md)` |
| W-030 | `Architecture/Infrastructure-Layer.md:31-32` | `[[Modules/Communication/Backend/Architecture]]`, `[[…/Environment]]` | Relative links to `../Backend/` |
| W-031 | `Architecture/Platform-Layer.md:26-28` | `[[Modules/Communication/Backend/Security]]`, etc. | Relative links to `../Backend/` |
| W-032 | `Architecture/Communication-Layer.md:25-27` | `[[Modules/Communication/Backend/Architecture]]`, etc. | Relative links to `../Backend/` |
| W-033 | `Architecture/Tech-Stack.md:51` | `[[Modules/Communication/Backend/Overview]]` | `[Backend Overview](../Backend/Overview.md)` |
| W-034 | `Sprints/Platform-Backlog.md:9` | `[[Modules/Communication/Backend/Backlog]]` | `[Backend Backlog](Backend/Backlog.md)` |
| W-035 | `Sprints/Current-Sprint.md:11` | `[[Modules/Communication/Backend/Current Sprint]]` | `[Backend Current Sprint](Backend/Current-Sprint.md)` |
| W-036 | `Governance/Roadmap.md:32` | `[[Modules/Communication/Backend/…]]` | Relative links to `../Sprints/Backend/` |
| W-037 | `Frontend/Overview.md:89,115-123` | `[[Authentication]]`, `[[Architecture]]`, etc. | Relative markdown links |
| W-038 | `Frontend/Components.md:11,139` | `[[Design-System]]`, `[[UX]]` | `[Design-System](./Design-System.md)`, `[UX](./UX.md)` |
| W-039 | `ADR-001,002,003,004,005,006` | `[[DEC-003 Role Navigation]]`, `[[ADR-00X …]]` | Relative links to `./DEC-007-…`, `./ADR-00X-…` |
| W-040 | `DEC-001,002,003` | `[[Audits/Audit-2026-06-13]]`, `[[Technical Debt/…]]`, `[[Decisions/DEC-001]]` | Relative links to `../../Audits/`, `../../TechnicalDebt/` |
| W-041 | Various sprint files | `[[../../../../…]]` deep relative wikilinks | Standard markdown relative links |
| W-042 | `Audits/Backend-Audit-2026-06-14.md:295` | `[[../../../../Modules/…]]` | `[Frontend Audit 2026-06-14](../Audits/Frontend-Audit-2026-06-14.md)` |
| W-043 | `Governance/AI-Agents.md` | `[[communication-backend-agent]]`, `[[…]]` | `[communication-backend-agent](./Agents/communication-backend-agent.md)` |

**Lower-priority wikilinks** (links to vault-only content, Obsidian-navigation context):
- 29 additional files with wikilinks to sprint docs, backlog items, governance files — all using vault-relative paths that have valid equivalents in `docs/Sprints/`, `docs/Governance/`.

---

### Category W-EMPTY: Heading immediately followed by sub-heading (style only)

229 instances found across 20 files. These are cases where a parent `##` heading has no introductory text before the first `###` sub-heading. This is a documentation style issue (no content between heading levels) but not a correctness problem.

| ID | Severity | Files | Count |
|---|---|---|---|
| W-044 | WARNING (style) | `Frontend/Components.md`, `Frontend/Design-System.md`, `Frontend/Routes.md`, `Frontend/Architecture.md`, `Frontend/UX.md`, `Frontend/State-Management.md` and 14 others | 229 instances |

**Notable empty sections requiring review (not purely stylistic):**

| ID | File | Section | Issue |
|---|---|---|---|
| W-045 | `Templates/ADR.md` | `## Consequences → ### Positive / ### Negative / ### Neutral` | Template placeholder sections with no example content — by design, acceptable |
| W-046 | `TechnicalDebt/Frontend/Open/README.md` | Open items list | No frontend TD items listed yet — acceptable placeholder |

---

### Category W-VAULT: References to vault folder structure

12 active documents reference `Modules/Communication/` paths that do not exist in `docs/`. Information is present under new paths, but the references will confuse readers unfamiliar with the old vault structure.

| ID | File | Reference | Correct path in docs/ |
|---|---|---|---|
| W-047 | `Backend/Overview.md:139-147` | Wikilinks to `[[Architecture]]`, `[[API]]`, etc. | Relative links within `Backend/` |
| W-048 | `Backend/Architecture.md` | Wikilinks to `[[Overview]]`, `[[Database]]`, `[[Security]]`, `[[Environment]]` | Relative links within `Backend/` |
| W-049 | `Governance/AI-Agents.md:57,60,65` | `Modules/Communication/Backend/`, `Modules/Communication/Frontend/` | `communications-backend/` and `communications-front/` source paths (correct per agent config) |
| W-050 | `Sprints/Frontend/Sprint-001.md:262` | `Modules/Communication/Frontend/` | Historical reference — acceptable in historical sprint records |
| W-051 | `Sprints/Frontend/Backlog.md:26` | `Modules/Communication/Frontend/` | Historical reference — acceptable in backlog |
| W-052 | `Audits/Backend-Audit-2026-06-14.md:404` | `Modules/Communication/Frontend/` | Immutable audit snapshot — acceptable |

---

### Category W-SELF: Documents referencing communications-backend/src paths

| ID | File | Reference | Severity |
|---|---|---|---|
| W-053 | `Decisions/DEC-008-User-Company-Role-Lifecycle.md:1135,1142` | `communications-backend/src/platform/users/users.service.ts` | INFO — actionable gap, not a broken link |
| W-054 | `Governance/AI-Agents.md:56` | `communications-backend/src/` | Correct — agent config describes ownership scope |
| W-055 | `Governance/Agents/communication-frontend-agent.md:127` | `communications-backend/src/` | Correct — agent cross-boundary rule |

---

### Category W-DEC10-DEC12: Supersession notes inside DEC-010 and DEC-012 self-references

DEC-010 (Module Ownership) has its header status say "superseded by DEC-008" when it should say "superseded by DEC-012" (Communication Resolution). This will be fixed when F-005 is addressed (internal ID update), since the supersession note is part of the content that needs updating.

DEC-012 (Communication Resolution) has an internal table row saying "under DEC-008" (meaning the old DEC-008 Communication Resolution = itself). This is a self-reference loop that resolves correctly once F-007 updates the internal ID from DEC-008 to DEC-012.

| ID | File | Issue |
|---|---|---|
| W-056 | `Decisions/DEC-010-Module-Ownership-Communication-Surfaces.md:6,11` | Status says "superseded by DEC-008" → should be "superseded by DEC-012" |
| W-057 | `Decisions/DEC-012-Platform-Communication-Resolution-Strategy.md:354` | Table header "under DEC-008" → "under DEC-012" (self-reference) |
| W-058 | `Decisions/ADR-006-Communication-Resolution-Strategy.md:270` | Related: "DEC-008 — full technical specification" → "DEC-012 —" |

---

## Self-Containment Assessment

| Check | Result | Notes |
|---|---|---|
| All DEC files present and accessible via `Decisions/` | PASS | 12 DECs + 6 ADRs |
| All Backend docs present without requiring vault access | PASS | 6 files in `Backend/` |
| All Frontend docs present without requiring vault access | PASS | 8 files in `Frontend/` |
| Architecture, Business, Governance, Reference accessible | PASS | All moved from vault |
| Wikilinks functional without Obsidian | FAIL (W-WL) | 54 files have non-resolving wikilinks in git renderers |
| All DEC cross-references resolve to real files | WARNING | Files exist; numbering in reference text is stale |
| No document requires access to external vault | WARNING | 12 files reference `Modules/Communication/` paths; information is in docs/ at different paths |

**The folder is self-contained in the sense that all information is present.** The wikilinks do not cause missing information — they just do not render as clickable links in GitHub. A reader can find every referenced document via the correct docs/ path. However, the non-resolving wikilinks are a usability FAIL for the stated goal of "can be used without access to Obsidian."

---

## Required Fixes Before Merge

The following 11 FAIL items must be resolved:

### Fix Group 1 — Update internal IDs in 7 DEC files (F-001 to F-007)

For each file, update the H1 title and the `| ID |` frontmatter field:

| File | Change H1 from → to | Change ID from → to |
|---|---|---|
| `Decisions/DEC-006-Frontend-Stack.md` | `# DEC-002 …` → `# DEC-006 …` | No ID field; add `\| ID \| DEC-006 \|` |
| `Decisions/DEC-007-Role-Navigation-and-Route-Protection.md` | `# DEC-003 …` → `# DEC-007 …` | `DEC-003` → `DEC-007` |
| `Decisions/DEC-008-User-Company-Role-Lifecycle.md` | `# DEC-004 …` → `# DEC-008 …` | `DEC-004` → `DEC-008` |
| `Decisions/DEC-009-Authentication-Registration-Lifecycle.md` | `# DEC-005 …` → `# DEC-009 …` | `DEC-005` → `DEC-009` |
| `Decisions/DEC-010-Module-Ownership-Communication-Surfaces.md` | `# DEC-006 …` → `# DEC-010 …` | `DEC-006` → `DEC-010` |
| `Decisions/DEC-011-Platform-Company-Field-and-Invariants.md` | `# DEC-007 …` → `# DEC-011 …` | `DEC-007` → `DEC-011` |
| `Decisions/DEC-012-Platform-Communication-Resolution-Strategy.md` | `# DEC-008 …` → `# DEC-012 …` | `DEC-008` → `DEC-012` |

### Fix Group 2 — Repair 2 broken relative links in Frontend/Architecture.md (F-008, F-009)

| Line | Current (broken) | Replace with |
|---|---|---|
| 115 | `[DEC-004 §7](../Backend/Decisions/DEC-004%20User%20Company%20Role%20Lifecycle.md#7-frontend…)` | `[DEC-008 §7](../Decisions/DEC-008-User-Company-Role-Lifecycle.md#7-frontend-single-source-of-truth--role-configts)` |
| 248 | `[DEC-004 A2 §A2.5](../Backend/Decisions/DEC-004%20User%20Company%20Role%20Lifecycle.md#a25-permission-matrix)` | `[DEC-008 A2 §A2.5](../Decisions/DEC-008-User-Company-Role-Lifecycle.md#a25-permission-matrix)` |

### Fix Group 3 — Repair 2 broken relative links in Archive files (F-010, F-011)

| File | Current (broken) | Replace with |
|---|---|---|
| `Archive/Decisions/DEC-003-Role-Navigation-pre-Sprint001.md` | `(../Decisions/DEC-007-…)` | `(../../Decisions/DEC-007-Role-Navigation-and-Route-Protection.md)` |
| `Archive/Decisions/DEC-004-User-Lifecycle-pre-Amendment.md` | `(../Decisions/DEC-008-…)` | `(../../Decisions/DEC-008-User-Company-Role-Lifecycle.md)` |

---

## Post-Merge Recommendations (Warnings → Future cleanup PR)

These 67 warnings do not block merge but should be addressed in a dedicated cleanup commit after merge:

1. **Convert all 54 wikilink files** to standard markdown relative links (scripted search-replace pass; ~2 hours).
2. **Update DEC cross-references** in 27 active documents that still use old project DEC numbers (DEC-004 → DEC-008, DEC-005 → DEC-009, DEC-006 → DEC-010, DEC-007 → DEC-011, DEC-008 → DEC-012 — context-dependent).
3. **Update DEC-010 status** from "superseded by DEC-008" to "superseded by DEC-012".
4. **Update DEC-012 self-reference** table row "under DEC-008" → "under DEC-012".
5. **Update ADR-006 Related** section: "DEC-006" → "DEC-010", "DEC-008" → "DEC-012".
6. **Update Backend/Database.md** DEC references (DEC-007 for isPlatformCompany → DEC-011; DEC-008 for comm_templates → DEC-012).
7. **Resolve 229 empty-section style warnings** in vault-origin documents.

---

## Merge Recommendation

**BLOCKED. 11 FAILs must be resolved before merge.**

All 11 failures are mechanical (text replacements in known lines of known files). No architectural or content issues were found. After the 11 fixes are applied and verified, this branch is ready to merge into `main`.

**Estimated fix time:** 20–30 minutes (targeted edits to 11 specific locations).
