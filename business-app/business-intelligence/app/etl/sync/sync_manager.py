"""Sync manager — orchestrates ETL pipeline execution with state persistence.

The SyncManager is the main entry point for triggering ETL runs.
It reads the last cursor from etl_sync_state, invokes the pipeline,
and persists the outcome. Concurrent syncs for the same
(company_id, model_name) are rejected with RuntimeError.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from app.database.postgres import AsyncSessionLocal
from app.etl.results import LoadResult
from app.etl.sync.sync_registry import SyncRegistry
from app.models.etl.sync_state_model import SyncStateRecord

logger = logging.getLogger(__name__)

# In-memory lock: prevents two concurrent syncs for the same
# (company_id, model_name) tuple within the same process.
_locks: dict = {}


def _lock_key(company_id: str, model_name: str) -> str:
    return f"{company_id}:{model_name}"


class SyncManager:
    """Coordinates ETL execution with state persistence and concurrency control."""

    async def sync(
        self,
        company_id: str,
        model_name: str,
        full: bool = False,
    ) -> LoadResult:
        """
        Run a sync for a single company and model.

        If full=True: ignores the stored cursor and syncs all records.
        If full=False: reads the stored cursor for incremental sync.

        Raises:
            RuntimeError: if another sync is already running for this pair.
            ValueError:   if no pipeline is registered for model_name.
        """
        key = _lock_key(company_id, model_name)
        if key in _locks:
            raise RuntimeError(
                f"Sync already running for {company_id}/{model_name}. Try again later."
            )

        factory = SyncRegistry.get(model_name)
        if factory is None:
            raise ValueError(
                f"No pipeline registered for model '{model_name}'."
            )

        _locks[key] = True
        try:
            cursor = None if full else await self._get_cursor(company_id, model_name)
            await self._mark_running(company_id, model_name)

            pipeline = factory()
            result: LoadResult = await pipeline.run(
                company_id=company_id,
                since=cursor,
            )

            new_cursor = result.cursor
            if not new_cursor and result.finished_at:
                new_cursor = result.finished_at.isoformat()

            await self._mark_complete(company_id, model_name, result, new_cursor)
            return result

        except Exception as exc:
            logger.error(
                "[SyncManager] %s/%s failed: %s",
                company_id,
                model_name,
                exc,
            )
            await self._mark_failed(company_id, model_name, str(exc))
            raise
        finally:
            _locks.pop(key, None)

    async def sync_invoices(
        self,
        company_id: str,
        full: bool = False,
    ) -> LoadResult:
        return await self.sync(company_id, "invoice", full)

    # ── Status / history ───────────────────────────────────────────────────

    async def get_status(self, company_id: str) -> list:
        """Return the current sync state for every model of a company.

        Each entry is a plain dict with model_name, last_status, last_cursor,
        last_started_at, last_completed_at, last_error and records_processed.
        """
        if AsyncSessionLocal is None:
            return []
        async with AsyncSessionLocal() as session:
            stmt = select(SyncStateRecord).where(
                SyncStateRecord.company_id == company_id,
            )
            rows = (await session.execute(stmt)).scalars().all()
            return [self._row_to_dict(r) for r in rows]

    async def get_history(
        self,
        company_id: str,
        limit: int = 20,
    ) -> list:
        """Return sync history entries for a company, most recent first."""
        if AsyncSessionLocal is None:
            return []
        async with AsyncSessionLocal() as session:
            stmt = (
                select(SyncStateRecord)
                .where(SyncStateRecord.company_id == company_id)
                .order_by(SyncStateRecord.last_completed_at.desc().nullslast())
                .limit(limit)
            )
            rows = (await session.execute(stmt)).scalars().all()
            return [self._row_to_dict(r) for r in rows]

    @staticmethod
    def _row_to_dict(row: SyncStateRecord) -> dict:
        def _iso(v):
            return v.isoformat() if v is not None else None

        return {
            "model_name": row.model_name,
            "company_id": row.company_id,
            "last_status": row.last_status,
            "last_cursor": row.last_cursor,
            "last_started_at": _iso(row.last_started_at),
            "last_completed_at": _iso(row.last_completed_at),
            "last_error": row.last_error,
            "records_processed": row.records_processed,
        }

    # ── State helpers ──────────────────────────────────────────────────────

    async def _get_cursor(
        self,
        company_id: str,
        model_name: str,
    ) -> Optional[datetime]:
        if AsyncSessionLocal is None:
            return None
        async with AsyncSessionLocal() as session:
            stmt = select(SyncStateRecord).where(
                SyncStateRecord.company_id == company_id,
                SyncStateRecord.model_name == model_name,
            )
            row = (await session.execute(stmt)).scalar_one_or_none()
            if row and row.last_cursor:
                try:
                    return datetime.fromisoformat(row.last_cursor)
                except ValueError:
                    return None
        return None

    async def _mark_running(self, company_id: str, model_name: str) -> None:
        await self._upsert_state(
            company_id,
            model_name,
            {
                "last_status": "running",
                "last_started_at": datetime.now(timezone.utc),
                "last_error": None,
            },
        )

    async def _mark_complete(
        self,
        company_id: str,
        model_name: str,
        result: LoadResult,
        cursor: Optional[str],
    ) -> None:
        await self._upsert_state(
            company_id,
            model_name,
            {
                "last_status": "success",
                "last_completed_at": result.finished_at
                or datetime.now(timezone.utc),
                "last_cursor": cursor,
                "records_processed": result.inserted + result.updated,
                "last_error": None,
            },
        )

    async def _mark_failed(
        self,
        company_id: str,
        model_name: str,
        error: str,
    ) -> None:
        await self._upsert_state(
            company_id,
            model_name,
            {
                "last_status": "failed",
                "last_completed_at": datetime.now(timezone.utc),
                "last_error": error[:500],
            },
        )

    async def _upsert_state(
        self,
        company_id: str,
        model_name: str,
        values: dict,
    ) -> None:
        if AsyncSessionLocal is None:
            return
        async with AsyncSessionLocal() as session:
            stmt = select(SyncStateRecord).where(
                SyncStateRecord.company_id == company_id,
                SyncStateRecord.model_name == model_name,
            )
            row = (await session.execute(stmt)).scalar_one_or_none()
            if row is None:
                row = SyncStateRecord(
                    company_id=company_id, model_name=model_name
                )
                session.add(row)
            for k, v in values.items():
                setattr(row, k, v)
            await session.commit()
