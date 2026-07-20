"""PostgreSQL upsert loader — writes transformed model instances.

Uses INSERT ... ON CONFLICT semantics via a lookup-then-update-or-insert
loop keyed by a per-model idempotency column (defaults to `event_id` for
backward compatibility; dimensions and new fact tables pass their own).
"""
import logging
from datetime import datetime, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.postgres import AsyncSessionLocal
from app.etl.loaders.base import AbstractLoader
from app.etl.results import LoadResult

logger = logging.getLogger(__name__)

BATCH_SIZE = 200

# Columns that must never be overwritten during an update (server-managed).
_IMMUTABLE_ON_UPDATE = {
    "id",
    "fact_id",
    "event_id",
    "ingested_at",
    "synced_at",
}


class PostgresLoader(AbstractLoader):
    """Loads transformed SQLAlchemy model instances into PostgreSQL.

    Uses "select by idempotency column then INSERT or UPDATE" for idempotent
    upserts. Rolls back the entire batch on failure.
    """

    def __init__(self, batch_size: int = BATCH_SIZE) -> None:
        self.batch_size = batch_size

    async def load(self, records: List[object]) -> int:
        """Simplified load — calls load_typed without result tracking."""
        result = await self.load_typed(
            records,
            model_name="unknown",
            company_id="unknown",
        )
        return result.inserted + result.updated

    async def load_typed(
        self,
        records: List[object],
        model_name: str,
        company_id: str,
        idempotency_column: str = "event_id",
    ) -> LoadResult:
        """Upsert a batch of SQLAlchemy model instances.

        Conflict resolution: match by the given idempotency_column. If a row
        with the same value already exists, overwrite all non-immutable
        columns. Otherwise insert a new row.

        Returns a LoadResult with inserted/updated/failed counts.
        """
        if AsyncSessionLocal is None:
            raise RuntimeError("PostgreSQL not configured — set BI_DATABASE_URL")

        result = LoadResult(
            model_name=model_name,
            company_id=company_id,
            extracted=len(records),
            started_at=datetime.now(timezone.utc),
        )

        if not records:
            result.finished_at = datetime.now(timezone.utc)
            result.duration_ms = 0
            return result

        async with AsyncSessionLocal() as session:
            try:
                inserted, updated = await self._upsert_batch(
                    session,
                    records,
                    idempotency_column=idempotency_column,
                )
                await session.commit()
                result.inserted = inserted
                result.updated = updated
                result.transformed = len(records)
            except Exception as exc:
                await session.rollback()
                logger.error("[PostgresLoader] batch failed: %s", exc)
                result.failed = len(records)
                result.errors.append(str(exc))
            finally:
                result.finished_at = datetime.now(timezone.utc)
                if result.started_at:
                    result.duration_ms = int(
                        (result.finished_at - result.started_at).total_seconds()
                        * 1000
                    )

        return result

    async def _upsert_batch(
        self,
        session: AsyncSession,
        records: List[object],
        idempotency_column: str = "event_id",
    ) -> tuple:
        """Insert or update records in the session.

        Returns (inserted_count, updated_count). Looks up existing rows by
        the model's idempotency column.
        """
        inserted = 0
        updated = 0

        for record in records:
            model_cls = type(record)
            col = getattr(model_cls, idempotency_column)
            key_value = getattr(record, idempotency_column)
            stmt = select(model_cls).where(col == key_value)
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if existing is None:
                session.add(record)
                inserted += 1
            else:
                for column in record.__table__.columns:  # type: ignore[attr-defined]
                    if column.name in _IMMUTABLE_ON_UPDATE:
                        continue
                    if column.name == idempotency_column:
                        continue
                    setattr(existing, column.name, getattr(record, column.name))
                updated += 1

        return inserted, updated
