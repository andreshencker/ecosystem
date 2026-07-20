---
tags: [decision, communication, frontend]
id: DEC-006
area: Frontend
status: Finalized
created: 2026-06-14
finalized: 2026-06-14
agent: communication-frontend-agent
---

# DEC-006 — Frontend Stack

## Status

**Finalized — 2026-06-14**

This decision is locked. No library may be added to the project outside this list unless a new decision record is created and approved. See the Approved Libraries and Forbidden Libraries sections below.

---

## Context

The Communication Frontend application requires a full technology stack decision before implementation begins. The backend API is stable (all 9 paginated list endpoints, JWT authentication, multipart uploads, file generation, 207 notification contract). All backend Sprint-001 blockers are resolved. Backend readiness score: 91/100 — see [[../../../Backend/Audits/Audit-2026-06-14]].

---

## Decision 1 — Framework

**Next.js 14 with App Router**

| Option | Verdict |
|---|---|
| Next.js 14 — App Router | ✅ Selected |
| Next.js 14 — Pages Router | ❌ Legacy; no Server Components |
| Vite + React SPA | ❌ No SSR; no built-in routing |
| Remix | ❌ Smaller admin-tool ecosystem |

**Rationale:** SSR for auth pages prevents unauthenticated content flash. App Router enables Server Components for layout/shell (reduces client bundle). Built-in file-based routing. First-class TypeScript.

**Consequences:** `'use client'` required on all interactive components. Layouts via `layout.tsx` files. Server vs. Client Component boundary must be understood by all implementors.

---

## Decision 2 — UI Library

**MUI v6 (Material UI)**

| Option | Verdict |
|---|---|
| MUI v6 | ✅ Selected |
| Ant Design | ❌ Weaker TypeScript; more opinionated |
| Chakra UI | ❌ Fewer complex components |
| shadcn/ui + Tailwind | ❌ Tailwind explicitly forbidden (see below) |

**Rationale:** Native MUI X DataGrid integration. Comprehensive component library. MUI theme system enables the custom design tokens defined in `Design-System.md`. Strong TypeScript generics throughout.

**Consequences:** Bundle managed by Next.js tree-shaking. Theme must be defined in `theme/mui-theme.ts` before any component work begins. Requires React 18+.

---

## Decision 3 — State Management

**TanStack Query v5 (server state) + Zustand v4 (client state)**

| Option | Verdict |
|---|---|
| TanStack Query + Zustand | ✅ Selected |
| Redux Toolkit + RTK Query | ❌ Excessive boilerplate |
| SWR + React Context | ❌ Weaker pagination and mutation support |
| Jotai | ❌ Not designed for server state |

**Rationale:** TanStack Query owns all API data (caching, pagination, background refetch, mutations). Zustand owns auth state and UI state only. The two layers are fully decoupled.

**Rule: Never put API data in Zustand. Never manage form state in TanStack Query.**

---

## Decision 4 — API Client

**Axios with custom instance and interceptors**

| Option | Verdict |
|---|---|
| Axios | ✅ Selected |
| Fetch (native) | ❌ No interceptors; JWT refresh is manual |
| ky | ❌ Less mature interceptor ecosystem |
| ofetch | ❌ Nuxt-origin; not React-first |

**Rationale:** Request interceptor attaches `Authorization: Bearer <token>`. Response interceptor handles `401` → refresh → retry with concurrent request queuing. Single `apiClient` instance used everywhere.

---

## Decision 5 — Authentication Strategy

**Access token in Zustand memory + Refresh token in localStorage**

| Option | Verdict |
|---|---|
| Memory + localStorage | ✅ Selected (current backend constraint) |
| Memory + httpOnly cookie | ❌ Backend AP-012 not yet implemented |
| NextAuth.js | ❌ Unnecessary abstraction over custom JWT |
| Both in localStorage | ❌ Access token XSS exposure |

**Rationale:** Backend TD-016 returns refresh token in body. localStorage matches current backend behavior. Access token never persisted to disk.

**Constraint:** Strict CSP header required from Phase A. Migrate to httpOnly cookie when AP-012 lands. See [[../Authentication]].

---

## Decision 6 — Form Library

**React Hook Form v7**

| Option | Verdict |
|---|---|
| React Hook Form v7 | ✅ Selected |
| Formik v2 | ❌ Controlled re-renders; feels legacy |
| TanStack Form | ❌ Too new; limited examples |

**Rationale:** Uncontrolled components = no per-keystroke re-renders. `useForm<Schema>` infers TypeScript types from Zod schemas. Mature MUI integration via `<Controller>`.

---

## Decision 7 — Validation Library

**Zod**

| Option | Verdict |
|---|---|
| Zod | ✅ Selected |
| Yup | ❌ Less TypeScript-idiomatic |
| Valibot | ❌ Less ecosystem maturity |

**Rationale:** TypeScript-first. `z.infer<typeof schema>` gives form data types automatically. `zodResolver` from `@hookform/resolvers/zod` is the only integration needed.

---

## Decision 8 — Data Grid

**MUI X DataGrid Community**

| Option | Verdict |
|---|---|
| MUI X DataGrid Community | ✅ Selected |
| TanStack Table | ❌ Headless; requires full custom rendering |
| AG Grid Community | ❌ License complexity on Pro |

**Rationale:** Native MUI integration. `paginationMode="server"` maps directly to backend `{ data, total, limit, offset }` envelope. No additional license.

**Constraint:** Advanced features (row grouping, export) require MUI X Pro — not in scope for v1.

---

## Decision 9 — Charts

**Recharts**

| Option | Verdict |
|---|---|
| Recharts | ✅ Selected |
| Chart.js + react-chartjs-2 | ❌ Canvas-based; heavier |
| Nivo | ❌ Overkill |
| MUI X Charts | ❌ Still maturing |

**Rationale:** Lightweight, SVG-based, declarative React API. Sufficient for delivery stats, per-channel breakdowns, and success/failure ratios.

---

## Decision 10 — File Upload Strategy

**React Dropzone + custom `useFileUpload` hook**

| Option | Verdict |
|---|---|
| React Dropzone + hook | ✅ Selected |
| Uppy | ❌ Too heavy |
| MUI native file input | ❌ No drag-and-drop |

**Rationale:** Backend accepts `multipart/form-data`. Dropzone handles drag-and-drop and client-side size/type validation. Custom hook wraps Axios upload with progress tracking.

---

## Decision 11 — Code Editor (Template HTML/CSS)

**CodeMirror v6 via `@uiw/react-codemirror`**

| Option | Verdict |
|---|---|
| CodeMirror v6 (`@uiw/react-codemirror`) | ✅ Selected |
| Monaco Editor | ❌ ~2MB bundle; WASM dependency; VS Code overhead |
| Plain MUI TextField multiline | ❌ No syntax highlighting; poor DX |
| Ace Editor | ❌ Older; less maintained |

**Context:** Layout templates contain HTML and CSS. The template editor needs syntax highlighting and line numbers to be usable. This was identified as a gap in the initial planning.

**Rationale:** CodeMirror v6 is lightweight (~100KB), has a React-first wrapper (`@uiw/react-codemirror`), and supports HTML and CSS language modes. Monaco Editor would add ~2MB for minimal UX benefit.

**Scope:** Template editor page only — `layout-templates/[id]/page.tsx`. Must be `'use client'`.

**Packages:** `@uiw/react-codemirror`, `@codemirror/lang-html`, `@codemirror/lang-css`

---

## Approved Library List

The following packages are approved for use without additional decision records:

| Package | Purpose | Decision |
|---|---|---|
| `next` (v14) | Framework | #1 |
| `react`, `react-dom` (v18) | Runtime | #1 |
| `typescript` (v5+) | Language | #1 |
| `@mui/material` (v6) | UI components | #2 |
| `@mui/icons-material` | Icons | #2 |
| `@mui/x-data-grid` | Data table | #8 |
| `@emotion/react`, `@emotion/styled` | MUI peer dep | #2 |
| `@tanstack/react-query` (v5) | Server state | #3 |
| `@tanstack/react-query-devtools` | Dev tooling | #3 |
| `zustand` (v4) | Client state | #3 |
| `axios` | HTTP client | #4 |
| `react-hook-form` (v7) | Forms | #6 |
| `@hookform/resolvers` | Form + Zod bridge | #6+7 |
| `zod` | Validation & types | #7 |
| `recharts` | Charts | #9 |
| `react-dropzone` | File upload | #10 |
| `@uiw/react-codemirror` | Code editor | #11 |
| `@codemirror/lang-html` | HTML syntax | #11 |
| `@codemirror/lang-css` | CSS syntax | #11 |
| `eslint`, `prettier`, `eslint-config-next` | Code quality | Standard |

---

## Forbidden Libraries

The following are **not permitted** without a new decision record:

| Library | Reason |
|---|---|
| Tailwind CSS | Conflicts with MUI theming; dual styling system creates inconsistency |
| Chakra UI | Conflicts with MUI; parallel component library |
| Ant Design | Conflicts with MUI; parallel component library |
| Redux / Redux Toolkit | Resolved in favor of TanStack Query + Zustand (#3) |
| React Router | Next.js App Router is the routing system |
| Styled Components | MUI uses Emotion; mixed CSS-in-JS creates specificity issues |
| NextAuth.js | Resolved in favor of custom JWT flow (#5) |
| Formik | Resolved in favor of React Hook Form (#6) |
| Yup | Resolved in favor of Zod (#7) |
| Monaco Editor | Resolved in favor of CodeMirror (#11) |
| MUI X Pro / AG Grid Pro | Commercial license not approved for v1 |
| Any other UI component library | Creates design inconsistency and bundle bloat |

**Process to add an unapproved library:** Create `DEC-0NN.md` with options evaluated, decision, rationale, and consequences. No library may be installed until the DEC is documented.

---

## Final Stack Summary

| Area | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14 |
| UI Library | MUI (Material UI) | v6 |
| Icons | `@mui/icons-material` | v6 |
| Data Grid | MUI X DataGrid Community | latest |
| Server State | TanStack Query | v5 |
| Client State | Zustand | v4 |
| API Client | Axios | latest |
| Auth Strategy | Memory + localStorage | — |
| Forms | React Hook Form | v7 |
| Validation | Zod | latest |
| Charts | Recharts | latest |
| File Upload | React Dropzone + hook | latest |
| Code Editor | CodeMirror v6 (`@uiw/react-codemirror`) | latest |
| Language | TypeScript | 5+ |
| Runtime | Node.js | 20 LTS |

---

## Related Documents

- [[../Architecture]]
- [[../Design-System]]
- [[../State-Management]]
- [[../Authentication]]
- [[../Components]]
- [[../../../Backend/API.md]]
- [[../../../Backend/Technical Debt/Open/TD-016 Refresh Token in Response Body]]
