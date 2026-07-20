---
tags: [module, communication, frontend, sprint]
---

# Communication Frontend — Current Sprint

**Last sprint:** [[Sprints/Sprint-003]] — Companies Module — **CLOSED 2026-06-14**
**Current sprint:** Sprint-004 — TBD (Phase B continuation)
**Status:** Sprint-003 complete. Awaiting Sprint-004 planning.

---

## Sprint-003 Final Status

All 8 items delivered. Single-page CRUD Companies module implemented.

| ID | Item | Status | Completed |
|---|---|---|---|
| FB-001-0 | RBAC Foundation — `UserRole`, `UserPermissions`, `usePermissions`, `PermissionGuard` | ✅ | 2026-06-14 |
| FB-001-a | Responsive DataTable — DataGrid (desktop) + card list (mobile) | ✅ | 2026-06-14 |
| FB-001-b | Form infrastructure — ControlledTextField/Select/Switch, FormDrawer, FormError | ✅ | 2026-06-14 |
| FB-001-c | Companies API layer — `useCompanies`, mutations, Zod schemas | ✅ | 2026-06-14 |
| FB-001-d | Companies page `/companies` — list, responsive, Sidebar link | ✅ | 2026-06-14 |
| FB-001-e | Create drawer — `CompanyForm` create mode | ✅ | 2026-06-14 |
| FB-001-f | View drawer — `CompanyViewDrawer` with role-aware actions | ✅ | 2026-06-14 |
| FB-001-g | Edit drawer — `CompanyForm` edit mode, role-aware field set | ✅ | 2026-06-14 |
| — | Delete `ConfirmDialog` with danger variant | ✅ | 2026-06-14 |

### Architecture Decisions Applied

- **Single-page CRUD:** All Companies operations on `/companies`. No sub-routes created.
- **Route clarification:** `(portal)` route group does not add URL segments. Route is `/companies`, not `/portal/companies`.
- **RBAC:** `usePermissions()` + `PermissionGuard` used on all actions. Defaults to `platform_admin` until backend returns role in auth response.
- **Responsive:** `mobileCardConfig` defined for Companies; DataTable switches at `sm` (600px) breakpoint.
- **Form reuse:** `CompanyForm` handles both create and edit with a `mode` prop.

### Validation

| Check | Result |
|---|---|
| `npm run type-check` | ✅ 0 errors |
| `npm run build` | ✅ exit 0, 11 pages |
| `localhost:3000/` | ✅ HTTP 307 → `/auth/login` |
| `localhost:3000/auth/login` | ✅ HTTP 200 |
| `localhost:3000/companies` | ✅ HTTP 200 |
| `localhost:3000/dashboard` | ✅ HTTP 200 |

---

## Next Steps

**Sprint-004 candidates (Phase B continuation):**
- FB-002 Company Themes — list, create, edit, delete (same single-page CRUD pattern)
- FB-003 Channels — read-only list
- FB-004 Providers — read-only list

See [[Backlog]] for full Phase B item list.

---

## Full Sprint Detail

- [[Sprints/Sprint-003]]
- [[Audits/Audit-2026-06-14]]
