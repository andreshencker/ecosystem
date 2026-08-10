# Business Intelligence Service — Architecture

## Overview

The Business Intelligence (BI) service is an internal FastAPI application that acts as the analytics data warehouse for the Business App ERP. It ingests operational data from MongoDB via ETL pipelines, stores it in a Neon PostgreSQL data warehouse, and exposes typed analytical endpoints consumed exclusively by the Business App backend (never by the frontend directly).

---

## ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Business App (NestJS)                       │
│   analytics.controller.ts                                        │
│        └── BusinessIntelligenceService (HTTP client)            │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP  x-internal-service-token
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BI Service (FastAPI, port 8000)                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  web/                                                    │    │
│  │    middleware/internal_auth.py  (InternalAuthMiddleware) │    │
│  │    api/health.py                (/health)                │    │
│  │    api/contracts/customers.py   (/internal/customers/…)  │    │
│  │    api/contracts/dashboard.py   (/internal/dashboard/…)  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  contracts/                                              │    │
│  │    dashboard/   schema.py + service.py  (real impl)     │    │
│  │    customers/   schema.py + service.py  (real impl)     │    │
│  │    invoices/    schema.py + service.py  (stub)          │    │
│  │    profitability/ schema.py + service.py (stub)         │    │
│  │    shift_summary/ schema.py + service.py (stub)         │    │
│  │    estimated_earnings/ schema.py + service.py (stub)    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  database/                                               │    │
│  │    postgres.py     (AsyncSession, Base, health check)   │    │
│  │    mongo.py        (Motor client stub — ETL reads)      │    │
│  │    repositories/   (typed repo per entity domain)       │    │
│  └─────────────────────────────────────────────────────────┘    │
│           │ SQLAlchemy async                 │ Motor (stub)      │
│           ▼                                  ▼                   │
│  ┌─────────────────┐             ┌──────────────────────────┐   │
│  │ Neon PostgreSQL  │             │   MongoDB (business_app) │   │
│  │ (data warehouse) │             │   (operational source)   │   │
│  └─────────────────┘             └──────────────────────────┘   │
│           ▲                                  │                   │
│           │                                  │                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  etl/                                                    │    │
│  │    extractors/  → reads from MongoDB (stubs)            │    │
│  │    transformers/ → maps raw docs to SQLAlchemy models   │    │
│  │    loaders/     → upserts into PostgreSQL (stub)        │    │
│  │    pipelines/   → orchestrates E→T→L per domain (stub)  │    │
│  │    sync/        → SyncManager + SyncRegistry (stub)     │    │
│  │    state/       → SyncState + SyncHistory (stub)        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  semantic/                                               │    │
│  │    registry/  SemanticRegistry (stub)                   │    │
│  │    aggregation_engine.py  (stub)                        │    │
│  │    query_engine.py        (stub)                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  models/                                                 │    │
│  │    shared/      dim_time                                │    │
│  │    companies/   DimBusiness                             │    │
│  │    customers/   DimCustomer, FactCustomerActivity       │    │
│  │    users/       DimUser                                 │    │
│  │    shifts/      FactWorkEvent + dimensions/measures/kpi │    │
│  │    invoices/    FactInvoice, FactPayment                │    │
│  │    contracts/   FactContract (no migration yet)         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Folder Responsibility Table

| Folder | Responsibility |
|--------|---------------|
| `app/core/` | Application-wide settings (`config.py`) and internal auth middleware (`security.py`). `database.py` is kept as a shim for backward compatibility. |
| `app/database/` | All data access infrastructure: `postgres.py` (SQLAlchemy async engine, session factory, health check), `mongo.py` (Motor client stub for ETL), `repositories/` (typed read repositories per entity). |
| `app/models/` | SQLAlchemy table definitions organised by domain. `__init__.py` re-exports all migrated models for Alembic discovery. Semantic metadata (dimensions, measures, KPIs) live alongside the models. |
| `app/etl/` | Extract-Transform-Load pipelines. `extractors/` read from MongoDB, `transformers/` map to warehouse models, `loaders/` upsert to PostgreSQL. `pipelines/` orchestrate E→T→L. `sync/` manages scheduling and registration. `state/` tracks sync progress and history. |
| `app/semantic/` | Semantic layer: `registry/` holds all dimension/measure/KPI metadata; `aggregation_engine.py` generates SQL from semantic requests; `query_engine.py` executes them. |
| `app/contracts/` | Information contracts — one sub-package per analytical domain. Each has `schema.py` (Pydantic response models) and `service.py` (query logic). This is the seam between the web layer and the data warehouse. |
| `app/web/` | FastAPI HTTP layer: `api/` (routers), `middleware/` (auth re-export), `schemas/` (shared response types), `responses/` (error helpers). |
| `app/services/` | Application-level service facades. `etl_service.py` is the public API for triggering ETL runs without coupling callers to pipeline internals. |
| `alembic/` | Database schema migrations. `env.py` imports `Base` and all models from their new locations. |
| `tests/` | Integration tests using FastAPI's `TestClient`. Must not require a real database connection. |

---

## ETL Flow

```
MongoDB (business_app_db)
        │
        │  [AbstractExtractor.extract()]
        ▼
Raw MongoDB documents (dicts)
        │
        │  [AbstractTransformer.transform()]
        ▼
SQLAlchemy model instances
        │
        │  [AbstractLoader.load()]   — batch upsert, idempotent on event_id
        ▼
Neon PostgreSQL (data warehouse)
        │
  fact_work_event, fact_invoice, fact_payment,
  dim_customer, dim_user, dim_business, dim_time
```

Each domain has its own extractor, transformer, and pipeline:

| Domain | Extractor | Transformer | Target Table |
|--------|-----------|-------------|--------------|
| Business | `BusinessExtractor` | `BusinessTransformer` | `dim_business` |
| Customer | `CustomerExtractor` | `CustomerTransformer` | `dim_customer` |
| User | `UserExtractor` | `UserTransformer` | `dim_user` |
| Shift | `ShiftExtractor` | `ShiftTransformer` | `fact_work_event` |
| Invoice | `InvoiceExtractor` | `InvoiceTransformer` | `fact_invoice` |
| Contract | `ContractExtractor` | `ContractTransformer` | `fact_contract` (pending migration) |

`PostgresLoader` handles all target tables with idempotent `INSERT … ON CONFLICT DO UPDATE` upserts.

---

## Sync Flow

```
Trigger (cron / API call)
        │
        ▼
EtlService.run_full_sync(business_id)
        │
        ▼
SyncManager.sync_business(business_id, full=True)
        │
        ├── SyncRegistry.get("customers") → CustomerPipeline.run()
        ├── SyncRegistry.get("shifts")    → ShiftPipeline.run()
        ├── SyncRegistry.get("invoices")  → InvoicePipeline.run()
        └── ...
                │
                ▼
        SyncState persisted (last_synced_at, status)
        SyncHistoryEntry appended (start, finish, counts)
```

- **Full sync**: truncates and reloads all data for the business.
- **Incremental sync**: uses `SyncState.last_synced_at` as the MongoDB query lower bound.
- **Idempotency**: every load upserts on `event_id` — re-running never creates duplicates.

---

## Semantic Layer

The semantic layer decouples the "what to measure" (business KPI definitions) from the "how to query" (SQL generation). It has three components:

1. **SemanticRegistry**: Stores dimension, measure, and KPI definitions per domain (populated from `app/models/<domain>/dimensions.py`, `measures.py`, `kpis.py`).

2. **AggregationEngine**: Translates a semantic request `(domain, measures, filters, group_by, period)` into a SQLAlchemy `select()` statement by resolving column names, aggregation functions, and filter predicates from the registry.

3. **QueryEngine**: Executes the built query against the async PostgreSQL session and returns typed result dicts.

This allows future dashboards to request KPIs by name (`total_hours_worked`, `billable_hours`, `shift_count`) without writing SQL.

---

## Information Contracts

An **information contract** is the typed interface between the HTTP layer and the data warehouse for a specific analytical domain. Each contract owns:

- `schema.py` — Pydantic models defining the response shape (the contract).
- `service.py` — Query logic that fulfils the contract against the warehouse.

Implemented contracts (production-ready):
- `contracts/dashboard/` — `DashboardSummaryResponse` (customer counts)
- `contracts/customers/` — `CustomerSummaryResponse` (KPIs + recent list)

Stub contracts (architecture in place, not yet querying real data):
- `contracts/estimated_earnings/` — projected revenue from shifts and contracts
- `contracts/invoices/` — invoice volume and revenue aggregates
- `contracts/profitability/` — gross margin from revenue vs. shift costs
- `contracts/shift_summary/` — shift count, hours, and billable hours

---

## Communication with Business App

The Business App (NestJS, port 3004) communicates with the BI service over HTTP:

```
Business App (NestJS)
  analytics.controller.ts
      ↓
  BusinessIntelligenceService
      ↓ GET /internal/customers/summary?businessId=<id>
      ↓ x-internal-service-token: <shared secret>
  BI Service (FastAPI, port 8000)
      ↓
  InternalAuthMiddleware (validates token)
      ↓
  CustomerKpiService (queries dim_customer)
      ↓
  CustomerSummaryResponse (JSON)
```

Security rules:
- All `/internal/*` routes require `x-internal-service-token` header.
- `/health` is exempt (no token required).
- `businessId` is always resolved server-side from the Business App JWT — it is never accepted from the frontend.
- The BI service never exposes a public internet endpoint.

---

## Layer Responsibilities Summary

| Layer | Owner | Never does |
|-------|-------|------------|
| `web/` | HTTP routing, auth enforcement, request validation | Business logic, DB queries |
| `contracts/` | Pydantic schemas, analytical query logic | HTTP concerns, ETL |
| `database/` | Connection management, session lifecycle, repos | Business logic |
| `models/` | Table definitions, semantic metadata | Querying, transformation |
| `etl/` | Data ingestion from MongoDB to PostgreSQL | Serving API responses |
| `semantic/` | KPI resolution, SQL generation from metadata | Data storage, HTTP |
| `services/` | Facade API for ETL triggers | Direct DB access |
| `core/` | Config, auth middleware | Querying, transformation |
