from typing import Optional
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

EXPECTED_SCHEMA = "public"


class Base(DeclarativeBase):
    pass


def _asyncpg_url(raw_url: str) -> tuple:
    """
    Convert a standard postgresql:// URL to asyncpg format.

    asyncpg does not accept sslmode / channel_binding as query params —
    SSL is passed via connect_args instead. This function strips those
    params from the URL and returns them as connect_args.

    Returns: (clean_url_with_asyncpg_prefix, connect_args_dict)
    """
    # Normalise prefix
    if raw_url.startswith("postgresql://"):
        url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        url = raw_url

    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)

    ssl_mode = params.pop("sslmode", [""])[0]
    params.pop("channel_binding", None)  # asyncpg handles channel binding internally

    # Rebuild URL without the stripped params
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    clean_url = urlunparse(parsed._replace(query=clean_query))

    connect_args: dict = {}
    if ssl_mode in ("require", "verify-ca", "verify-full"):
        connect_args["ssl"] = "require"

    return clean_url, connect_args


def _build_engine():
    raw_url = settings.bi_database_url
    if not raw_url:
        # Engine is None when URL is not configured (e.g. during unit tests).
        # The startup event in main.py raises an error if URL is missing in prod.
        return None

    async_url, connect_args = _asyncpg_url(raw_url)
    return create_async_engine(
        async_url,
        echo=False,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


engine = _build_engine()

AsyncSessionLocal = (
    async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    if engine
    else None
)


async def get_db():
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not configured — set BI_DATABASE_URL")
    async with AsyncSessionLocal() as session:
        yield session


class DbHealthResult:
    def __init__(
        self,
        connected: bool,
        server_version: Optional[str] = None,
        schema: Optional[str] = None,
        migration_version: Optional[str] = None,
        error: Optional[str] = None,
    ):
        self.connected = connected
        self.server_version = server_version
        self.schema = schema
        self.migration_version = migration_version
        self.error = error


async def check_db_health() -> DbHealthResult:
    """
    Live connectivity check against Neon PostgreSQL.
    Queries server version, current schema, and Alembic migration version.
    Never logs the connection URL.
    """
    if engine is None:
        return DbHealthResult(connected=False, error="BI_DATABASE_URL not configured")

    try:
        async with engine.connect() as conn:
            row = (await conn.execute(text("SELECT version()"))).fetchone()
            full_version: str = row[0] if row else "unknown"
            short_version = full_version.split(" on ")[0] if " on " in full_version else full_version

            schema_row = (await conn.execute(text("SELECT current_schema()"))).fetchone()
            schema = schema_row[0] if schema_row else "unknown"

            # Read Alembic version from alembic_version table if it exists
            migration_version: Optional[str] = None
            try:
                ver_row = (await conn.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                )).fetchone()
                migration_version = ver_row[0] if ver_row else "no migrations applied"
            except Exception:
                migration_version = "alembic_version table not found"

        return DbHealthResult(
            connected=True,
            server_version=short_version,
            schema=schema,
            migration_version=migration_version,
        )
    except Exception as exc:
        return DbHealthResult(connected=False, error=type(exc).__name__)


async def check_db_connection() -> bool:
    """Thin wrapper kept for backward compatibility."""
    result = await check_db_health()
    return result.connected
