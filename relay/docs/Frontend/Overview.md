---
tags: [module, communication, frontend]
---

# Communication Frontend — Overview

## Purpose

The Communication Frontend is a Next.js 14 admin portal that provides a web interface for the Communication Platform. It enables company administrators to:

- Manage company configuration and branding
- Configure communication providers, channels, and credentials
- Define notification domains and event catalogues
- Manage layout templates for emails and PDFs
- Test notification delivery end-to-end
- Download generated files (PDF, XLSX, CSV)

All data is served by the Communication Backend at `http://localhost:3001`. The frontend is a pure consumer — it owns no domain data and calls no external services directly.

**Service location:** `invoiceApp/communications-front/`
**Port:** 3000
**Package name:** `communications-front`
**Version:** 0.1.0
**Framework:** Next.js 14 (App Router)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 14.2.29 (App Router) |
| Language | TypeScript | 5.7+ (strict) |
| UI Library | MUI (Material UI) | v6 |
| Server State | TanStack Query | v5 |
| Client State | Zustand | v4 |
| API Client | Axios | v1.7 |
| Forms | React Hook Form | v7 |
| Validation | Zod | v3 |
| Data Grid | MUI X DataGrid Community | v7 |
| Charts | Recharts | v2 |
| File Upload | React Dropzone | v14 |
| Node | Node.js | 20 LTS |

---

## Running Locally

**Prerequisites:** Node.js 20, the Communication Backend running on port 3001.

```bash
cd communications-frontend

# Install dependencies
npm install

# Start development server (port 3000)
npm run dev
```

The app is available at `http://localhost:3000`.
On first load, unauthenticated users are redirected to `/auth/login`.

---

## npm Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run type-check` | TypeScript type check without emitting |
| `npm run lint` | ESLint |

---

## Authentication

The frontend uses a dual-token strategy:

| Token | Storage | TTL |
|---|---|---|
| Access token | Zustand memory store | 15 min |
| Refresh token | `localStorage` key `comm_portal_rt` | 7 days |

On every page load into a protected route, the portal layout checks the access token in memory. If absent, it attempts a silent refresh using the stored refresh token. Failed refresh redirects to `/auth/login`.

See [[Authentication]] for full flow documentation.

---

## Route Groups

| Group | Path prefix | Auth | Layout |
|---|---|---|---|
| `(auth)` | `/auth/*` | Public | Centered card |
| `(portal)` | all others | JWT required | AppShell (Sidebar + Topbar) |

The root path `/` redirects to `/auth/login` server-side.

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001` | Backend base URL |
| `NEXT_PUBLIC_APP_ENV` | No | `development` | Used for conditional devtools |

---

## Related Docs

- [[Architecture]] — App Router structure, component layers, folder layout
- [[Authentication]] — Token strategy, auth flows, route protection
- [[State-Management]] — Zustand stores, TanStack Query config
- [[Design-System]] — MUI theme, colour palette, typography
- [[Routes]] — Full route map with backend endpoint references
- [[Components]] — Component taxonomy, props, design rules
- [[Current Sprint]] — What is in progress now
- [[Backlog]] — What is planned for this service
- [[Decisions/DEC-002 Frontend Stack]] — Technology decisions and rationale
