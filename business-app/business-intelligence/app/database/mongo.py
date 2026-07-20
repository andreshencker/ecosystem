"""Async MongoDB client for ETL reads from the Business App operational database.

Uses motor (async MongoDB driver). Reads only — the BI service never writes
to the operational database.
"""
import logging
from typing import Optional

import motor.motor_asyncio

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None


def get_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    """Return a module-level shared motor client. Created lazily."""
    global _client
    if _client is None:
        if not settings.mongo_uri:
            raise RuntimeError(
                "MONGO_URI not configured — required for ETL extraction."
            )
        _client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    return _client


def get_database(
    name: Optional[str] = None,
) -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """Return a Motor database handle."""
    db_name = name or settings.mongo_database
    return get_client()[db_name]


async def ping() -> bool:
    """Connectivity check — returns True if MongoDB is reachable."""
    try:
        await get_client().admin.command("ping")
        return True
    except Exception:
        return False


async def close() -> None:
    """Close the shared client (call on application shutdown)."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
