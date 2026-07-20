"""
Alembic env.py — async edition (asyncpg, no psycopg2).

Uses SQLAlchemy's async engine so the only required driver is asyncpg.
Pattern: https://alembic.sqlalchemy.org/en/latest/cookbook.html
         #using-asyncio-with-alembic
"""
import asyncio
import os
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from alembic import context
from dotenv import load_dotenv

load_dotenv()

# Import all models so Alembic detects them via Base.metadata
from app.database.postgres import Base
from app.database.postgres import _asyncpg_url   # reuse URL converter from database.py
import app.models  # noqa: F401

alembic_config = context.config

if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

target_metadata = Base.metadata


def _get_async_url() -> tuple:
    """
    Returns (async_url, connect_args) ready for create_async_engine.
    Reads from BI_DATABASE_URL — never logs credentials.
    """
    raw = os.getenv("BI_DATABASE_URL", "")
    if not raw:
        raise RuntimeError(
            "BI_DATABASE_URL is not set. "
            "Set it before running Alembic: export BI_DATABASE_URL=postgresql://..."
        )
    return _asyncpg_url(raw)


def run_migrations_offline() -> None:
    """
    Offline mode: generate SQL without connecting.
    Uses the asyncpg dialect URL so DDL is PostgreSQL-compatible.
    """
    async_url, _ = _get_async_url()
    context.configure(
        url=async_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """
    Online mode: connect via asyncpg and run migrations.
    No psycopg2 required.
    """
    async_url, connect_args = _get_async_url()
    connectable = create_async_engine(
        async_url,
        poolclass=NullPool,
        connect_args=connect_args,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
