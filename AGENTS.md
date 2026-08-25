# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

## Repository Layout

```
invoiceApp/
├── relay/                        ← SaaS notifications/communications platform ("Relay")
│   ├── backend/                 ← NestJS API  (port 3001)
│   └── frontend/                ← Next.js 14 App Router (port 3000)
├── business-app/                ← ERP / invoicing application
│   ├── backend/                 ← NestJS API  (port 3002)
│   ├── frontend/                ← Next.js 14 + MUI (port 3003)
│   └── business-intelligence/   ← Python / FastAPI analytics service (port 8000)
└── jtrade/                      ← Separate trading platform (independent)
    ├── backend/
    ├── frontend/
    └── orchestrator/
```

The two main apps (Relay, Business) are separate deployments with separate MongoDB databases. They share no code — Business App calls Relay over HTTP using an Integration Token. The Business Intelligence service is called only by the Business App backend; it never receives direct frontend requests.

---

## Commands

All commands must be run from their respective sub-directory.

### Relay — Backend (`relay/backend/`)
```bash
npm run start:dev      # watch mode (ts-node, hot reload)
npm run build          # nest build → dist/
npm run test           # jest (all *.spec.ts under src/)
npx jest path/to.spec  # single test file
npm run lint           # eslint --fix
```

### Relay — Frontend (`relay/frontend/`)
```bash
npm run dev            # next dev -p 3000
npm run build          # next build
npm run type-check     # tsc --noEmit
npm run lint           # next lint
```

### Business App — Backend (`business-app/backend/`)
```bash
npm run start:dev
npm run build
npm run test
npx jest src/path/to.spec.ts   # single file
npm run lint
```

### Business App — Frontend (`business-app/frontend/`)
```bash
npm run dev            # next dev -p 3003
npm run build
npm run type-check     # tsc --noEmit
npm run lint
```

### Business Intelligence (`business-app/business-intelligence/`)
```bash
# Run from business-app/business-intelligence/ — ALWAYS use app.main:app prefix
uvicorn app.main:app --reload

# Alembic migrations
alembic upgrade head              # apply pending migrations
alembic current                   # show current migration version
alembic revision --autogenerate -m "description"  # generate new migration

# Tests
pytest tests/ -v                  # all BI tests
pytest tests/test_contract_admin.py -v   # single test file
```

Jest config for both NestJS backends: `rootDir=src`, pattern `.*\.spec\.ts$`, runner `ts-jest`.

---

## Environment Variables

**Relay backend** (`.env`):
- `PORT=3001`, `MONGODB_URI` (db: `communication_platform_db`)
- `RELAY_API_KEY` — internal admin key protecting engine endpoints
- `CREDENTIALS_MASTER_KEY_BASE64` — AES-256-GCM key for credential encryption
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- Redis connection, AWS/S3, Platform SMTP

**Business App backend** (`.env`):
- `PORT=3002`, `MONGODB_URI` (db: `business_app_db`)
- `RELAY_API_URL=http://localhost:3001`
- `RELAY_API_KEY` — same admin key, used for catalog provisioning calls
- `CREDENTIALS_MASTER_KEY_BASE64` — separate key for Business App's own secrets
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` / `PLATFORM_ADMIN_BOOTSTRAP_PASSWORD`
- `BI_SERVICE_URL=http://localhost:8000`
- `BI_INTERNAL_SERVICE_TOKEN` — shared secret with BI service

**Business Intelligence** (`.env`):
- `BI_DATABASE_URL` — Neon PostgreSQL connection string (asyncpg format)
- `BI_INTERNAL_SERVICE_TOKEN` — must match Business App's value
- `PORT=8000`
- `MONGO_URI` — Business App MongoDB (read-only; required for ETL)
- `MONGO_DATABASE=business_app_db`

**Frontends** (`.env.local`):
- `NEXT_PUBLIC_API_URL` — backend base URL (3001 for Relay, 3002 for Business)
- `NEXT_PUBLIC_APP_ENV`

---

## Architecture

### Relay

Full-stack SaaS notification engine. Tenants connect their own SMTP/SMS/calendar providers. Key modules under `src/`:
- `auth/`, `users/`, `user-invitations/`, `company/` — SaaS platform layer
- `communication/channels/` — providers, credentials, runtime routing
- `communication/notifications/` — event dispatch, templates, queueing (BullMQ)
- `communication/notifications/events/domain-catalogue/` — tenant domain/event catalog CRUD
- `calendar/` — CalDAV/Google/Outlook calendar connections and event queries
- `files/` — S3 media storage
- `infrastructure/` — database, redis, queue, security, outbox

Auth: JWT (access + refresh) for browser users; `x-api-key` or `x-integration-token` for machine clients. `GlobalAuthGuard` inspects both and sets `authContext` on the request.

### Business App

ERP application. Calls Relay for all notification delivery. Never touches OAuth, CalDAV, or external providers directly. Key areas under `src/`:
- `modules/` — ERP domains: `auth`, `users`, `user-invitations`, `business`, `customer`, `contracts`, `shifts`, `linked-calendars`, `platform-admin`, `provisioning`
- `integrations/relay/` — single HTTP client to Relay
- `integrations/business-intelligence/` — HTTP client to BI service, error classification
- `analytics/` — gateway controller to BI (proxies queries for business-scoped users)
- `infrastructure/` — database, redis, queue, security, outbox

#### Business App → Relay Integration

`RelayModule` (`src/integrations/relay/`) is the single point of contact:
- `RelayConnectionService.getRelayConnectionForContext(type, businessId?)` — returns `{ relayCompanyId, decryptedToken }`
- `RelayClientService.notifyEvent(params)` — fire-and-forget notification; never throws; returns `boolean`
- `RelayCatalogProvisioningService` — idempotent catalog provisioning, called at startup and at token-save time

Type routing: `type: 'platform'` uses platform base company credentials; `type: 'business'` uses the specific Business's credentials.

Platform event seeds live in `src/integrations/relay/seed/domains/<module>/<module>.seed.ts`. To add a new platform domain: create the seed file, import it in `platform-seed.ts`. Event canonical key: `domainKey.eventKey` (e.g. `shifts.shift_created`).

The underlying `IntegrationConnection` document's `provider` field is kept at its historical value `'communications'` (and the connection's REST route stays `/settings/communications`) — this is a persisted MongoDB value keyed per business, so renaming it would orphan every existing connection. Only the code identifiers (module/service/class names) were renamed to Relay; the wire-level provider key and its route were deliberately left alone. See the comment on `PROVIDER` in `relay-connection.controller.ts`.

#### Business App → BI Integration

`BusinessIntelligenceService` (`src/integrations/business-intelligence/business-intelligence.service.ts`) wraps `BIHttpClient`. All BI errors are classified into `BIUnavailableError` with a `category` field:
- `connection_refused` / `timeout` → 503 to caller
- `auth_error` (401/403) → 503 (misconfiguration)
- `not_found` (404) → 503 (endpoint missing)
- `validation_error` (422) → 400 Bad Request
- `bi_internal_error` (500+) → 503

Platform Admin controllers (`src/modules/platform-admin/`) proxy BI endpoints directly to privileged users. All BI proxy controllers follow the same pattern: assert platform_admin role, delegate to `BusinessIntelligenceService`, map `BIUnavailableError` to a safe HTTP response.

#### Tenant Isolation

Every ERP endpoint resolves `businessId` from `AuthContext.companyId` (set by `GlobalAuthGuard` from the JWT). `businessId` must **never** come from the request body, query params, or the frontend. All DB queries include a `businessId` filter.

### Business Intelligence (Python/FastAPI)

Separate analytical service with its own PostgreSQL warehouse (Neon) in a star schema. Never modifies operational data, never sends emails, never executes business workflows.

**Startup requirements**: `BI_DATABASE_URL` set, Alembic migrations applied, `BI_INTERNAL_SERVICE_TOKEN` set. The service refuses to start if any of these is missing.

**Security**: `InternalAuthMiddleware` blocks all `/internal/*` routes without `x-internal-service-token` header. `/health` is public.

**Folder responsibilities**:
```
app/
├── core/        Config (pydantic-settings), InternalAuthMiddleware
├── database/    postgres.py (SQLAlchemy async), mongo.py (Motor, read-only ETL source)
│   └── repositories/  Typed read-only query classes per domain (AbstractRepository)
├── models/      SQLAlchemy ORM models (dim_*, fact_* tables) + semantic definitions
├── etl/         Extract→Transform→Load pipelines
│   ├── extractors/    MongoDB readers (one per model, cursor-based)
│   ├── transformers/  Field mapping + type coercion (use Decimal for money, never float)
│   ├── loaders/       PostgresLoader (upsert by source_id or event_id)
│   ├── pipelines/     Per-model Pipeline + FullSyncPipeline
│   └── sync/          SyncManager (cursor state, concurrency lock), SyncRegistry
├── contracts/   Information contracts: Pydantic schemas + service query logic
│   └── <domain>/      schema.py (Pydantic models), service.py (query logic)
├── semantic/    Analytical metadata catalogue (SemanticRegistry, dimensions, measures, KPIs)
└── web/api/     FastAPI routers (one file per domain group)
```

**Analytical models**: all tables use plain `String` source IDs (MongoDB ObjectId hex) — no FK constraints — so ETL can populate them independently of dimension tables. Idempotency key is always `source_id` for entity snapshots and fact tables.

**ETL pattern**: Register pipelines in `app/etl/__init__.py` via `SyncRegistry.register(name, PipelineClass)`. Each pipeline: extractor yields raw dicts from MongoDB, transformer converts to ORM model, PostgresLoader upserts. Cursor stored in `etl_sync_state` by `(company_id, model_name)`.

**BI test pattern**: Tests use `unittest.mock` (`AsyncMock`, `MagicMock`) for repository and DB sessions — no live database required. `conftest.py` has an `autouse` fixture that resets settings state between tests. Run with `pytest tests/ -v`.

---

## Code Patterns

### Backend Module Structure (NestJS, Business App)

```
src/modules/<domain>/
  <domain>.module.ts
  <domain>.controller.ts   ← HTTP layer; extracts ctx from @CurrentUser()
  <domain>.service.ts      ← business logic
  schemas/<domain>.schema.ts   ← @Schema({ collection: '...', timestamps: true, versionKey: false })
  dto/create-<domain>.dto.ts
  dto/update-<domain>.dto.ts
  dto/<domain>-response.dto.ts  ← plain interface + toXxxResponse() function
  sync/                         ← (for modules with sync subsystems, e.g. shifts)
```

Controller always resolves `businessId` from the JWT, never from the request:
```ts
private resolveContext(ctx: AuthContext) {
  if (!ctx.companyId) throw new ForbiddenException('No business assigned');
  return { businessId: ctx.companyId, actor: { email: ctx.email ?? '', firstName: ... } };
}
```

Schema indexes: compound indexes declared after `SchemaFactory.createForClass`. Use `{ unique: true, sparse: true }` for optional unique keys (e.g. `externalOccurrenceId`).

Notifications fire-and-forget — never await, never throw:
```ts
this.commClient.notifyEvent({ type: 'business', businessId, event: 'domain.event_key', email, data: {...} })
  .then(ok => this.logger.log(`notification ${ok ? 'delivered' : 'failed'}`))
  .catch(() => {});
```

### Shifts Sync Subsystem (`src/modules/shifts/sync/`)

`ShiftSyncService.syncBusiness()` is the single entry point — usable from both controllers and future scheduled jobs. Key rules:
- Only sync calendars with `{ status: 'active', flow: 'shifts' }` — never holidays or payment calendars
- Upsert key: `{ businessId, externalOccurrenceId }` (unique sparse index)
- During update: overwrite only provider-owned fields (date, time, title, location, etc.); never overwrite business-owned fields (contractId, status, notes, breakMinutes)
- Disappeared events: set `syncStatus: 'deleted'`, never hard-delete
- `CalendarEventToShiftMapper.map()` converts Relay events to `NormalizedShiftFromEvent` — returns null for invalid events (skipped)

### Linked Calendars (`flow` field)

`LinkedCalendar.flow` determines the business purpose: `'holidays'` | `'shifts'` | `'payments'` | `null`. The sync engine must filter by `flow: 'shifts'` — all other flows must be excluded.

### Frontend (Next.js App Router, MUI, React Query, Zustand)

**Routing**: All authenticated pages under `app/(portal)/`. Auth pages under `app/(auth)/`. Middleware enforces RBAC via `isRouteAllowed(role, pathname)` from `config/rbac/route-rules.ts`. Adding a new page requires updating both `route-rules.ts` (allowed routes) and `role-config.ts` (sidebar items).

**API client**: `lib/axios.ts` exports `apiClient` (axios + JWT interceptors + token refresh). Never create a second axios instance.

**Hooks pattern** (`hooks/api/use<Domain>.ts`):
```ts
export function useFoo(params = {}) {
  return useQuery({ queryKey: ['foo', params], queryFn: () => apiClient.get('/foo', { params }).then(r => r.data) });
}
export function useCreateFooMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore(s => s.pushSnack);
  return useMutation({
    mutationFn: dto => apiClient.post('/foo', dto).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['foo'] }); pushSnack({ type: 'success', message: '...' }); },
    onError: err => pushSnack({ type: 'error', message: extractApiMessage(err, 'Fallback') })
  });
}
```

Toasts: always via `useUIStore(s => s.pushSnack)` — never call a toast library directly.

**Shared components** (`components/shared/`):
- `DataTable` — MUI DataGrid + responsive mobile card fallback. Pass `mobileCardConfig` for mobile cards; `mobileCardConfig.actions` for card footer buttons
- `PageHeader` — title, count, subtitle, breadcrumbs, actions slot
- `FormDrawer` — right-side drawer with header/scrollable-body/footer-actions layout (width 480px default)
- `SearchToolbar` — search input + filter slot + clear button (pass `hasActiveFilters` to show clear)
- `ConfirmDialog`, `EmptyState`, `ErrorState`, `GlobalSnackbar`, `LoadingButton`

**Page architecture**: Every domain uses a single page with an inline drawer — no separate create/edit/view sub-pages. The drawer receives a `mode: 'create' | 'view' | 'edit'` prop and handles all three states.

**Type conventions**: shared API types in `types/api.ts`; domain types in `types/<domain>.ts`; BI proxy types in `types/platform-admin-<domain>.ts`.

### BI Information Contracts (Python)

Each BI "contract" (e.g. Contract Admin, Customer Summary) follows this structure:
```
app/contracts/<domain>/
  __init__.py
  schema.py    ← Pydantic response models + ISSUE_REGISTRY dict
  service.py   ← query/aggregation logic (receives SQLAlchemy session)
app/web/api/contracts/<domain>.py  ← FastAPI router (thin — calls service)
app/database/repositories/<domain>_repository.py  ← typed read-only repo
```

KPI ratios use `_safe_rate(numerator, denominator)` — returns `None` when denominator is zero (never 0 or 1). The frontend must handle `null` KPI values gracefully.

Support issue codes are stable machine-readable strings (e.g. `CONTRACT_MISSING_CUSTOMER`). Severity is `'invalid'` or `'warning'`. The `ISSUE_REGISTRY` dict in `schema.py` maps codes → `{severity, field, message}`.

---

## Key Invariants

1. **Business App never stores credentials** — no Apple passwords, OAuth tokens, CalDAV secrets. Only the encrypted integration token pointing to Relay.
2. **Relay resolves `companyId` from the integration token** — Business App must never send `companyId` in the body to Relay calendar or notification endpoints.
3. **Notifications use `type: 'platform'` for internal ERP events** — shift created/confirmed/cancelled go through platform credentials. Calendar sync notifications (`calendar_sync.*`) also use platform credentials.
4. **Event keys must exist in the catalog** — provisioning happens at startup (`provisionPlatformCatalog`) and at token-save time for business events.
5. **Tenant isolation enforced everywhere** — `businessId` from `AuthContext.companyId` in NestJS; `business_id` filter in every BI SQL query.
6. **Mapper/DTO layer is mandatory** — never return a raw Mongoose document from a controller (`toShiftResponse()`, `toContractResponse()`, etc.).
7. **BI is the only source of KPI calculations** — NestJS controllers and React components must never recalculate measures, rates, or support issues. Proxy the BI response directly.
8. **ETL money values use `Decimal`** — never `float` in Python or BI SQL aggregations (use `Numeric` type in SQLAlchemy).
9. **`alembic upgrade head` must run before BI service starts** — startup validation fails if migrations are missing; this is intentional.
10. **Calendar sync only processes `flow = 'shifts'` calendars** — holiday (`flow = 'holidays'`) and payment (`flow = 'payments'`) calendars must never generate Shift records.
