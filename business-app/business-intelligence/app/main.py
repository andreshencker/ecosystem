import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

import app.etl  # noqa: F401 — registers pipelines via SyncRegistry on import
from app.core.config import settings

# pydantic-settings loads .env into model fields but does NOT populate os.environ.
# InternalAuthMiddleware reads os.environ directly (so test patches work), so we
# mirror the pydantic value into os.environ at startup if not already present.
if settings.bi_internal_service_token and "BI_INTERNAL_SERVICE_TOKEN" not in os.environ:
    os.environ["BI_INTERNAL_SERVICE_TOKEN"] = settings.bi_internal_service_token
from app.core.security import InternalAuthMiddleware
from app.database.postgres import check_db_health
from app.semantic.registry.semantic_registry import SemanticRegistry
from app.web.api.admin import router as admin_router
from app.web.api.contracts.contracts import router as contracts_admin_router
from app.web.api.contracts.customers import router as customers_router
from app.web.api.contracts.dashboard import router as dashboard_router
from app.web.api.contracts.invoices import router as invoices_router
from app.web.api.contracts.shifts import router as shift_assignment_router
from app.web.api.health import router as health_router
from app.web.api.query import router as query_router
from app.web.api.semantic import router as semantic_router
from app.web.api.sync.sync_router import router as sync_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    # ── Startup validation ─────────────────────────────────────────────────────
    if not settings.bi_database_url:
        raise RuntimeError(
            "BI_DATABASE_URL is required but not set. "
            "See .env.example for configuration."
        )

    logger.info("Business Intelligence starting — validating Neon PostgreSQL connection...")
    db = await check_db_health()

    if not db.connected:
        raise RuntimeError(
            f"Cannot connect to Neon PostgreSQL: {db.error}. "
            "Service startup aborted."
        )

    logger.info("Neon PostgreSQL connected. %s", db.server_version)
    logger.info("Schema: %s", db.schema)

    if db.migration_version in (None, "alembic_version table not found", "no migrations applied"):
        raise RuntimeError(
            "Alembic migrations have not been applied. "
            "Run: alembic upgrade head — then restart the service."
        )

    logger.info("Migration version: %s", db.migration_version)

    # Register all analytical domains in the semantic layer.
    SemanticRegistry.bootstrap()
    logger.info("SemanticRegistry domains: %s", SemanticRegistry.all_domains())

    logger.info("Business Intelligence service ready.")

    yield

    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("Business Intelligence shutting down.")


app = FastAPI(
    title="Business Intelligence",
    version="0.1.0",
    description=(
        "Internal analytics service for Business App. "
        "All /internal/* endpoints require x-internal-service-token header. "
        "Never expose this service directly to the internet."
    ),
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

# Token check runs before any route handler or Depends
app.add_middleware(InternalAuthMiddleware)

app.include_router(health_router)
app.include_router(contracts_admin_router)
app.include_router(customers_router)
app.include_router(dashboard_router)
app.include_router(invoices_router)
app.include_router(shift_assignment_router)
app.include_router(sync_router)
app.include_router(query_router)
app.include_router(semantic_router)
app.include_router(admin_router)

# Ensure SemanticRegistry is populated when running under TestClient (which
# does not always trigger the lifespan startup event).
SemanticRegistry.bootstrap()
