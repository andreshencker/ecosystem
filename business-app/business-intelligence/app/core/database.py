# Shim — kept for backward compatibility with alembic/env.py and any legacy imports.
# All implementation has moved to app.database.postgres.
from app.database.postgres import *  # noqa: F401, F403
from app.database.postgres import (  # noqa: F401
    Base,
    _asyncpg_url,
    _build_engine,
    engine,
    AsyncSessionLocal,
    get_db,
    DbHealthResult,
    check_db_health,
    check_db_connection,
    EXPECTED_SCHEMA,
)
