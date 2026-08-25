---
tags: [module, communication, frontend, backlog]
created: 2026-06-14
status: Active
agent: communication-frontend-planning-agent
---

# Communication Frontend — Backlog

Planning and implementation items for the Communication Frontend.
All items must trace to a decision or planning document.

**Planning sprint:** [[Sprints/Sprint-001]] — Completed
**Last sprint:** [[Sprints/Sprint-002]] — Phase A Foundation — Completed
**Active sprint:** [[Sprints/Sprint-003]] — Companies Module (Phase B kick-off) — **Completed**

---

## Phase P — Planning (Communication Frontend Planning Agent)

Items completed by the Planning Agent in Sprint-001. Documentation only.

| ID | Description | Status | Sprint |
|---|---|---|---|
| FP-001 | Agent profile created — `communication-frontend-planning-agent.md` | Completed | Sprint-001 |
| FP-002 | Frontend documentation structure created — `Modules/Communication/Frontend/` | Completed | Sprint-001 |
| FP-003 | Frontend stack decision — `DEC-002 Frontend Stack.md` | Completed | Sprint-001 |
| FP-004 | Architecture planning — `Architecture.md` | Completed | Sprint-001 |
| FP-005 | UX planning — `UX.md` | Completed | Sprint-001 |
| FP-006 | Route planning — `Routes.md` | Completed | Sprint-001 |
| FP-007 | Component planning — `Components.md` | Completed | Sprint-001 |
| FP-008 | State management planning — `State-Management.md` | Completed | Sprint-001 |
| FP-009 | Authentication planning — `Authentication.md` | Completed | Sprint-001 |
| FP-010 | Design system planning — `Design-System.md` | Completed | Sprint-001 |
| FP-011 | Frontend readiness report — included in `Sprint-001.md` | Completed | Sprint-001 |

---

## Phase A — Foundation (Communication Frontend Agent)

First implementation sprint. Can begin only after backend gate is passed and the Communication Frontend Agent is activated.

**Prerequisite:** [[../../../Project/Governance/Agents/communication-backend-agent#Frontend Readiness Gate]] cleared.

| ID | Description | Effort | Dependencies | Status |
|---|---|---|---|---|
| FA-001 | Project initialisation — Next.js 14 App Router with TypeScript, ESLint, route groups `(auth)` + `(portal)` | S | Backend gate passed | Completed |
| FA-002 | MUI v6 + theme setup — `mui-theme.ts`, `ThemeProvider` in root layout | S | FA-001 | Completed |
| FA-003 | Axios client + JWT interceptors — `lib/axios.ts`, refresh lock, retry | S | FA-001 | Completed |
| FA-004 | TanStack Query setup — `QueryProvider.tsx`, `lib/queryClient.ts`, devtools in dev | S | FA-001 | Completed |
| FA-005 | Zustand stores — `auth.store.ts`, `ui.store.ts` | S | FA-001 | Completed |
| FA-006 | App shell layout — AppShell, Sidebar, SidebarItem, SidebarSection, Topbar, PageHeader | M | FA-002 | Completed |
| FA-007 | Auth pages — Login, Register, ForgotPassword, ResetPassword, VerifyEmail | M | FA-003, FA-005 | Completed |
| FA-008 | Auth flow — login, refresh on mount, logout, route guard in portal layout | M | FA-003, FA-005, FA-007 | Completed |
| FA-009 | Shared components — LoadingPage, EmptyState, QueryError, GlobalSnackbar, StatusBadge (ConfirmDialog deferred to Phase B) | M | FA-002 | Completed |
| FA-010 | Environment configuration — `.env.local`, `NEXT_PUBLIC_API_URL`, CSP headers in `next.config.js` | S | FA-001 | Completed |

---

## Phase B — Core Features (Communication Frontend Agent)

| ID | Description | Effort | Dependencies | Status |
|---|---|---|---|---|
| FB-001 | Companies — single-page CRUD (list + create/view/edit/delete drawers) | M | FA-009, hooks | **Completed** (Sprint-003) |
| FB-002 | Company Themes — list, create, edit, delete | M | FB-001 | Not started |
| FB-003 | Channels — read-only list | S | FA-009 | Not started |
| FB-004 | Providers — read-only list | S | FA-009 | Not started |
| FB-005 | Company Channel Providers — list, create, edit | M | FB-001, FB-004 | Not started |
| FB-006 | Provider Credentials — list, create, edit (dynamic form by type) | L | FB-005 | Not started |
| FB-007 | Domain Catalogue — list, create, edit, credential routing | M | FB-001 | Not started |
| FB-008 | Event Catalogue — list, create, edit, bulk upload | M | FB-007 | Not started |
| FB-009 | Layout Templates — list, create, edit, preview | L | FB-002 | Not started |
| FB-010 | Notification test UI — select event, fill variables, view results | M | FB-008, AP-004 complete | Not started |
| FB-011 | File Manager — media upload, storage, presigned download | M | FA-009 | Not started |
| FB-012 | Report generation — PDF/XLSX/CSV | M | FA-009 | Not started |
| FB-013 | Dashboard — summary stats, health indicators | M | All Phase B | Not started |

---

## Phase C — Quality

| ID | Description | Effort | Status |
|---|---|---|---|
| FC-001 | Unit tests for shared components (React Testing Library) | M | Not started |
| FC-002 | Integration tests for auth flow | M | Not started |
| FC-003 | E2E test — login → create company → send notification (Playwright) | L | Not started |
| FC-004 | Accessibility audit (axe-core or Storybook a11y plugin) | S | Not started |
| FC-005 | Performance audit — Lighthouse, bundle analysis | S | Not started |

---

## Related Documents

- [[Sprints/Sprint-001]]
- [[Sprints/Sprint-002]]
- [[Sprints/Sprint-003]]
- [[Current Sprint]]
- [[Audits/Audit-2026-06-14]]
- [[Architecture]]
- [[Decisions/DEC-002 Frontend Stack]]
- [[../../../Project/Governance/Agents/communication-frontend-agent]]
- [[../../Backend/Backlog]]
