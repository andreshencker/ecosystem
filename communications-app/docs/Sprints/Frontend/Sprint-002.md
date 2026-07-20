---
tags: [sprint, communication, frontend, implementation]
sprint: 2
start-date: 2026-06-14
status: In Progress
goal: Phase A Foundation — app shell, auth flow, routing, shared components, API infrastructure
agent: communication-frontend-agent
---

# Frontend Sprint-002 — Phase A Foundation

## Goal

Implement all Phase A Foundation items (FA-001 through FA-010). Deliver a working application shell with authentication flow, route protection, and shared component library. No business modules.

**Agent:** Communication Frontend Agent
**Dates:** 2026-06-14
**Prerequisite:** Backend gate passed — readiness score 91/100. See [[../../../../Project/Governance/Agents/communication-frontend-agent]].

---

## Sprint Items

### FA-001 — Project Structure

| Field | Value |
|---|---|
| **ID** | FA-001 |
| **Priority** | P0 |
| **Effort** | S |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | Backend gate passed |

**Description:** Next.js 14 App Router project with TypeScript, ESLint, route groups `(auth)` and `(portal)`.

**Files created:**
- `app/layout.tsx` — root layout (MUI ThemeProvider, QueryClientProvider, GlobalSnackbar)
- `app/page.tsx` — redirect to `/dashboard`
- `app/not-found.tsx`
- `app/(auth)/layout.tsx` — centered card layout
- `app/(portal)/layout.tsx` — AppShell with auth guard
- `tsconfig.json` — `strict: true`, `@/*` path alias
- `next-env.d.ts`

**Acceptance criteria:**
- [x] App Router with route groups `(auth)` and `(portal)` established
- [x] TypeScript strict mode enabled
- [x] ESLint configured
- [x] `@/*` import alias working

---

### FA-002 — MUI v6 Theme Setup

| Field | Value |
|---|---|
| **ID** | FA-002 |
| **Priority** | P0 |
| **Effort** | S |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-001 |

**Description:** MUI v6 theme with custom palette, typography, and component overrides. `ThemeProvider` wired in root layout.

**Files created:**
- `theme/mui-theme.ts` — palette (brand primary + neutrals + status colours), typography scale, MUI component overrides

**Acceptance criteria:**
- [x] `theme/mui-theme.ts` created
- [x] `ThemeProvider` wraps root layout
- [x] Custom palette (primary, secondary, neutral, status) applied
- [x] Typography scale matches Design-System.md
- [x] MUI component overrides applied (Button, TextField, Card, Chip)

---

### FA-003 — Axios Client + JWT Interceptors

| Field | Value |
|---|---|
| **ID** | FA-003 |
| **Priority** | P0 |
| **Effort** | S |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-001 |
| **Related Decision** | [[../Decisions/DEC-002 Frontend Stack]] |

**Description:** Single Axios instance with JWT bearer token injection, 401 refresh handling with a lock to prevent concurrent refresh storms, and retry of the original request after token refresh.

**Files created:**
- `lib/axios.ts` — Axios instance, request interceptor (attach access token), response interceptor (401 → refresh lock → retry)

**Acceptance criteria:**
- [x] Single Axios instance exported from `lib/axios.ts`
- [x] Request interceptor attaches `Authorization: Bearer <accessToken>` from Zustand
- [x] Response interceptor catches 401
- [x] Refresh lock prevents concurrent refresh calls
- [x] Queued requests replayed after successful refresh
- [x] On second 401 (refresh failed) → clears auth state and redirects to `/login`

---

### FA-004 — TanStack Query Setup

| Field | Value |
|---|---|
| **ID** | FA-004 |
| **Priority** | P0 |
| **Effort** | S |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-001 |

**Description:** TanStack Query v5 `QueryClientProvider` with configured stale time, retry policy, and devtools in development.

**Files created:**
- `lib/queryClient.ts` — QueryClient instance with default options
- `components/shared/QueryProvider.tsx` — client component wrapping `QueryClientProvider` + ReactQueryDevtools in dev

**Acceptance criteria:**
- [x] `lib/queryClient.ts` configures stale time, retry, refetch-on-window-focus
- [x] `QueryProvider` is a `'use client'` component
- [x] `QueryProvider` wraps root layout
- [x] ReactQueryDevtools included in development builds only

---

### FA-005 — Zustand Stores

| Field | Value |
|---|---|
| **ID** | FA-005 |
| **Priority** | P0 |
| **Effort** | S |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-001 |
| **Related Decision** | [[../Decisions/DEC-002 Frontend Stack]] |

**Description:** Two Zustand stores: `auth.store.ts` for authentication state (user, access token, isAuthenticated) and `ui.store.ts` for UI state (sidebar open, snack queue).

**Files created:**
- `stores/auth.store.ts` — user, accessToken, isAuthenticated, login/logout/setToken actions
- `stores/ui.store.ts` — sidebarOpen, snackQueue, enqueueSnack/dequeueSnack actions

**Acceptance criteria:**
- [x] `auth.store.ts` holds user profile, access token, isAuthenticated flag
- [x] `ui.store.ts` holds sidebar open state and snack queue
- [x] Access token stored only in Zustand memory (not persisted to localStorage)
- [x] Refresh token stored in localStorage (via auth API layer)

---

### FA-006 — App Shell Layout

| Field | Value |
|---|---|
| **ID** | FA-006 |
| **Priority** | P0 |
| **Effort** | M |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-002 |

**Description:** App shell layout components: AppShell (container), Sidebar (nav), SidebarItem, SidebarSection, Topbar (user menu), PageHeader (title + breadcrumbs). Portal route group layout uses AppShell.

**Files created:**
- `components/layout/AppShell.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/SidebarItem.tsx`
- `components/layout/SidebarSection.tsx`
- `components/layout/Topbar.tsx`
- `components/layout/PageHeader.tsx`
- `components/layout/index.ts`

**Acceptance criteria:**
- [x] AppShell renders Sidebar + Topbar + main content area
- [x] Sidebar is collapsible (controlled by `ui.store.ts`)
- [x] SidebarItem handles active state from current route
- [x] Topbar shows user name and logout action
- [x] PageHeader accepts title, subtitle, and breadcrumb props
- [x] Portal layout (`app/(portal)/layout.tsx`) wraps content in AppShell

---

### FA-007 — Auth Pages

| Field | Value |
|---|---|
| **ID** | FA-007 |
| **Priority** | P0 |
| **Effort** | M |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-003, FA-005 |
| **Related** | [[../Authentication]] |

**Description:** All five authentication screens implemented under `app/(auth)/`. Each page uses React Hook Form + Zod validation and calls auth API hooks.

**Files created:**
- `app/(auth)/layout.tsx` — centered card layout (no sidebar)
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(auth)/verify-email/page.tsx`

**Acceptance criteria:**
- [x] Login page: email + password fields, submit calls `POST /auth/login`, stores token in Zustand, redirects to `/dashboard`
- [x] Register page: name, email, password fields, submit calls `POST /auth/register`
- [x] Forgot password page: email field, submit calls `POST /auth/forgot-password`
- [x] Reset password page: reads `token` from query string, password + confirm fields
- [x] Verify email page: reads `token` from query string, auto-submits `POST /auth/verify-email`
- [x] All forms use React Hook Form + Zod for validation
- [x] All forms show inline field errors and a loading state on submit

---

### FA-008 — Auth Flow

| Field | Value |
|---|---|
| **ID** | FA-008 |
| **Priority** | P0 |
| **Effort** | M |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-003, FA-005, FA-007 |
| **Related** | [[../Authentication]] |

**Description:** Auth guard in the portal layout: checks Zustand `isAuthenticated`; on first mount attempts a token refresh from `localStorage`; redirects unauthenticated users to `/login`.

**Files:**
- `app/(portal)/layout.tsx` — auth guard logic (token refresh on mount, redirect if unauthenticated)
- `hooks/useAuth.ts` — convenience hook (wraps auth store selectors)
- `hooks/api/useAuthApi.ts` — TanStack Query / mutation hooks for all auth endpoints
- `hooks/api/index.ts` — barrel export

**Acceptance criteria:**
- [x] Portal layout checks `isAuthenticated` before rendering children
- [x] On mount: if refresh token exists in localStorage → call `POST /auth/refresh` → populate Zustand
- [x] If refresh fails → clear localStorage → redirect to `/login`
- [x] Unauthenticated direct navigation to portal routes → redirected to `/login`
- [x] Logout clears Zustand + removes refresh token from localStorage + redirects to `/login`

---

### FA-009 — Shared Components

| Field | Value |
|---|---|
| **ID** | FA-009 |
| **Priority** | P0 |
| **Effort** | M |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-002 |

**Description:** Reusable UI components used across all features: loading state, empty state, query error display, global snackbar, status badge. ConfirmDialog is planned for Phase B as it is not yet implemented.

**Files created:**
- `components/shared/LoadingPage.tsx` — full-page centered spinner
- `components/shared/EmptyState.tsx` — icon + heading + optional CTA for empty lists
- `components/shared/QueryError.tsx` — displays TanStack Query error with optional retry button
- `components/shared/GlobalSnackbar.tsx` — reads from `ui.store.ts` snack queue, renders MUI Snackbar
- `components/shared/StatusBadge.tsx` — MUI Chip wrapper for active/inactive/status display

**Note:** `ConfirmDialog` was listed in the backlog (FA-009) but was not implemented in this sprint. It will be delivered as part of Phase B when delete/destructive-action flows are implemented (FB-001+).

**Acceptance criteria:**
- [x] LoadingPage renders centered CircularProgress for full-page loading states
- [x] EmptyState accepts icon, title, description, action button props
- [x] QueryError displays error message and retry button
- [x] GlobalSnackbar is wired in root layout and consumes `ui.store.ts` snack queue
- [x] StatusBadge maps boolean `active` and string status values to MUI Chip colours
- [ ] ConfirmDialog — deferred to Phase B

---

### FA-010 — Environment Configuration

| Field | Value |
|---|---|
| **ID** | FA-010 |
| **Priority** | P0 |
| **Effort** | S |
| **Status** | Completed |
| **Completion Date** | 2026-06-14 |
| **Dependencies** | FA-001 |
| **Related** | [[../Architecture]] — Environment Variables section |

**Description:** `.env.local` configured with API URL and app environment. CSP headers added to `next.config.js` to mitigate TD-016.

**Files created/modified:**
- `.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:3001`, `NEXT_PUBLIC_APP_ENV=development`
- `next.config.js` — CSP headers as specified in Architecture.md

**Acceptance criteria:**
- [x] `.env.local` contains `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_ENV`
- [x] `lib/axios.ts` uses `process.env.NEXT_PUBLIC_API_URL` as baseURL
- [x] `next.config.js` sets Content-Security-Policy header
- [x] CSP allows `connect-src` to `http://localhost:3001`

---

## Definition of Done — Sprint-002

| Check | Status |
|---|---|
| Implementation matches Architecture.md folder structure | Completed |
| TypeScript strict: no errors | Completed |
| MUI v6: ThemeProvider wired at root layout | Completed |
| Auth guard: blocks unauthenticated portal access | Completed |
| Auth pages: all 5 screens implemented | Completed |
| Shared components: LoadingPage, EmptyState, QueryError, GlobalSnackbar, StatusBadge | Completed |
| No business modules created | Completed |
| Backlog updated (FA-001–FA-010 marked Completed) | Completed |
| Sprint document created | Completed |
| ConfirmDialog deferred to Phase B — noted in Backlog | Pending |

---

## Outstanding Items / Deferred Work

| Item | Reason | Target |
|---|---|---|
| `ConfirmDialog` component | Not implemented in this sprint; no delete flows required until Phase B | FB-001 (Companies) |
| `DataTable` component | Not implemented; required for all CRUD list pages | Phase B start |
| `FormDrawer`, `FilterBar`, form field components | Required for CRUD forms | Phase B start |

---

## Related Documents

- [[../Backlog]]
- [[../Architecture]]
- [[../Authentication]]
- [[../State-Management]]
- [[../Design-System]]
- [[../../../../Project/Governance/Agents/communication-frontend-agent]]
- [[Sprints/Sprint-001]]
