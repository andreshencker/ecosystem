# Business Intelligence — Architecture

> Version: 2.0 — July 2026

---

## Purpose

The Business Intelligence service is a **reusable analytical data platform** that is
independent of the Business App.

It synchronises operational data from MongoDB into a PostgreSQL analytical warehouse,
maintains a semantic layer describing the analytical model, and exposes generic
query and contract endpoints consumed by the Business App backend.

The BI service never:
- executes business workflows
- changes operational data
- sends emails
- creates invoices
- makes decisions about business logic

---

## System Boundaries

```
Business App (NestJS)
  │
  │  x-internal-service-token
  │
  ▼
Business Intelligence (FastAPI)
  │
  ├── ETL ──── MongoDB (read-only)  ← operational source
  │
  └── Query ── PostgreSQL           ← analytical source of truth
```

The Business App is the only authorised caller.  The BI service is never
exposed directly to the internet or to frontend clients.

---

## Responsibility Matrix

| Concern | Owner |
|---|---|
| Business workflows | Business App |
| Tenant (businessId) isolation | Both — Business App from JWT; BI in every SQL query |
| Analytical data | BI |
| KPI formulas | BI (SemanticRegistry) |
| SQL aggregations | BI (AggregationEngine) |
| Domain relationships | BI (SemanticRegistry) |
| Contract request shape | Business App |
| Contract response shape | BI (must match Backend DTO exactly) |
| ETL scheduling | BI (SyncManager) |
| Financial precision (Decimal) | Both — PostgreSQL Numeric; Python Decimal; JSON strings |

---

## Folder Responsibilities

```
app/
├── core/           Config, security middleware (InternalAuthMiddleware)
├── database/       PostgreSQL engine, MongoDB motor client, repositories
│   ├── mongo.py    Read-only ETL source connection
│   ├── postgres.py Async SQLAlchemy engine (analytical warehouse)
│   └── repositories/  Typed read-only query interfaces per domain
├── models/         SQLAlchemy analytical models + semantic definitions
│   ├── companies/  DimBusiness + dimensions/measures/kpis
│   ├── users/      DimUser + dimensions/measures/kpis
│   ├── customers/  DimCustomer + dimensions/measures/kpis
│   ├── contracts/  ContractSnapshot (FactContract) + dimensions/measures/kpis
│   ├── shifts/     FactShift + dimensions/measures/kpis
│   ├── invoices/   FactInvoice + FactPayment + dimensions/measures/kpis
│   ├── shared/     DimTime (date dimension)
│   └── etl/        SyncStateRecord, EtlRunMetadata (ETL infrastructure tables)
├── etl/            Extract → Transform → Load pipeline implementation
│   ├── extractors/ MongoDB readers (one per model, paginated, cursor-aware)
│   ├── transformers/ Field mapping + type coercion (never float for money)
│   ├── loaders/    PostgreSQL upsert (event_id or source_id idempotency)
│   ├── pipelines/  Per-model orchestration + FullSyncPipeline
│   └── sync/       SyncManager (cursor, locking, state) + SyncRegistry
├── semantic/       Analytical metadata catalogue
│   ├── domains/    One module per domain owning its DomainDefinition
│   ├── registry/   SemanticRegistry (global aggregator, bootstrapped at startup)
│   ├── aggregation_engine.py  Builds SQLAlchemy SELECT from semantic requests
│   └── query_engine.py        Executes queries and serialises results
├── contracts/      Information contracts (analytical answers to business questions)
│   ├── invoices/   InvoiceSummaryResponse
│   ├── dashboard/  DashboardSummaryResponse
│   └── customers/  CustomerSummaryResponse
└── web/            FastAPI application layer
    ├── api/health.py
    ├── api/query.py          POST /internal/query (generic)
    ├── api/semantic.py       GET  /internal/semantic[/{domain}]
    ├── api/sync/sync_router.py  POST/GET /internal/sync/*
    ├── api/contracts/        /internal/{customers,dashboard,invoices}/summary
    └── api/admin.py          /internal/admin/seed-dim-time
```

---

## Analytical Model Classification

| Model | Table | Type | Notes |
|---|---|---|---|
| `DimTime` | `dim_time` | Date dimension | Seeded 2020–2030 |
| `DimBusiness` | `dim_business` | Entity dimension | UUID PK via uuid5(ObjectId) |
| `DimUser` | `dim_user` | Entity dimension | UUID PK via uuid5(ObjectId) |
| `DimCustomer` | `dim_customer` | Entity dimension | UUID PK via uuid5(ObjectId) |
| `ContractSnapshot` (aka `FactContract`) | `fact_contract` | **Entity snapshot** | Contracts are entities, not events. Named `fact_contract` for historical reasons. String source_id, no FK constraints. |
| `FactShift` | `fact_shift` | Event fact | String source_id, no FK constraints. Replaces old `FactWorkEvent` for ETL. |
| `FactInvoice` | `fact_invoice` | Event fact | UUID event_id. Currently sourced from invoiced shifts (no Invoice collection yet). |
| `FactPayment` | `fact_payment` | Event fact | UUID event_id. ETL not implemented (no Payment collection yet). |
| `FactWorkEvent` | `fact_work_event` | Legacy event fact | Left in place from initial schema; not populated by active ETL. |
| `FactCustomerActivity` | `fact_customer_activity` | Event fact | Legacy; not populated by active ETL. |
| `SyncStateRecord` | `etl_sync_state` | ETL infrastructure | Latest cursor per (company_id, model_name). |
| `EtlRunMetadata` | `etl_run_metadata` | ETL audit log | Append-only history of every pipeline run. |

---

## Domain Relationships

```
businesses
  ├── customers     (businesses.business_id → customers.business_id)
  ├── users         (businesses.business_id → users.business_id)
  └── contracts     (businesses.business_id → contracts.business_id)
       └── shifts   (contracts.source_id → shifts.contract_id)
            └── invoices  (shifts.source_id → invoices.invoice_id)
                 └── payments (invoices.invoice_id → payments.invoice_id)
```

Relationships are declared in each domain's `DomainDefinition` in
`app/semantic/domains/<domain>.py`. The `SemanticRegistry` aggregates them and
exposes them via `GET /internal/semantic/{domain}`.

The `QueryEngine` reads relationship metadata from the registry. No relationship
logic is hardcoded inside the engine.

---

## ETL Lifecycle

```
SyncManager.sync(company_id, model_name, full=False)
    │
    ├── Lock check (in-memory per company+model)
    ├── Read cursor from etl_sync_state
    ├── Mark status = "running"
    │
    ├── Pipeline.execute(company_id, since=cursor)
    │     ├── before_run()      [hook — default no-op]
    │     ├── run()             [required]
    │     │     ├── Extractor.extract(company_id, since)
    │     │     │     └── MongoDB.find(filter).sort(updatedAt).batch(200)
    │     │     ├── Transformer.transform(raw_doc)
    │     │     │     └── Field mapping, Decimal coercion, uuid5 conversion
    │     │     └── PostgresLoader.load_typed(records, idempotency_column)
    │     │           └── SELECT by idempotency_col → INSERT or UPDATE
    │     ├── validate()        [hook — default no-op]
    │     └── after_load()      [hook — default no-op]
    │
    ├── Write EtlRunMetadata row (append-only audit log)
    ├── Update etl_sync_state (cursor + status)
    └── Release lock
```

### Sync dependency order (FullSyncPipeline)

```
1. business   — DimBusiness (no dependencies)
2. user        — DimUser (depends on business_id existing in DimBusiness)
3. customer    — DimCustomer (depends on business_id)
4. contract    — ContractSnapshot (no FK constraints; can run in parallel)
5. shift       — FactShift (no FK constraints; can run in parallel)
6. invoice     — FactInvoice (no FK constraints; can run in parallel)
```

### Incremental sync

Each pipeline tracks the `updatedAt` field of the last processed document.
The cursor is persisted to `etl_sync_state.last_cursor` (ISO string).
On the next run, the extractor adds `{ updatedAt: { $gt: cursor } }` to the
MongoDB query.

Empty collections complete successfully with `extracted=0, inserted=0`.

---

## Semantic Layer

Each domain owns its definitions in `app/models/<domain>/`:

- `dimensions.py` — filterable / groupable column definitions
- `measures.py`   — aggregatable numeric field definitions
- `kpis.py`       — named business metrics (reference measures, no raw SQL)

And in `app/semantic/domains/<domain>.py`:
- `DomainDefinition` — bundles model_cls + dimensions + measures + KPIs + relationships

`SemanticRegistry.bootstrap()` is called at application startup. It imports
every domain module and calls `domain.register()`.

**Rule: every calculation is defined once.** No raw `func.sum()` or `func.count()`
calls inside contract services — those live exclusively in the repository layer,
which itself delegates column knowledge to the semantic definitions.

---

## Generic Query API

`POST /internal/query`

Allows the Business App to request analytical data without knowing SQL or
PostgreSQL schema details.

```json
{
  "businessId": "...",
  "domain": "shifts",
  "measures": ["shift_count", "duration_hours"],
  "kpis": ["total_hours_worked"],
  "filters": { "shift_status": "confirmed" },
  "groupBy": ["shift_date"],
  "limit": 100
}
```

The AggregationEngine resolves this to a SQLAlchemy `SELECT` statement using
dimension/measure metadata from the SemanticRegistry. The QueryEngine executes
it and serialises results (Decimal as string).

---

## Information Contracts vs Generic Query

The current architecture exposes both:

1. **Contract endpoints** (`/internal/customers/summary`, etc.) — shaped
   responses for specific business questions. These are the preferred interface
   for the Business App because they are typed and versioned.

2. **Generic query** (`POST /internal/query`) — flexible but untyped. Useful
   for ad-hoc exploration and future dashboard tooling.

**Next architectural evolution**: migrate all Business App consumers from
`POST /internal/query` to named contract endpoints (`/internal/contracts/*`).
Document as a future sprint; do not force the refactor prematurely.

---

## Security

- All `/internal/*` endpoints require `x-internal-service-token` header.
- The `InternalAuthMiddleware` validates the token before any route handler.
- `/health` is public (no token required).
- `businessId` always comes from the JWT in the Business App — never from
  the request body passed to BI.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BI_DATABASE_URL` | Yes | Neon PostgreSQL connection URL |
| `BI_INTERNAL_SERVICE_TOKEN` | Yes | Shared secret for internal API auth |
| `MONGO_URI` | ETL only | MongoDB connection for extraction |
| `MONGO_DATABASE` | No | MongoDB database name (default: `business_app_db`) |
| `PORT` | No | HTTP port (default: `8000`) |

---

## Migration Commands

```bash
# Check current state
alembic current
alembic heads

# Apply all pending migrations
alembic upgrade head

# Create a new migration (after adding/changing a model)
alembic revision --autogenerate -m "description"
```

---

## Testing Commands

```bash
cd business-intelligence
source .venv/bin/activate

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_etl_shift.py -v

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=term-missing
```

---

## Future Extension Strategy

To add a new analytical domain:

1. **Operational source** — identify the MongoDB collection and its fields.
2. **Analytical model** — create `app/models/<domain>/analytical_model.py`.
3. **Semantic definitions** — create `app/models/<domain>/dimensions.py`,
   `measures.py`, `kpis.py`.
4. **Semantic domain** — create `app/semantic/domains/<domain>.py` with a
   `DomainDefinition` instance including relationship metadata.
5. **Register** — add `domain.register()` call in `SemanticRegistry.bootstrap()`.
6. **ETL** — implement extractor, transformer, pipeline; register in `SyncRegistry`.
7. **Migration** — `alembic revision --autogenerate -m "add_<domain>"`.
8. **Repository** — create `app/database/repositories/<domain>_repository.py`.
9. **Tests** — add `tests/test_etl_<domain>.py` covering empty + full + incremental.
10. **Contract** (optional) — if the Business App needs a shaped response, create
    `app/contracts/<domain>/schema.py` and `service.py`.
